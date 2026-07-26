import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .eq('rate_date', '2026-06-16')
    .eq('from_currency', 'USD')
    .eq('to_currency', 'INR');
    
  if (error) console.error("Error:", error);
  console.log("Rows in DB:", data);
}
check();
