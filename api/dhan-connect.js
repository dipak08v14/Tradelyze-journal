import { createClient } from '@supabase/supabase-js';
import { encrypt } from './_encryption.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = {};
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  } else if (req.body) {
    body = req.body;
  }

  const { access_token } = body;
  if (!access_token) {
    return res.status(400).json({ error: 'access_token is required' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
  const token = authHeader.replace('Bearer ', '');

  try {
    // 1. Call Dhan API to validate the token
    const dhanRes = await fetch('https://api.dhan.co/v2/userinfo', {
      method: 'GET',
      headers: {
        'access-token': access_token,
        'Content-Type': 'application/json'
      }
    });

    if (!dhanRes.ok) {
      return res.status(401).json({ error: 'Invalid Dhan access token. Please check and try again.' });
    }

    const dhanUser = await dhanRes.json();
    if (dhanUser.status !== 'success' || !dhanUser.data) {
      return res.status(401).json({ error: 'Invalid Dhan token response. Please check and try again.' });
    }

    // 2. Encrypt token
    const encryptedToken = encrypt(access_token);

    // 3. Create Supabase client authenticated as the user
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: User authentication failed' });
    }

    // 4. Upsert broker_connections
    const { error: upsertError } = await supabase
      .from('broker_connections')
      .upsert({
        user_id: user.id,
        broker_type: 'dhan',
        connection_type: 'dhan',
        broker_name: 'Dhan',
        access_token_encrypted: encryptedToken,
        account_login: dhanUser.data.dhanClientId,
        is_active: true,
        sync_status: 'connected',
        last_sync_at: null,
        total_synced: 0,
        trades_pending_review: 0
      }, {
        onConflict: 'user_id,broker_type'
      });

    if (upsertError) {
      console.error('broker_connections upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to save broker connection in database', detail: upsertError.message });
    }

    return res.status(200).json({
      success: true,
      account_name: dhanUser.data.name,
      account_id: dhanUser.data.dhanClientId
    });

  } catch (err) {
    console.error('Unexpected error in dhan-connect:', err);
    return res.status(500).json({ error: 'Unexpected server error: ' + err.message });
  }
}
