import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { applyTheme } from '../lib/theme';

export interface AuthState {
  user: User | null;
  userId: string | null;
  userData: any;
  trialExpired: boolean;
  daysRemaining: number;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const defaultState: AuthState = {
  user: null,
  userId: null,
  userData: null,
  trialExpired: false,
  daysRemaining: 14,
  loading: true,
  refreshUserData: async () => {},
};

const AuthContext = createContext<AuthState>(defaultState);

async function fetchUserData(currentUser: User) {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('subscription_plan, subscription_status, trial_started_at, theme_background, theme_accent, onboarding_completed, full_name, timezone, preferred_currency, is_deleted')
      .eq('id', currentUser.id)
      .single();

    if (error || !userData) {
      const fallbackObj = {
        subscription_plan: 'free',
        subscription_status: 'active',
        trial_started_at: currentUser.created_at || new Date().toISOString(),
        theme_background: 'charcoal',
        theme_accent: 'cyan',
        onboarding_completed: false,
        full_name: currentUser.user_metadata?.full_name || '',
        timezone: 'Asia/Kolkata',
        preferred_currency: 'INR'
      };
      await supabase.from('users').insert({
        id: currentUser.id,
        email: currentUser.email,
        full_name: fallbackObj.full_name,
        subscription_plan: 'free',
        subscription_status: 'active',
        trial_started_at: fallbackObj.trial_started_at,
        theme_background: 'charcoal',
        theme_accent: 'cyan',
        onboarding_completed: false,
        timezone: 'Asia/Kolkata',
        preferred_currency: 'INR'
      });
      applyTheme('charcoal', 'cyan');
      return { userData: fallbackObj, trialExpired: false, daysRemaining: 14 };
    }

    const daysSinceTrial = userData?.trial_started_at
      ? Math.floor((Date.now() - new Date(userData.trial_started_at).getTime()) / 86400000)
      : 0;
    const trialExpired = daysSinceTrial > 14 && userData?.subscription_plan === 'free';
    const daysRemaining = Math.max(0, 14 - daysSinceTrial);

    if (userData?.theme_background) {
      applyTheme(userData.theme_background, userData.theme_accent || 'cyan');
    } else {
      applyTheme('charcoal', 'cyan');
    }

    return { userData, trialExpired, daysRemaining };
  } catch (err) {
    console.error('Error fetching/syncing user sub stats:', err);
    return {
      userData: {
        subscription_plan: 'free',
        subscription_status: 'active',
        trial_started_at: new Date().toISOString(),
        onboarding_completed: true,
        full_name: currentUser.user_metadata?.full_name || '',
      },
      trialExpired: false,
      daysRemaining: 14,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(defaultState);

  const refreshUserData = async () => {
    if (state.user) {
      const extra = await fetchUserData(state.user);
      setState(prev => ({
        ...prev,
        userData: extra.userData,
        trialExpired: extra.trialExpired,
        daysRemaining: extra.daysRemaining,
      }));
    }
  };

  useEffect(() => {
    let mounted = true;

    const savedTheme = localStorage.getItem('tl-theme') || 'charcoal';
    const savedAccent = localStorage.getItem('tl-accent') || 'cyan';
    applyTheme(savedTheme, savedAccent);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session && session.user) {
          const user = session.user;
          fetchUserData(user).then((extra) => {
            if (mounted) {
              setState(prev => ({
                ...prev,
                user,
                userId: user.id,
                userData: extra.userData,
                trialExpired: extra.trialExpired,
                daysRemaining: extra.daysRemaining,
                loading: false,
              }));
            }
          });
        } else {
          setState(prev => ({ ...prev, user: null, userId: null, userData: null, trialExpired: false, daysRemaining: 14, loading: false }));
        }
      }
    }).catch((err) => {
      console.error('Error in getSession:', err);
      if (mounted) {
        setState(prev => ({ ...prev, user: null, userId: null, userData: null, trialExpired: false, daysRemaining: 14, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session && session.user) {
          const user = session.user;
          fetchUserData(user).then((extra) => {
            if (mounted) {
              setState(prev => ({ ...prev, user, userId: user.id, userData: extra.userData, trialExpired: extra.trialExpired, daysRemaining: extra.daysRemaining, loading: false }));
            }
          });
        } else {
          setState(prev => ({ ...prev, user: null, userId: null, userData: null, trialExpired: false, daysRemaining: 14, loading: false }));
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
