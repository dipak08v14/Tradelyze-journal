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
  Upload,
  Trash2,
  Lock,
  CheckCircle,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import Papa from 'papaparse';

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
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);

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

  // Dhan broker integration states
  const [dhanConnecting, setDhanConnecting] = useState(false);
  const [dhanToken, setDhanToken] = useState('');
  const [dhanError, setDhanError] = useState('');
  const [verifyingDhan, setVerifyingDhan] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [syncingDhan, setSyncingDhan] = useState(false);
  const [importingDhanHistory, setImportingDhanHistory] = useState(false);
  const [disconnectingDhan, setDisconnectingDhan] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [dhanOpenPositionsCount, setDhanOpenPositionsCount] = useState(0);
  const [repairingDhanOptions, setRepairingDhanOptions] = useState(false);

  // CSV Import states
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvStep, setCsvStep] = useState<1 | 2>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvParsed, setCsvParsed] = useState<boolean>(false);
  const [csvValidationError, setCsvValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importingCsv, setImportingCsv] = useState<boolean>(false);
  const [csvImportProgress, setCsvImportProgress] = useState<string>('');
  const [csvImportResults, setCsvImportResults] = useState<{
    successCount: number;
    duplicateCount: number;
    errorCount: number;
    completed: boolean;
    errorMessages?: string[];
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch Dhan open positions count
  const fetchDhanOpenPositions = async (tok: string) => {
    try {
      const res = await fetch('/api/dhan-open-positions', {
        headers: {
          'Authorization': `Bearer ${tok}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDhanOpenPositionsCount(data.positions?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch Dhan open positions count:', err);
    }
  };

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

      const dhanConn = (data || []).find(c => c.broker_type === 'dhan' && c.is_active);
      if (dhanConn) {
        const { data: sessionData } = await supabase.auth.getSession();
        const tok = sessionData?.session?.access_token;
        if (tok) {
          fetchDhanOpenPositions(tok);
        }
      }
    } catch (err: any) {
      console.error('Error fetching broker connections:', err);
    } finally {
      setFetchingConnections(false);
    }
  };

  const handleConnectDhan = async () => {
    if (!dhanToken.trim()) return;
    try {
      setVerifyingDhan(true);
      setDhanError('');
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!tok) {
        setDhanError('Authentication token is missing. Please re-login.');
        return;
      }

      const res = await fetch('/api/dhan-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        },
        body: JSON.stringify({ access_token: dhanToken.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        setDhanError(data.error || 'Connection failed.');
        return;
      }

      showSuccess('Dhan connected successfully');
      setDhanConnecting(false);
      setDhanToken('');
      await fetchConnections();
    } catch (err: any) {
      setDhanError('Unexpected failure connecting to Dhan: ' + err.message);
    } finally {
      setVerifyingDhan(false);
    }
  };

  const handleSyncDhan = async () => {
    try {
      setSyncingDhan(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!tok) {
        showError('Authentication token missing.');
        return;
      }

      const res = await fetch('/api/dhan-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        },
        body: JSON.stringify({ sync_type: 'manual' })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Dhan synchronization failed.');
        return;
      }

      showSuccess(`Sync Complete: Synced ${data.trades_created} trades, skipped ${data.legs_skipped} legs.`);
      await fetchConnections();
    } catch (err: any) {
      showError('Sync failed: ' + err.message);
    } finally {
      setSyncingDhan(false);
    }
  };

  const handleImportHistoryDhan = async () => {
    try {
      setImportingDhanHistory(true);
      setShowImportConfirm(false);
      
      showSuccess('Importing trade history from Dhan. This may take a few seconds...');

      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!tok) {
        showError('Authentication token missing.');
        return;
      }

      const res = await fetch('/api/dhan-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        },
        body: JSON.stringify({ sync_type: 'historical' })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Dhan history import failed.');
        return;
      }

      showSuccess(`Historical Import Complete! Created ${data.trades_created} trades, skipped ${data.legs_skipped} legs.`);
      await fetchConnections();
    } catch (err: any) {
      showError('History import failed: ' + err.message);
    } finally {
      setImportingDhanHistory(false);
    }
  };

  const handleDisconnectDhan = async () => {
    try {
      setDisconnectingDhan(true);
      setShowDisconnectConfirm(false);

      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!tok) {
        showError('Authentication token missing.');
        return;
      }

      const res = await fetch('/api/dhan-disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to disconnect Dhan.');
        return;
      }

      showSuccess('Dhan disconnected successfully');
      setDhanOpenPositionsCount(0);
      await fetchConnections();
    } catch (err: any) {
      showError('Disconnection failed: ' + err.message);
    } finally {
      setDisconnectingDhan(false);
    }
  };

  const handleRepairDhanOptions = async () => {
    try {
      setRepairingDhanOptions(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!tok) {
        showError('Authentication token missing.');
        return;
      }

      const res = await fetch('/api/dhan-repair-options', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to repair option types.');
        return;
      }

      showSuccess(`Fixed ${data.trades_option_type_fixed || 0} option types and ${data.trades_direction_fixed || 0} directions`);
      await fetchConnections();
    } catch (err: any) {
      showError('Repair failed: ' + err.message);
    } finally {
      setRepairingDhanOptions(false);
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

  // CSV Import helper functions
  const handleDownloadTemplate = () => {
    const csvContent = `Date,Symbol,Direction,PnL,Quantity,EntryPrice,ExitPrice,EntryTime,Commission,Notes
2026-06-10,XAUUSD,LONG,145.50,0.10,2374.50,2389.00,19:07,2.50,Strong OB setup
2026-06-11,BANKNIFTY,SHORT,-380.00,25,44250.00,44098.00,09:20,18.00,False breakout
2026-06-12,BTCUSDT,LONG,220.00,0.05,67200.00,67640.00,14:30,1.20,`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'TradelyzeTemplate.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseDateToISO = (rawDate: any): string | null => {
    const str = String(rawDate || '').trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const parts = str.split('-');
      return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const parts = str.split('/');
      return parts[2] + '-' + parts[1] + '-' + parts[0];
    }
    return null;
  };

  const handleParseCsv = (file: File) => {
    setCsvFile(file);
    setCsvValidationError(null);
    setCsvImportResults(null);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const headers = results.meta.fields || [];
          const rows = results.data;
          
          // 4 required headers: Date, Symbol, Direction, PnL
          const requiredFields = ['Date', 'Symbol', 'Direction', 'PnL'];
          const missing = requiredFields.filter(f => !headers.includes(f));
          if (missing.length > 0) {
            throw new Error(`CSV file is missing required headers: ${missing.join(', ')}`);
          }
          
          if (!rows || rows.length === 0) {
            throw new Error('CSV file has no data rows to import.');
          }
          
          // Validate each row
          for (let i = 0; i < rows.length; i++) {
            const row: any = rows[i];
            const rowNum = i + 1; // Row number for user feedback
            
            const dateVal = (row['Date'] || '').trim();
            const symVal = (row['Symbol'] || '').trim();
            const dirVal = (row['Direction'] || '').trim();
            const pnlVal = (row['PnL'] || '').trim();
            
            if (!dateVal) {
              throw new Error(`Row ${rowNum}: Date is required.`);
            }
            const parsedIsoDate = parseDateToISO(dateVal);
            if (!parsedIsoDate) {
              throw new Error(`Row ${rowNum}: Date must be in YYYY-MM-DD or DD-MM-YYYY format. Found: ${dateVal}`);
            }
            
            if (!dirVal) {
              throw new Error(`Row ${rowNum}: Direction is required.`);
            }
            if (dirVal !== 'LONG' && dirVal !== 'SHORT') {
              throw new Error(`Row ${rowNum}: Direction must be LONG or SHORT. Found: ${dirVal}`);
            }
            
            if (!pnlVal) {
              throw new Error(`Row ${rowNum}: PnL is required.`);
            }
            if (isNaN(Number(pnlVal))) {
              throw new Error(`Row ${rowNum}: PnL must be a number. Found: ${pnlVal}`);
            }
          }
          
          setCsvRows(rows);
          setCsvParsed(true);
        } catch (err: any) {
          console.error('CSV validation error:', err);
          setCsvValidationError(err.message || 'Validation failed.');
          setCsvRows([]);
          setCsvParsed(false);
        }
      },
      error: (err) => {
        console.error('Papa Parse error:', err);
        setCsvValidationError(`Failed to parse CSV: ${err.message}`);
        setCsvRows([]);
        setCsvParsed(false);
      }
    });
  };

  const handleImportCsvTrades = async () => {
    if (!userId || csvRows.length === 0) return;
    
    setImportingCsv(true);
    setCsvImportProgress(`Importing...`);
    
    try {
      const validRows = csvRows;

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        alert('Authentication error. Please refresh the page and try again.')
        return
      }

      let importedCount = 0
      let duplicateCount = 0
      let errorMessages: string[] = []

      for (const row of validRows) {
        try {
          const dateStr = parseDateToISO(row.Date)
          if (!dateStr) {
            errorMessages.push('Row ' + String(row.Symbol || '') + ' Date error: Invalid date format ' + String(row.Date))
            continue
          }
          const pnlNum = parseFloat(String(row.PnL || '0').replace(/[^0-9.-]/g, ''))
          const symbolStr = String(row.Symbol || '').trim().toUpperCase()
          const directionStr = String(row.Direction || '').trim().toUpperCase()
          const dateParts = dateStr.split('-')
          const yearNum = parseInt(dateParts[0])
          const monthNum = parseInt(dateParts[1])
          const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
          const monthStr = monthNames[monthNum - 1] || 'Jan'
          const hashInput = symbolStr + dateStr + String(pnlNum)
          const hashVal = hashInput.split('').reduce((a, c) => Math.imul(31, a) + c.charCodeAt(0) | 0, 0)
          const brokerTicket = 'csv_' + Math.abs(hashVal).toString(36)

          const { data: existing } = await supabase
            .from('trades')
            .select('id')
            .eq('broker_ticket', brokerTicket)
            .eq('user_id', user.id)
            .maybeSingle()

          if (existing) {
            duplicateCount++
            continue
          }

          let finalDirection: 'LONG' | 'SHORT' = 'LONG'
          let finalOptionType: 'CALL' | 'PUT' | null = null

          if (directionStr === 'SHORT') {
            finalDirection = 'SHORT'
          } else if (directionStr === 'CALL') {
            finalDirection = 'LONG'
            finalOptionType = 'CALL'
          } else if (directionStr === 'PUT') {
            finalDirection = 'SHORT'
            finalOptionType = 'PUT'
          } else {
            finalDirection = 'LONG'
          }

          const tradeToInsert = {
            user_id: user.id,
            date: dateStr,
            symbol: symbolStr,
            direction: finalDirection,
            option_type: finalOptionType,
            pnl: pnlNum,
            status: pnlNum > 0 ? 'Win' : pnlNum < 0 ? 'Loss' : 'Breakeven',
            month: monthStr,
            year: yearNum,
            sync_source: 'csv',
            needs_review: true,
            broker_name: 'CSV Import',
            broker_ticket: brokerTicket,
            fees: row.Commission && row.Commission !== '' ? parseFloat(String(row.Commission).replace(/[^0-9.-]/g, '')) : 0,
            quantity: row.Quantity && row.Quantity !== '' ? parseFloat(row.Quantity) : null,
            entry_time: row.EntryTime && row.EntryTime !== '' ? String(row.EntryTime).trim() : null,
            notes: row.Notes && row.Notes !== '' ? String(row.Notes).trim() : null
          }

          const { error: insertError } = await supabase.from('trades').insert(tradeToInsert)

          if (insertError) {
            errorMessages.push('Row ' + symbolStr + ' ' + dateStr + ': ' + insertError.message)
          } else {
            importedCount++
          }
        } catch (rowError: any) {
          errorMessages.push('Row processing error: ' + rowError.message)
        }
      }

      setCsvImportResults({
        successCount: importedCount,
        duplicateCount,
        errorCount: errorMessages.length,
        completed: true,
        errorMessages
      });

      if (importedCount > 0) {
        showSuccess(`✓ Successfully imported ${importedCount} trades`);
      }
    } catch (err: any) {
      console.error('CSV import general error:', err);
      showError(err.message || 'Import process encountered an error.');
    } finally {
      setImportingCsv(false);
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
    if (userData && !hasLoadedProfile) {
      setFullName(userData.full_name || '');
      setTimezone(userData.timezone || 'Asia/Kolkata');
      setPreferredCurrency(userData.preferred_currency || 'INR');
      setSelectedTheme(userData.theme_background || 'charcoal');
      setSelectedAccent(userData.theme_accent || 'cyan');
      setHasLoadedProfile(true);

      // Read extension threshold from localStorage if saved
      const savedThreshold = localStorage.getItem('tl-alert-threshold');
      if (savedThreshold) {
        setAlertThreshold(parseInt(savedThreshold, 10));
      }
    }
  }, [userData, hasLoadedProfile]);

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
      
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId;

      if (!currentUserId) {
        showError('No active authentication session found.');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          timezone,
          preferred_currency: preferredCurrency,
        })
        .eq('id', currentUserId);

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
      <main className="flex-1 overflow-y-auto w-full min-w-0 overflow-x-hidden px-0">
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
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-4 flex items-center gap-2">
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
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-4 flex items-center gap-2">
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
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-1.5 flex items-center gap-2">
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
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-1 flex items-center gap-2 font-display">
                       Broker Connections
                    </h3>
                    <p className="text-xs text-[var(--text-sub)] mb-6">
                      Sync MetaTrader 5 background service to keep your trade journal updated automatically.
                    </p>

                    {fetchingConnections ? (
                      <div className="flex justify-center items-center py-6">
                        <div className="animate-spin w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]" />
                      </div>
                    ) : connections.filter(conn => conn.broker_type !== 'dhan').length === 0 ? (
                      <div className="border border-dashed border-[var(--border)] rounded-xl p-8 text-center bg-[var(--bar)] mb-6">
                        <p className="text-sm font-semibold text-[var(--text)] mb-1">No broker accounts connected</p>
                        <p className="text-xs text-[var(--text-sub)]">Connect Metatrader 5 to sync automatic live trade logs</p>
                      </div>
                    ) : (
                      <div className="space-y-4 mb-6">
                        {connections.filter(conn => conn.broker_type !== 'dhan').map((conn) => {
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

                    <div className="flex flex-wrap gap-3 items-center mb-6">
                      <button
                        onClick={() => setIsConnectModalOpen(true)}
                        style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                        className="hover:opacity-90 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs h-[42px]"
                      >
                        + Connect MT5 Broker
                      </button>

                      <button
                        onClick={() => {
                          setIsCsvModalOpen(true);
                          setCsvStep(1);
                          setCsvFile(null);
                          setCsvRows([]);
                          setCsvParsed(false);
                          setCsvValidationError(null);
                          setCsvImportResults(null);
                        }}
                        style={{
                          border: '1px solid var(--border-md)',
                          backgroundColor: 'transparent',
                          color: 'var(--text)',
                          borderRadius: '8px',
                          padding: '10px 16px',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                        className="flex items-center gap-2 hover:bg-[var(--row)] transition-all cursor-pointer h-[42px]"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Import from CSV</span>
                      </button>
                    </div>

                    {/* DHAN INTEGRATION SUBSECTION */}
                    <div className="border-t border-[var(--border)] pt-6 mt-6">
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-4 font-display">Dhan Broker Connection</h4>
                      
                      {(() => {
                        const dhanConnComp = connections.find(c => c.broker_type === 'dhan' && c.is_active);
                        
                        if (!dhanConnComp) {
                          // STATE A - NOT CONNECTED / INACTIVE
                          return (
                            <div style={{ background: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-5">
                              {!dhanConnecting ? (
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                    <div style={{ backgroundColor: 'rgba(6,182,212,0.13)', color: '#06b6d4' }} className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg font-display">
                                      D
                                    </div>
                                    <div>
                                      <h4 className="text-[15px] font-semibold text-[var(--text)]">Dhan</h4>
                                      <p className="text-xs text-[var(--text-sub)]">Auto-sync your Dhan F&O and equity trades</p>
                                    </div>
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => setDhanConnecting(true)}
                                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                      className="hover:opacity-90 font-bold px-4 py-2 rounded-xl cursor-pointer text-xs h-9 inline-flex items-center justify-center"
                                    >
                                      + Connect Dhan
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[15px] font-semibold text-[var(--text)]">Connect Dhan Account</h4>
                                    <button
                                      onClick={() => {
                                        setDhanConnecting(false);
                                        setDhanToken('');
                                        setDhanError('');
                                      }}
                                      className="text-xs text-[var(--text-sub)] hover:text-[var(--text)] cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                  <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                                    1. Open <a href="https://dhan.co" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">dhan.co</a> &rarr; Profile &rarr; Access Token <br />
                                    2. Generate an access token for your account <br />
                                    3. Copy and paste it below
                                  </p>

                                  <div className="space-y-2">
                                    <div className="relative">
                                      <input
                                        type={showToken ? 'text' : 'password'}
                                        value={dhanToken}
                                        onChange={(e) => setDhanToken(e.target.value)}
                                        placeholder="Paste your Dhan access token"
                                        style={{ border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--text)' }}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs pr-10 focus:outline-[var(--accent)]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowToken(!showToken)}
                                        style={{ color: 'var(--text-sub)' }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-[var(--text)]"
                                      >
                                        {showToken ? (
                                          <EyeOff className="w-4 h-4 cursor-pointer" />
                                        ) : (
                                          <Eye className="w-4 h-4 cursor-pointer" />
                                        )}
                                      </button>
                                    </div>
                                    {dhanError && (
                                      <p className="text-xs font-semibold text-[#ef4444]">{dhanError}</p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <button
                                      disabled={verifyingDhan || !dhanToken.trim()}
                                      onClick={handleConnectDhan}
                                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                      className="hover:opacity-90 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs h-9 inline-flex items-center justify-center disabled:opacity-50"
                                    >
                                      {verifyingDhan ? (
                                        <span className="flex items-center gap-1.5">
                                          <span className="animate-spin w-3 h-3 rounded-full border border-white border-t-transparent"></span>
                                          Connecting...
                                        </span>
                                      ) : (
                                        'Connect & Verify'
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDhanConnecting(false);
                                        setDhanToken('');
                                        setDhanError('');
                                      }}
                                      style={{ border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text)' }}
                                      className="hover:bg-[var(--row)] font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs h-9 inline-flex items-center justify-center opacity-70"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          // STATE B - CONNECTED & ACTIVE
                          if (dhanConnecting) {
                            return (
                              <div style={{ background: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[15px] font-semibold text-[var(--text)]">Reconnect Dhan Account</h4>
                                  <button
                                    onClick={() => {
                                      setDhanConnecting(false);
                                      setDhanToken('');
                                      setDhanError('');
                                    }}
                                    className="text-xs text-[var(--text-sub)] hover:text-[var(--text)] cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-xs text-[var(--text-sub)] leading-relaxed">
                                  1. Open <a href="https://dhan.co" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">dhan.co</a> &rarr; Profile &rarr; Access Token <br />
                                  2. Generate an access token for your account <br />
                                  3. Copy and paste it below
                                </p>

                                <div className="space-y-2">
                                  <div className="relative">
                                    <input
                                      type={showToken ? 'text' : 'password'}
                                      value={dhanToken}
                                      onChange={(e) => setDhanToken(e.target.value)}
                                      placeholder="Paste your Dhan access token"
                                      style={{ border: '1px solid var(--border-md)', background: 'var(--bg)', color: 'var(--text)' }}
                                      className="w-full px-4 py-2.5 rounded-xl text-xs pr-10 focus:outline-[var(--accent)]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowToken(!showToken)}
                                      style={{ color: 'var(--text-sub)' }}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-[var(--text)]"
                                    >
                                      {showToken ? (
                                        <EyeOff className="w-4 h-4 cursor-pointer" />
                                      ) : (
                                        <Eye className="w-4 h-4 cursor-pointer" />
                                      )}
                                    </button>
                                  </div>
                                  {dhanError && (
                                    <p className="text-xs font-semibold text-[#ef4444]">{dhanError}</p>
                                  )}
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    disabled={verifyingDhan || !dhanToken.trim()}
                                    onClick={handleConnectDhan}
                                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                    className="hover:opacity-90 font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs h-9 inline-flex items-center justify-center disabled:opacity-50"
                                  >
                                    {verifyingDhan ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="animate-spin w-3 h-3 rounded-full border border-white border-t-transparent"></span>
                                        Connecting...
                                      </span>
                                    ) : (
                                      'Connect & Verify'
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDhanConnecting(false);
                                      setDhanToken('');
                                      setDhanError('');
                                    }}
                                    style={{ border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text)' }}
                                    className="hover:bg-[var(--row)] font-bold px-4 py-2.5 rounded-xl cursor-pointer text-xs h-9 inline-flex items-center justify-center opacity-70"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div style={{ background: 'var(--bar)', border: '0.5px solid var(--border)', borderRadius: '12px' }} className="p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {dhanConnComp.sync_status === 'token_expired' ? (
                                    <span className="w-2 h-2 rounded-full bg-[#f59e0b] inline-block animate-pulse"></span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-[#22c55e] inline-block animate-pulse"></span>
                                  )}
                                  <span className="text-[15px] font-semibold text-[var(--text)]">Dhan</span>
                                  {dhanConnComp.sync_status === 'token_expired' ? (
                                    <span className="bg-amber-500/12 text-amber-500 border border-amber-800/30 text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 font-mono">
                                      Token Expired
                                    </span>
                                  ) : (
                                    <span className="bg-emerald-500/12 text-emerald-400 border border-emerald-800/30 text-[10px] font-extrabold uppercase rounded-full px-2 py-0.5 font-mono">
                                      Connected
                                    </span>
                                  )}
                                </div>
                              </div>

                              {dhanConnComp.sync_status === 'token_expired' && (
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs px-4 py-3 rounded-xl">
                                  Token expired — please reconnect your Dhan account
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[var(--border)] pt-4">
                                <div>
                                  <span className="block text-[11px] font-medium text-[var(--text-sub)] uppercase tracking-wider font-mono">ACCOUNT</span>
                                  <span className="text-sm font-semibold text-[var(--text)] font-mono">{dhanConnComp.account_login || '—'}</span>
                                </div>
                                <div>
                                  <span className="block text-[11px] font-medium text-[var(--text-sub)] uppercase tracking-wider font-mono">LAST SYNC</span>
                                  <span className="text-sm font-semibold text-[var(--text)]">{formatLastSynced(dhanConnComp.last_sync_at)}</span>
                                </div>
                                <div>
                                  <span className="block text-[11px] font-medium text-[var(--text-sub)] uppercase tracking-wider font-mono">TRADES SYNCED</span>
                                  <span className="text-sm font-semibold text-[var(--text)] font-mono">{dhanConnComp.total_synced ?? 0}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-6 border-t border-[var(--border)] pt-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[var(--text-sub)]">Needs Review:</span>
                                  {dhanConnComp.trades_pending_review > 0 ? (
                                    <span className="bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[11px] font-bold rounded px-1.5 py-0.5">
                                      {dhanConnComp.trades_pending_review} trades
                                    </span>
                                  ) : (
                                    <span className="bg-zinc-700/20 text-[var(--text-sub)] border border-zinc-750 text-[11px] font-medium rounded px-1.5 py-0.5">
                                      0 trades
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-[var(--text-sub)]">Open Positions:</span>
                                  <span className="bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--border)] text-[11px] font-bold rounded px-1.5 py-0.5">
                                    {dhanOpenPositionsCount} positions
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2.5 border-t border-[var(--border)] pt-4">
                                {dhanConnComp.sync_status === 'token_expired' ? (
                                  <button
                                    onClick={() => setDhanConnecting(true)}
                                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                    className="hover:opacity-90 font-bold px-4 py-1.5 rounded-lg cursor-pointer text-xs h-8 flex items-center justify-center animate-pulse"
                                  >
                                    Reconnect
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      disabled={syncingDhan}
                                      onClick={handleSyncDhan}
                                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                                      className="hover:opacity-90 font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs h-8 flex items-center justify-center gap-1.5"
                                    >
                                      {syncingDhan ? (
                                        <>
                                          <span className="animate-spin w-3 h-3 rounded-full border border-white border-t-transparent"></span>
                                          Syncing...
                                        </>
                                      ) : (
                                        'Sync Now'
                                      )}
                                    </button>
                                    <button
                                      disabled={importingDhanHistory}
                                      onClick={() => setShowImportConfirm(true)}
                                      style={{ border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text)' }}
                                      className="hover:bg-[var(--row)] font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs h-8 flex items-center justify-center"
                                    >
                                      Import History
                                    </button>
                                  </>
                                )}
                                <button
                                  disabled={disconnectingDhan}
                                  onClick={() => setShowDisconnectConfirm(true)}
                                  style={{ border: '1px solid var(--border-md)', background: 'transparent', color: '#ef4444' }}
                                  className="hover:bg-red-950/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs h-8 flex items-center justify-center"
                                >
                                  Disconnect
                                </button>
                              </div>

                              {dhanConnComp.total_synced > 0 && (
                                <div className="pt-2 border-t border-[var(--border)] mt-2">
                                  <button
                                    disabled={repairingDhanOptions}
                                    onClick={handleRepairDhanOptions}
                                    style={{ border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--accent)' }}
                                    className="hover:bg-[var(--row)] font-bold px-3 py-1.5 rounded-lg cursor-pointer text-xs h-8 flex items-center justify-center gap-1.5"
                                  >
                                    {repairingDhanOptions ? (
                                      <>
                                        <span className="animate-spin w-3 h-3 rounded-full border border-[var(--accent)] border-t-transparent"></span>
                                        Fixing Option Types...
                                      </>
                                    ) : (
                                      'Fix Option Types'
                                    )}
                                  </button>
                                </div>
                              )}

                              {showImportConfirm && (
                                <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl space-y-3 mt-2">
                                  <p className="text-xs text-[var(--text)]">Import up to 1 year of trade history from Dhan? Existing trades will not be duplicated.</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={importingDhanHistory}
                                      onClick={handleImportHistoryDhan}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                                    >
                                      Yes, Import
                                    </button>
                                    <button
                                      onClick={() => setShowImportConfirm(false)}
                                      className="bg-zinc-750 hover:bg-zinc-700 text-[var(--text-sub)] font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              {showDisconnectConfirm && (
                                <div className="bg-[var(--bg)] border border-[var(--border)] p-4 rounded-xl space-y-3 mt-2">
                                  <p className="text-xs text-[var(--text)]">Remove Dhan connection? Your synced trades will remain in your journal.</p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      disabled={disconnectingDhan}
                                      onClick={handleDisconnectDhan}
                                      className="bg-[#ef4444] hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                                    >
                                      Yes, Disconnect
                                    </button>
                                    <button
                                      onClick={() => setShowDisconnectConfirm(false)}
                                      className="bg-zinc-750 hover:bg-zinc-700 text-[var(--text-sub)] font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fade-in bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-md">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-2 flex items-center gap-2">
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
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-1 flex items-center gap-2">
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
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', textTransform: 'none' }} className="mb-1 flex items-center gap-2">
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

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal close */}
            <button
              onClick={() => {
                setIsCsvModalOpen(false);
              }}
              className="absolute top-4 right-4 text-[var(--text-sub)] hover:text-[var(--text)] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* STEP INDICATOR */}
            {!csvImportResults?.completed && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider pb-2 border-b border-[var(--border)] mb-2 select-none">
                <span style={{ color: csvStep === 1 ? 'var(--accent)' : 'var(--text-sub)' }}>
                  1 — Download Template
                </span>
                <span className="text-[var(--text-muted)]">→</span>
                <span style={{ color: csvStep === 2 ? 'var(--accent)' : 'var(--text-sub)' }}>
                  2 — Upload & Import
                </span>
              </div>
            )}

            {/* STEP 1: DOWNLOAD TEMPLATE */}
            {csvStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text)]">Import Trades from CSV</h3>
                  <p className="text-xs text-[var(--text-sub)] mt-1">
                    Use the Tradelyze template to prepare your trades for import.
                  </p>
                </div>

                {/* SECTION A */}
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-[var(--text)]">Step 1: Download the template</h4>
                  <p className="text-xs text-[var(--text-sub)] animate-fade-in">
                    Fill in your trades using this exact format. The template includes sample rows to guide you.
                  </p>
                  
                  <button
                    onClick={handleDownloadTemplate}
                    style={{
                      backgroundColor: 'var(--accent-muted)',
                      borderColor: 'var(--accent)',
                    }}
                    className="w-full text-[13px] font-semibold text-[var(--accent)] border rounded-lg py-3 px-5 hover:opacity-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>↓ Download Tradelyze CSV Template</span>
                  </button>
                </div>

                {/* SECTION B */}
                <div className="space-y-3">
                  <h4 className="text-[13px] font-semibold text-[var(--text)]">Required format for each column</h4>
                  
                  <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }} className="text-[10px] uppercase font-mono text-[var(--text-muted)] font-bold">
                          <th className="p-2 pl-3">Column Name</th>
                          <th className="p-2 text-center">Required</th>
                          <th className="p-2 pr-3">Format & Rules</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] text-[11px] text-[var(--text-sub)]">
                        <tr>
                          <td className="p-2 pl-3 font-mono font-bold text-[var(--text)]">Date</td>
                          <td className="p-2 text-center text-red-500 font-semibold text-xs">YES</td>
                          <td className="p-2 pr-3">YYYY-MM-DD or DD-MM-YYYY (both accepted) (example: 2026-06-16 or 16-06-2026)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-bold text-[var(--text)]">Symbol</td>
                          <td className="p-2 text-center text-red-500 font-semibold text-xs">YES</td>
                          <td className="p-2 pr-3">Any text, uppercase preferred (XAUUSD, BANKNIFTY, BTCUSDT)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-bold text-[var(--text)]">Direction</td>
                          <td className="p-2 text-center text-red-500 font-semibold text-xs">YES</td>
                          <td className="p-2 pr-3">Must be exactly LONG or SHORT — no other values accepted</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-bold text-[var(--text)]">PnL</td>
                          <td className="p-2 text-center text-red-500 font-semibold text-xs">YES</td>
                          <td className="p-2 pr-3">Number only, no currency symbols or commas (145.50 or -380.00)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">Quantity</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">Number (lots, shares, contracts)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">EntryPrice</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">Number with decimals</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">ExitPrice</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">Number with decimals</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">EntryTime</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">HH:MM in 24-hour format (19:07)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">Commission</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">Positive number (2.50)</td>
                        </tr>
                        <tr>
                          <td className="p-2 pl-3 font-mono font-semibold">Notes</td>
                          <td className="p-2 text-center">No</td>
                          <td className="p-2 pr-3">Any text</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                    Leave optional columns blank if not available. Do not add or rename columns. Do not change the header row.
                  </p>
                </div>

                <button
                  onClick={() => setCsvStep(2)}
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  className="w-full text-xs font-bold rounded-lg py-3 hover:opacity-90 transition-all text-center cursor-pointer mt-2"
                >
                  I have filled the template — Upload Now →
                </button>
              </div>
            )}

            {/* STEP 2: UPLOAD & IMPORT */}
            {csvStep === 2 && (
              <div className="space-y-5">
                {/* Header & Back button */}
                <div className="flex items-center gap-2">
                  {!csvImportResults?.completed && (
                    <button
                      onClick={() => {
                        setCsvStep(1);
                        setCsvFile(null);
                        setCsvRows([]);
                        setCsvParsed(false);
                        setCsvValidationError(null);
                      }}
                      className="p-1.5 hover:bg-[var(--row)] rounded-lg text-[var(--text-sub)] hover:text-[var(--text)] transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text)]">Upload Your CSV File</h3>
                  </div>
                </div>

                {/* Drag and drop upload area */}
                {!csvParsed && !csvValidationError && !importingCsv && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleParseCsv(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    style={{
                      border: isDragging ? '2px dashed var(--accent)' : '2px dashed var(--border-md)',
                      borderRadius: '12px',
                      borderColor: isDragging ? 'var(--accent)' : 'var(--border-md)',
                      backgroundColor: isDragging ? 'var(--accent-muted)' : 'transparent',
                      padding: '40px'
                    }}
                    className="text-center cursor-pointer hover:border-[var(--accent)] transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleParseCsv(e.target.files[0]);
                        }
                      }}
                    />
                    <Upload className="w-8 h-8 text-[var(--accent)] mb-2 animate-bounce" />
                    <span className="text-sm font-semibold text-[var(--text)]">
                      Drag your filled CSV here or click to browse
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Only Tradelyze format CSV files are accepted
                    </span>
                  </div>
                )}

                {/* RED Validation Error Block */}
                {csvValidationError && (
                  <div className="space-y-4">
                    <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-xl p-4 text-xs font-mono space-y-2 animate-fade-in">
                      <div className="font-bold flex items-center gap-1">
                        <AlertOctagon className="w-4 h-4" /> Validation Error
                      </div>
                      <div>{csvValidationError}</div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setCsvValidationError(null);
                        setCsvFile(null);
                        setCsvRows([]);
                        setCsvParsed(false);
                      }}
                      style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                      className="w-full text-xs font-semibold py-2.5 rounded-xl cursor-pointer hover:bg-[var(--row)] transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Preview section if parsed & valid */}
                {csvParsed && !csvValidationError && !csvImportResults?.completed && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[13px] font-semibold text-[var(--text)] mb-2">
                        Ready to import — Preview (first 5 rows)
                      </h4>
                      
                      <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }} className="text-[10px] uppercase font-mono text-[var(--text-muted)] font-bold">
                              <th className="p-2 pl-3">Date</th>
                              <th className="p-2">Symbol</th>
                              <th className="p-2">Direction</th>
                              <th className="p-2">P&L</th>
                              <th className="p-2 pr-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] text-[11px] text-[var(--text-sub)]">
                            {csvRows.slice(0, 5).map((row, idx) => {
                              const pnl = parseFloat(row.PnL || '0');
                              const status = pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Breakeven';
                              const statusColor = status === 'Win' ? 'text-green-500 font-bold' : status === 'Loss' ? 'text-red-500 font-bold' : 'text-gray-400';
                              return (
                                <tr key={idx}>
                                  <td className="p-2 pl-3 font-mono">{row.Date}</td>
                                  <td className="p-2 font-mono font-bold text-[var(--text)]">{row.Symbol}</td>
                                  <td className="p-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${row.Direction === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {row.Direction}
                                    </span>
                                  </td>
                                  <td className="p-2 font-mono font-semibold">{row.PnL}</td>
                                  <td className="p-2 pr-3 text-right font-semibold font-mono">
                                    <span className={statusColor}>{status}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-[var(--text-sub)]">
                      <div>• Total rows in file: <span className="font-mono font-bold text-[var(--text)]">{csvRows.length}</span></div>
                      <div>• Valid rows to import: <span className="font-mono font-bold text-[var(--text)]">{csvRows.length}</span></div>
                      <div>• Duplicate check: Trades already in your journal will be automatically skipped</div>
                    </div>

                    <button
                      onClick={handleImportCsvTrades}
                      disabled={importingCsv}
                      style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                      className="w-full text-xs font-semibold rounded-lg py-3 hover:opacity-90 disabled:opacity-50 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {importingCsv ? (
                        <>
                          <span className="animate-spin text-xs">⏳</span>
                          <span>{csvImportProgress}</span>
                        </>
                      ) : (
                        <span>Import {csvRows.length} Trades</span>
                      )}
                    </button>
                  </div>
                )}

                {/* IMPORT RESULTS */}
                {csvImportResults?.completed && (
                  <div className="space-y-6 py-4 flex flex-col items-center text-center">
                    <CheckCircle className="w-16 h-16 text-[#22c55e] animate-pulse" />
                    
                    <div className="space-y-2 w-full">
                      <h2 className="text-lg font-bold text-[#22c55e]">
                        ✓ Successfully imported {csvImportResults.successCount} trades
                      </h2>
                      
                      {csvImportResults.duplicateCount > 0 && (
                        <p className="text-[13px] text-[var(--text-sub)]">
                          {csvImportResults.duplicateCount} duplicate trades were skipped (already in your journal)
                        </p>
                      )}
                      
                      {csvImportResults.errorCount > 0 && (
                        <div className="space-y-2 text-left w-full mt-2">
                          <p className="text-[13px] text-[#ef4444] font-semibold">
                            {csvImportResults.errorCount} rows had errors and were skipped:
                          </p>
                          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-h-[160px] overflow-y-auto font-mono text-[11px] text-red-400 space-y-1">
                            {csvImportResults.errorMessages?.map((msg, i) => (
                              <div key={i} className="leading-snug">• {msg}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 w-full pt-2">
                      <button
                        onClick={() => {
                          setIsCsvModalOpen(false);
                          navigate('/trading-logs');
                        }}
                        style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                        className="w-1/2 text-xs font-semibold py-2.5 rounded-lg cursor-pointer hover:opacity-95 transition-all text-center"
                      >
                        View in Trading Logs
                      </button>
                      
                      <button
                        onClick={() => {
                          setCsvStep(1);
                          setCsvFile(null);
                          setCsvRows([]);
                          setCsvParsed(false);
                          setCsvValidationError(null);
                          setCsvImportResults(null);
                        }}
                        style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                        className="w-1/2 text-xs font-semibold py-2.5 rounded-lg cursor-pointer hover:bg-[var(--row)] transition-all text-center"
                      >
                        Import Another File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                  
                  {/* Download Button Block */}
                  <div className="py-1 flex flex-col items-start gap-1.5 border-b border-[var(--border)] pb-3 mb-2">
                    <a
                      href="https://bcpwbxqlmvnyhhsonzbo.supabase.co/storage/v1/object/public/downloads/TradelyzeSync.mq5"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: 'var(--accent-muted)',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent)',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                      className="hover:opacity-90 transition-all font-sans"
                    >
                      <span className="text-base leading-none">↓</span>
                      <span>Download TradelyzeSync for MT5</span>
                    </a>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      MT5 Service file (.mq5) — place in MQL5/Services folder and add via Navigator → Services
                    </span>
                  </div>

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
