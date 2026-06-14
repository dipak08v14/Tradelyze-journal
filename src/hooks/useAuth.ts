import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  userId: string | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    userId: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Fetch session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session) {
          setState({
            user: session.user,
            userId: session.user.id,
            loading: false,
          });
        } else {
          setState({
            user: null,
            userId: null,
            loading: false,
          });
        }
      }
    }).catch((err) => {
      console.error('Error in getSession:', err);
      if (mounted) {
        setState({
          user: null,
          userId: null,
          loading: false,
        });
      }
    });

    // Listen for auth state revisions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session) {
          setState({
            user: session.user,
            userId: session.user.id,
            loading: false,
          });
        } else {
          setState({
            user: null,
            userId: null,
            loading: false,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
