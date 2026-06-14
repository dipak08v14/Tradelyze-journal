import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-extrabold text-2xl text-white font-display tracking-tight mb-4 shadow-lg shadow-indigo-600/20">
            T
          </div>
          <h1 style={{ color: 'var(--text)' }} className="text-2xl font-bold tracking-wider font-display">TRADELYZE</h1>
          <p className="text-xs text-zinc-500 mt-1.5 font-medium italic">Learns YOU. Not the market.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL */}
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. trader@tradelyze.in"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
              className="rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-450 transition-all duration-200 text-sm"
              required
              disabled={submitting}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label style={{ color: 'var(--text-muted)' }} className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
              className="rounded-xl px-4 py-3 w-full focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-zinc-450 transition-all duration-200 text-sm"
              required
              disabled={submitting}
            />
          </div>

          {/* ERRORS */}
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-xs leading-normal font-semibold">
              {formError}
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </>
            ) : (
              <span className="font-display">Sign In</span>
            )}
          </button>
        </form>

        {/* ADMIN DISCLAIMER */}
        <div style={{ borderColor: 'var(--border)' }} className="mt-8 border-t pt-5 text-center">
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            New accounts are created by admin. Contact support to get started.
          </p>
        </div>
      </div>
    </div>
  );
};
