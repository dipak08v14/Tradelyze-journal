import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { PaymentButton } from '../components/PaymentButton';
import { THEMES, ACCENTS, applyTheme } from '../lib/theme';
import {
  User,
  Palette,
  CreditCard,
  Bell,
  Menu,
  ShieldCheck,
  AlertOctagon,
  Download,
  Trash2,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, userId, userData, daysRemaining, trialExpired, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'subscription' | 'notifications'>('account');

  // Core loading/submitting state
  const [saving, setSaving] = useState(false);

  // Tab 1: Account fields
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [preferredCurrency, setPreferredCurrency] = useState('INR');

  // Tab 1: Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tab 1: Deletion confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  // Tab 2: Appearance selections
  const [selectedTheme, setSelectedTheme] = useState('charcoal');
  const [selectedAccent, setSelectedAccent] = useState('cyan');

  // Tab 4: Notification fields
  const [alertThreshold, setAlertThreshold] = useState<number>(65);

  // Broker Connections states
  const [connections, setConnections] = useState<any[]>([]);
  const [fetchingConnections, setFetchingConnections] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<1 | 2>(1);
  const [newBrokerName, setNewBrokerName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [newConnectionId, setNewConnectionId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  // Fetch connections function
  const fetchConnections = async () => {
    if (!userId) return;
    try {
      setFetchingConnections(true);
      const { data, error } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', userId)
        .order('broker_name', { ascending: true });
      if (error) throw error;
      setConnections(data || []);
    } catch (err: any) {
      console.error('Error fetching broker connections:', err);
    } finally {
      setFetchingConnections(false);
    }
  };

  // Trigger connections fetch
  useEffect(() => {
    if (userId && activeTab === 'account') {
      fetchConnections();
    }
  }, [userId, activeTab]);

  const handleToggleActive = async (connectionId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('broker_connections')
        .update({ is_active: !currentVal })
        .eq('id', connectionId)
        .eq('user_id', userId);
      if (error) throw error;
      showSuccess(`Connection ${!currentVal ? 'activated' : 'deactivated'} successfully!`);
      await fetchConnections();
    } catch (err: any) {
      console.error('Error toggling active status:', err);
      showError(err.message || 'Failed to update active status.');
    }
  };

  const handleGenerateKey = async () => {
    if (!newBrokerName.trim()) {
      showError('Please enter a Broker Name first.');
      return;
    }
    try {
      setGeneratingKey(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Authentication session token is missing. Please re-login.');
      }

      const res = await fetch('/api/generate-sync-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          broker_name: newBrokerName.trim(),
          connection_type: 'MT5'
        })
      });

      if (!res.ok) {
        const errRes = await res.json().catch(() => ({}));
        throw new Error(errRes.error || `Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.api_key || !data.connection_id) {
        throw new Error('Invalid response structure from API server.');
      }

      setGeneratedKey(data.api_key);
      setNewConnectionId(data.connection_id);
      setConnectStep(2);
      showSuccess('API key generated successfully!');
    } catch (err: any) {
      console.error('Error generating sync key:', err);
      showError(err.message || 'Failed to generate sync key.');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleVerifyConnection = async () => {
    if (!newConnectionId) return;
    try {
      setVerifying(true);
      const { data, error } = await supabase
        .from('broker_connections')
        .select('last_sync_at')
        .eq('id', newConnectionId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (data && data.last_sync_at) {
        showSuccess('Your MetaTrader 5 service connected successfully! First trade sync complete.');
        await fetchConnections();
        setIsConnectModalOpen(false);
        setNewBrokerName('');
        setGeneratedKey('');
        setNewConnectionId('');
        setConnectStep(1);
      } else {
        showError('No sync signal received yet. Ensure your MT5 service is running and starting up correctly.');
      }
    } catch (err: any) {
      console.error('Error verifying broker connection:', err);
      showError(err.message || 'Failed to verify connection.');
    } finally {
      setVerifying(false);
    }
  };

  const formatLastSynced = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return 'Never synced';
    try {
      const diffMs = Date.now() - new Date(lastSyncAt).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Synced just now';
      if (diffMins < 60) return `Last synced: ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Last synced: ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `Last synced: ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } catch (err) {
      return 'Never synced';
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    showSuccess('API sync key copied to clipboard! ✓');
  };

  // Sync state with userData when loaded
  useEffect(() => {
    if (userData) {
      setFullName(userData.full_name || '');
      setTimezone(userData.timezone || 'Asia/Kolkata');
      setPreferredCurrency(userData.preferred_currency || 'INR');
      setSelectedTheme(userData.theme_background || 'charcoal');
      setSelectedAccent(userData.theme_accent || 'cyan');

      // Read extension threshold from localStorage if saved
      const savedThreshold = localStorage.getItem('tl-alert-threshold');
      if (savedThreshold) {
        setAlertThreshold(parseInt(savedThreshold, 10));
      }
    }
  }, [userData]);

  // Read initial tab parameter from URL query parameter e.g. ?tab=subscription
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'account' || tabParam === 'appearance' || tabParam === 'subscription' || tabParam === 'notifications') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Handle tab change and update search parameters
  const handleTabChange = (tab: 'account' | 'appearance' | 'subscription' | 'notifications') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Skip if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  if (!user) {
    return null;
  }

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showError('Full Name is required.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          timezone,
          preferred_currency: preferredCurrency,
        })
        .eq('id', userId);

      if (error) throw error;
      showSuccess('Profile updated successfully! ✓');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showError('Please fill out both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      showSuccess('Password updated successfully! ✓');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  // Save theme selection
  const handleSaveAppearance = async () => {
    try {
      setSaving(true);
      
      // Update database profile
      const { error } = await supabase
        .from('users')
        .update({
          theme_background: selectedTheme,
          theme_accent: selectedAccent,
        })
        .eq('id', userId);

      if (error) throw error;

      // Apply theme locally instantly
      applyTheme(selectedTheme, selectedAccent);
      showSuccess('Theme saved to account! ✓');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Failed to save appearance.');
    } finally {
      setSaving(false);
    }
  };

  // Preview theme instantly as user clicks swatches
  const handlePreviewTheme = (themeId: string, accentId: string) => {
    setSelectedTheme(themeId);
    setSelectedAccent(accentId);
    applyTheme(themeId, accentId);
  };

  // Delete account operation
  const handleDeleteAccount = async () => {
    if (deleteEmailConfirm.trim() !== user?.email) {
      showError('Confirm email does not match.');
      return;
    }

    try {
      setSaving(true);
      // Clean up Supabase records first with cascading or direct
      const { error: deleteProfileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteProfileError) throw deleteProfileError;

      // Sign out
      await supabase.auth.signOut();
      
      showSuccess('Account deletion requested successfully.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Could not process account deletion.');
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  // Save notifications alert threshold
  const handleSaveNotifications = () => {
    localStorage.setItem('tl-alert-threshold', alertThreshold.toString());
    showSuccess('Alert threshold settings saved! ✓');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)]" />
      </div>
    );
  }

  const formatTrialDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR CONTAINER */}
      <Sidebar userEmail={user?.email || ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* MAIN SCREEN AREA */}
      <main className="flex-1 overflow-y-auto w-full md:pl-[220px]">
        {/* TOP COMPONENT */}
        <div 
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 md:px-8 border-b border-[var(--border)]"
          style={{ backgroundColor: 'var(--card)', backdropFilter: 'blur(10px)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg"
              style={{ color: 'var(--text-sub)' }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Settings</h1>
              <p className="text-xs text-[var(--text-sub)]">Manage your personal profile, workspace theme, and plan.</p>
            </div>
          </div>
        </div>

        {/* CONTAINER WITH SPACING */}
        <div className="max-w-5xl mx-auto p-6 md:p-8">
          
          {/* SECURE BLOCK FOR EXPIRED SUBSCRIPTION */}
          {trialExpired && (
            <div className="bg-red-950/40 border-2 border-red-800 text-red-200 p-4 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-bold flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-red-400" />
                  Your free trial has expired!
                </h4>
                <p className="text-xs text-red-300">
                  Please subscribe to Pro to resume complete dashboard calculations, AI Coaching, and live browser scans.
                </p>
              </div>
              <PaymentButton 
                userId={userId || ''} 
                userEmail={user?.email || ''} 
                userName={userData?.full_name || ''} 
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-5 py-2.5 rounded-xl cursor-pointer shadow-md shadow-red-950/20"
              />
            </div>
          )}

          {/* TWO COLUMN TABULAR LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* TABS SIDEBAR */}
            <div className="col-span-1 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-2 border-b md:border-b-0 md:border-r border-[var(--border)] pb-4 md:pb-0 md:pr-4">
              <button
                onClick={() => handleTabChange('account')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium w-full whitespace-nowrap md:whitespace-normal cursor-pointer transition-all ${
                  activeTab === 'account' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-sub)] hover:bg-[var(--bar)] hover:text-[var(--text)]'
                }`}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Account Profile</span>
              </button>
              <button
                onClick={() => handleTabChange('appearance')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium w-full whitespace-nowrap md:whitespace-normal cursor-pointer transition-all ${
                  activeTab === 'appearance' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-sub)] hover:bg-[var(--bar)] hover:text-[var(--text)]'
                }`}
              >
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span>Appearance</span>
              </button>
              <button
                onClick={() => handleTabChange('subscription')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium w-full whitespace-nowrap md:whitespace-normal cursor-pointer transition-all ${
                  activeTab === 'subscription' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-sub)] hover:bg-[var(--bar)] hover:text-[var(--text)]'
                }`}
              >
                <CreditCard className="w-4 h-4 flex-shrink-0" />
                <span>Subscription</span>
              </button>
              <button
                onClick={() => handleTabChange('notifications')}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-sm font-medium w-full whitespace-nowrap md:whitespace-normal cursor-pointer transition-all ${
                  activeTab === 'notifications' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-sub)] hover:bg-[var(--bar)] hover:text-[var(--text)]'
                }`}
              >
                <Bell className="w-4 h-4 flex-shrink-0" />
                <span>Notifications</span>
              </button>
            </div>

            {/* CONTENT MODULES */}
            <div className="col-span-1 md:col-span-3 space-y-8">
              
              {/* TAB 1: ACCOUNT PROFILE */}
              {activeTab === 'account' && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* PROFILE CARD */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--accent)]" /> Profile Details
                    </h3>
                    
                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                            className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            Email address
                          </label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-muted)' }}
                            className="rounded-xl px-4 py-2.5 w-full text-sm cursor-not-allowed"
                          />
                          <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">Email edits require support connection.</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            Timezone
                          </label>
                          <select
                            value={timezone}
                            onChange={(e) => setTimezone(e.target.value)}
                            style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                            className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                            <option value="UTC">UTC (GMT)</option>
                            <option value="America/New_York">America/New_York (EST/EDT)</option>
                            <option value="Europe/London">Europe/London (BST/GMT)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            Preferred Currency
                          </label>
                          <select
                            value={preferredCurrency}
                            onChange={(e) => setPreferredCurrency(e.target.value)}
                            style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                            className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                          >
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 font-bold px-5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-sm flex items-center gap-1.5"
                        >
                          {saving ? 'Saving...' : 'Save Profile'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* SECURITY CARD */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--accent)]" /> Security / Change Password
                    </h3>
                    
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                            className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm animate-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 font-mono text-[var(--text-muted)]">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                            className="rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-[var(--accent)] text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="border border-[var(--border)] hover:bg-[var(--bar)] text-[var(--text)] font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 text-sm"
                        >
                          Update Password
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* ACCOUNT EXPORT / DESTRUCTION */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                    <h3 className="text-lg font-bold mb-1.5 flex items-center gap-2">
                       Account Management
                    </h3>
                    <p className="text-xs text-[var(--text-sub)] mb-6">Backup raw structured database configurations, or permanently destroy telemetry sessions.</p>

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bar)]">
                        <div>
                          <h4 className="font-semibold text-sm">Export Structured Trading Data</h4>
                          <p className="text-[11px] text-[var(--text-muted)]">Download an aggregated JSON data log containing all strategies, visual assets, and metrics.</p>
                        </div>
                        <button
                          onClick={() => alert('Structured JSON export feature is coming soon!')}
                          className="border border-[var(--border)] hover:bg-[var(--row)] text-[var(--text)] py-2 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Export Data
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-red-950/20 bg-red-950/5 text-red-200">
                        <div>
                          <h4 className="font-semibold text-sm text-red-400">Permanently Delete Account</h4>
                          <p className="text-[11px] text-red-500/80">Completely, irreversibly purge your email, custom models, visual logs, and subscriptions forever.</p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="bg-red-950 hover:bg-[#b91c1c] text-red-200 hover:text-white border border-red-700/30 py-2 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Purge Account
                        </button>
                     </div>
                  </div>
               </div>

                  {/* BROKER CONNECTIONS SECTION */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                    <h3 className="text-lg font-bold mb-1 flex items-center gap-2 uppercase tracking-wide font-display">
                       Broker Connections
                    </h3>
                    <p className="text-xs text-[var(--text-sub)] mb-6">
                      Sync MetaTrader 5 background service to keep your trade journal updated automatically.
                    </p>

                    {fetchingConnections ? (
                      <div className="flex justify-center items-center py-6">
                        <div className="animate-spin w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                      </div>
                    ) : connections.length === 0 ? (
                      <div className="border border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--bar)] mb-6">
                        <p className="text-sm font-semibold text-[var(--text)] mb-1">No broker accounts connected</p>
                        <p className="text-xs text-[var(--text-sub)]">Connect Metatrader 5 to sync automatic live trade logs</p>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        {connections.map((conn) => {
                          return (
                            <div 
                              key={conn.id} 
                              className="border border-[var(--border)] rounded-xl p-4 bg-[var(--bar)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-sm text-[var(--text)]">{conn.broker_name || 'Generic Broker'}</h4>
                                  <span className="bg-cyan-500/12 text-cyan-400 border border-cyan-800 text-[10px] font-extrabold uppercase rounded px-1.5 py-0.5">
                                    {conn.connection_type || 'MT5'}
                                  </span>
                                  {conn.is_active ? (
                                    <span style={{ color: '#22c55e' }} className="flex items-center gap-1 text-[10px] font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block font-sans animate-pulse"></span>
                                      ACTIVE
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)' }} className="flex items-center gap-1 text-[10px] font-bold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-650 inline-block font-sans"></span>
                                      PAUSED
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-sub)]">
                                  <span>Account: <span className="font-mono font-bold text-[var(--text)]">{conn.account_login || '—'}</span></span>
                                  <span className="text-[var(--text-muted)]">•</span>
                                  <span>Synced Trades: <span className="font-mono font-bold text-[var(--text)]">{conn.total_synced ?? 0}</span></span>
                                  <span className="text-[var(--text-muted)]">•</span>
                                  <span className="font-medium text-amber-500">{formatLastSynced(conn.last_sync_at)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-muted)]">Live Sync</span>
                                  <button
                                    onClick={() => handleToggleActive(conn.id, conn.is_active)}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                                      conn.is_active ? 'bg-[#22c55e]' : 'bg-zinc-700'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        conn.is_active ? 'translate-x-5.5' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex">
                      <button
                        onClick={() => setIsConnectModalOpen(true)}
                        style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                        className="hover:opacity-90 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs"
                      >
                        + Connect MT5 Broker
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fade-in bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[var(--accent)]" /> Visual Themes Customization
                  </h3>
                  <p className="text-xs text-[var(--text-sub)] mb-6">Select a visual theme palette and accent setup. Edits apply instantly on screen.</p>

                  {/* BACKGROUND THEME PICKER */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Choose Your Background Theme</h4>
                    <div className="flex flex-row" style={{ gap: '8px' }}>
                      {['warm', 'cloud', 'slate', 'charcoal', 'navy', 'midnight'].map((themeKey) => {
                        const th = THEMES[themeKey as keyof typeof THEMES];
                        const isActive = selectedTheme === themeKey;
                        return (
                          <div
                            key={themeKey}
                            id={`theme-swatch-${themeKey}`}
                            onClick={() => handlePreviewTheme(themeKey, selectedAccent)}
                            style={{
                              width: '60px',
                              height: '42px',
                              borderRadius: '8px',
                              border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden',
                            }}
                            title={themeKey}
                          >
                            <div style={{ backgroundColor: th.bg, flex: 1 }} />
                            <div style={{ backgroundColor: th.card, flex: 1 }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACCENT SELECTION */}
                  <div className="pt-4 border-t border-[var(--border)]">
                    <h4 className="text-sm font-semibold mb-1">Accent Highlights Color</h4>
                    <div className="flex flex-row" style={{ gap: '8px', marginTop: '16px' }}>
                      {['cyan', 'indigo', 'blue', 'emerald', 'gold', 'rose', 'coral'].map((accentKey) => {
                        const acc = ACCENTS[accentKey as keyof typeof ACCENTS];
                        const isActive = selectedAccent === accentKey;
                        return (
                          <div
                            key={accentKey}
                            id={`accent-dot-${accentKey}`}
                            onClick={() => handlePreviewTheme(selectedTheme, accentKey)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: acc.color,
                              cursor: 'pointer',
                              border: isActive ? '3px solid #ffffff' : '3px solid transparent',
                              boxShadow: isActive ? `0 0 0 3px ${acc.color}` : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* SAVE */}
                  <div className="pt-6 border-t border-[var(--border)] flex justify-between items-center bg-[var(--row)] -mx-6 -mb-6 p-6 rounded-b-2xl">
                    <span className="text-[11px] text-[var(--text-muted)] italic">Changes apply and synchronize instantly. Saved permanently on record.</span>
                    <button
                      onClick={handleSaveAppearance}
                      disabled={saving}
                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                      className="hover:opacity-95 px-5 py-2.5 rounded-xl font-bold cursor-pointer text-sm shadow transition-all"
                    >
                      {saving ? 'Saving...' : 'Save Theme'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SUBSCRIPTION */}
              {activeTab === 'subscription' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md space-y-6 animate-fade-in animate-none">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[var(--accent)]" /> Plan Workspace Billing
                  </h3>
                  <p className="text-xs text-[var(--text-sub)]">Validate limits, trial duration, billing invoices, and payment integration cycles.</p>

                  {/* FREE PLAN */}
                  {userData?.subscription_plan === 'free' && (
                    <div className="border border-amber-800 bg-amber-950/20 p-6 rounded-2xl space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-amber-600 text-slate-950 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full">
                            Free Trial Active
                          </span>
                          <h4 className="text-xl font-bold mt-2">14-Day Free Evaluation</h4>
                          <p className="text-xs text-amber-200/80 mt-1">
                            Your trial started on {formatTrialDate(userData.trial_started_at)}.
                          </p>
                        </div>
                        <span className="text-3xl font-mono font-black text-amber-200">{daysRemaining} days left</span>
                      </div>

                      {/* Progress consumption */}
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-amber-400 mb-1">
                          <span>TRIAL USAGE LIMIT</span>
                          <span>{Math.round(((14 - daysRemaining) / 14) * 100)}% Consumed</span>
                        </div>
                        <div className="w-full h-2 bg-amber-950/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 transition-all rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, ((14 - daysRemaining) / 14) * 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-amber-800/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <p className="text-xs text-amber-200/75 max-w-sm">
                          Unlock unlimited logs, coaching patterns, advanced multi-timeframe annual report metrics instantly.
                        </p>
                        <PaymentButton
                          userId={userId || ''}
                          userEmail={user?.email || ''}
                          userName={userData?.full_name || ''}
                          className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold px-6 py-3 rounded-xl cursor-pointer text-sm shadow-md transition-all whitespace-nowrap"
                        />
                      </div>
                    </div>
                  )}

                  {/* PRO PLAN */}
                  {userData?.subscription_plan === 'pro' && (
                    <div className="border border-emerald-800 bg-emerald-950/20 p-6 rounded-2xl space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-emerald-600 text-slate-900 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full font-sans">
                            Pro Active
                          </span>
                          <h4 className="text-xl font-bold mt-2">Tradelyze Professional Member</h4>
                          <p className="text-xs text-emerald-200/80 mt-1">
                            Unlimited data synchronization with live TradingView extension enabled.
                          </p>
                        </div>
                        <span className="text-xl font-bold text-emerald-400">₹1,999 / mo</span>
                      </div>

                      <div className="text-xs text-emerald-200/80 p-3 bg-emerald-950/40 rounded-xl space-y-1.5 border border-emerald-800/20 font-mono">
                        <div>• STATUS: Active</div>
                        <div>• BILLING ENGINE: Razorpay Payments</div>
                        <div>• CUSTOMER TOKEN: {userData?.razorpay_customer_id || 'Pending reference...'}</div>
                      </div>

                      <div className="pt-4 border-t border-emerald-800/30 flex justify-between items-center">
                        <span className="text-xs text-emerald-300/80">Next invoice will generate on standard monthly cycles.</span>
                        <button
                          onClick={() => alert('To modify or cancel your active subscription plan, please send an query email to our customer care team at billing@tradelyze.app')}
                          className="text-xs font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                        >
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SECURE FAQ LISTING */}
                  <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-sub)] space-y-2 leading-relaxed font-sans">
                    <p className="font-bold text-[var(--text)]">Secure payment details:</p>
                    <p>• Payments are managed directly via Razorpay checkout, encrypted and safe.</p>
                    <p>• Cancellations are processed immediately. No structural lock-ins apply.</p>
                  </div>
                </div>
              )}

              {/* TAB 4: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md space-y-6 animate-fade-in animate-none">
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[var(--accent)]" /> Extension Signals Threshold
                  </h3>
                  <p className="text-xs text-[var(--text-sub)]">Manage alerts, push notifications, and live chart scanning triggers.</p>

                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-xs md:text-sm font-semibold">Alert me when setup confidence exceeds:</label>
                        <span className="text-lg font-mono font-extrabold text-[var(--accent)]">{alertThreshold}%</span>
                      </div>
                      
                      <input
                        type="range"
                        min="50"
                        max="90"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(parseInt(e.target.value, 10))}
                        className="w-full h-1.5 bg-[var(--bar)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)] focus:outline-none"
                      />
                      
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono mt-2">
                        <span>50% (Noise/More Alerts)</span>
                        <span>70% (Default)</span>
                        <span>90% (Strict High Confidence Only)</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bar)] text-xs text-[var(--text-sub)] leading-normal space-y-2">
                      <p className="font-semibold text-[var(--text)]">How this works:</p>
                      <p>The "Tradelyze Live" Chrome Extension tracks active candlestick structural patterns on your active TradingView chart. If a local setup matches a logged trade's visual properties above this threshold rating, we generate an auditive click and custom warning overlay alert.</p>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] flex justify-end">
                      <button
                        onClick={handleSaveNotifications}
                        className="bg-[var(--accent)] hover:bg-[var(--accent-light)] text-slate-950 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-sm shadow transition-all duration-200"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
          
        </div>
      </main>

      {/* ACCOUNT PURGE DESTROY MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-red-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <h4 className="text-lg font-extrabold text-red-500 flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 flex-shrink-0" /> Irreversible Account Purgation
            </h4>
            <p className="text-xs text-[var(--text-sub)] leading-relaxed">
              This action is permanently, irreversibly destructive. It will destroy all custom strategies, entries, rules, and billing details linked to your account.
            </p>

            <div className="text-xs text-red-400 font-medium p-3 bg-red-950/10 border border-red-900/20 rounded-xl font-mono">
              To proceed, please type your email to confirm deletion: <strong className="select-all block text-white mt-1">{user?.email}</strong>
            </div>

            <input
              type="text"
              value={deleteEmailConfirm}
              onChange={(e) => setDeleteEmailConfirm(e.target.value)}
              placeholder="Type your email address"
              style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
              className="rounded-xl px-4 py-2.5 w-full text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
            />

            <div className="flex gap-3 pt-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteEmailConfirm('');
                }}
                className="border border-[var(--border)] hover:bg-[var(--bar)] text-[var(--text-sub)] hover:text-[var(--text)] text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer"
              >
                Nevermind, Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={saving || deleteEmailConfirm.trim() !== user?.email}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Purging...' : 'Delete Account Forever'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT MT5 BROKER SETUP MODAL */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative animate-fade-in">
            {/* Modal close */}
            <button
              onClick={() => {
                setIsConnectModalOpen(false);
                setConnectStep(1);
                setNewBrokerName('');
                setGeneratedKey('');
                setNewConnectionId('');
              }}
              className="absolute top-4 right-4 text-[var(--text-sub)] hover:text-[var(--text)] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {connectStep === 1 ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-[var(--text)]">Connect MetaTrader 5 Broker</h4>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Connect your MT5 account to enable seamless automatic synchronization of your trades.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-muted)]">
                    Broker Name (e.g. IC Markets, FTMO, Pepperstone)
                  </label>
                  <input
                    type="text"
                    value={newBrokerName}
                    onChange={(e) => setNewBrokerName(e.target.value)}
                    placeholder="Enter broker name"
                    style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                    className="rounded-xl px-4 py-2.5 w-full text-sm focus:ring-1 focus:ring-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGenerateKey}
                    disabled={generatingKey || !newBrokerName.trim()}
                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                    className="hover:opacity-95 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-xs disabled:opacity-50 transition-all flex items-center gap-1"
                  >
                    {generatingKey ? 'Generating Key...' : 'Generate API Key & View Instructions'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-[#22c55e] flex items-center gap-1.5 font-display">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-pulse"></span>
                    Broker Sync Key Generated!
                  </h4>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Copy the security key and follow instructions to activate auto-sync in MT5.
                  </p>
                </div>

                {/* API KEY FIELD */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider font-mono text-[var(--text-muted)]">
                    Your Broker Sync Key (Keep Secret)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey}
                      style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text)' }}
                      className="rounded-xl px-4 py-2.5 w-full text-xs font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyKey}
                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                      className="hover:opacity-95 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* INSTRUCTIONS */}
                <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }} className="rounded-xl p-4 text-xs text-[var(--text-sub)] space-y-3 leading-relaxed">
                  <h5 className="font-bold text-[var(--text)] font-mono uppercase tracking-widest text-[10px]">MT5 Setup Guide</h5>
                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold text-[var(--text)]">1. Allow WebRequest</p>
                      <p>Open MT5, go to <span className="font-semibold">Tools &rarr; Options &rarr; Expert Advisors</span>. Check the box <span className="font-semibold font-sans">"Allow WebRequest for listed URL"</span> and add: <span className="font-mono text-[var(--accent)]">https://tradelyze.app</span></p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text)]">2. Prepare Service</p>
                      <p>Download the <span className="font-semibold text-[var(--accent)] text-xs">TradelyzeSync.mq5</span> service file. Paste it into MetaTrader's <span className="font-mono bg-[var(--bar)] px-1 rounded">MQL5/Services</span> directory, open in MetaEditor, and click <span className="font-semibold">Compile</span>.</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--text)]">3. Set Security Key</p>
                      <p>In your MT5 Navigator bar on the left, expand <span className="font-semibold">Services</span>, right-click <span className="font-semibold">TradelyzeSync</span>, and select <span className="font-semibold">Properties</span>. Double-click the parameter name <span className="font-mono font-sans">Sync Key</span> and paste your generated Broker Sync Key. Click <span className="font-semibold font-sans">OK</span> then right-click and select <span className="font-semibold">Start</span>.</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2 gap-3">
                  <button
                    onClick={() => {
                      setIsConnectModalOpen(false);
                      setConnectStep(1);
                      setNewBrokerName('');
                      setGeneratedKey('');
                      setNewConnectionId('');
                    }}
                    className="border border-[var(--border)] hover:bg-[var(--row)] text-[var(--text-sub)] hover:text-[var(--text)] text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
                  >
                    Do this later
                  </button>
                  <button
                    onClick={handleVerifyConnection}
                    disabled={verifying}
                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                    className="hover:opacity-95 font-bold px-5 py-2.5 rounded-xl cursor-pointer text-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
                  >
                    {verifying ? 'Verifying...' : 'Verify Connection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
