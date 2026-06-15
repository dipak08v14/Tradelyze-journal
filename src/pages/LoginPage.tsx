import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { showError, showSuccess } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated, redirect to /strategies
  useEffect(() => {
    if (!loading && user) {
      navigate('/strategies');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        showSuccess('Logged in successfully!');
        navigate('/strategies');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      const errMsg = err?.message || 'Access denied. Please check your credentials.';
      setFormError(errMsg);
      showError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      showError(err.message || 'Google authentication failed.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }}></div>
          <span style={{ color: 'var(--text-muted)' }} className="text-sm mt-4 font-medium font-mono uppercase tracking-wider">Validating secure session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans" style={{ backgroundColor: 'var(--bg)' }}>
      <div style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)' }} className="w-full max-w-md rounded-3xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* LOGO */}
        <div className="text-center mb-6 flex flex-col items-center">
          {/* TL Stylish Logo */}
          <div className="mb-3">
            <svg width="44" height="42" viewBox="0 0 108 102" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="signupLogoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c6ff" />
                  <stop offset="100%" stopColor="#0072ff" />
                </linearGradient>
              </defs>
              <path d="M16 21h45.5l-3.5 11.5H41v40H26.5v-40H16Z" fill="url(#signupLogoGrad)" />
              <path d="M65 21h14.5L67.8 61H96l-3.5 11.5H50Z" fill="var(--text)" />
            </svg>
          </div>
          <h1 style={{ color: 'var(--text)' }} className="text-2xl font-bold tracking-wider font-display">TRADELYZE</h1>
          <p style={{ color: 'var(--text-sub)' }} className="text-sm mt-1">Learns YOU. Not the market.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL */}
          <div>
            <label style={{ color: 'var(--text-sub)' }} className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-mono" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. trader@tradelyze.in"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
              className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-zinc-500 transition-all text-sm"
              required
              disabled={submitting}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label style={{ color: 'var(--text-sub)' }} className="block text-xs font-bold uppercase tracking-wider mb-1.5 font-mono" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
              className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-zinc-500 transition-all text-sm"
              required
              disabled={submitting}
            />
          </div>

          {/* ERRORS */}
          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-xs font-semibold leading-relaxed">
              {formError}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 rounded-xl px-4 py-2.5 font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-md"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <span className="font-display">Sign In</span>
            )}
          </button>
        </form>

        {/* GOOGLE CONTINUATION */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--border)]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span style={{ backgroundColor: 'var(--card)', color: 'var(--text-muted)' }} className="px-2 font-mono">OR CONTINUE WITH</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          type="button"
          style={{ border: '0.5px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--bg)' }}
          className="w-full hover:bg-[var(--bar)] rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2.5"
        >
          {/* Google Icon logo */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="mt-6 text-center text-xs" style={{ color: 'var(--text-sub)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="font-bold underline hover:text-[var(--accent)] transition-colors">
            Start free trial →
          </Link>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4 text-center">
          <p style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase font-mono tracking-widest font-bold">
            Sign in to your Tradelyze account.
          </p>
        </div>

      </div>
    </div>
  );
};
