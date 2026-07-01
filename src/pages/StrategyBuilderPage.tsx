import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { Modal } from '../components/Modal';
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Trash2,
  ImagePlus,
  Loader2,
  AlertTriangle,
  Menu,
  FileSpreadsheet,
  Eye,
  X
} from 'lucide-react';

interface RuleItem {
  id: string; // client-side local unique key
  rule_text: string;
  rule_order: number;
}

interface PendingUpload {
  id: string;
  file: File;
  preview: string;
}

export const StrategyBuilderPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { id: strategyId } = useParams<{ id: string }>();
  const isEditMode = !!strategyId;

  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Core Form Fields
  const [name, setName] = useState('');
  const [srNo, setSrNo] = useState<number>(1);
  const [typeOfStrategy, setTypeOfStrategy] = useState<'Breakout' | 'Reversal' | 'Neutral' | ''>('');
  const [subType, setSubType] = useState('');
  const [status, setStatus] = useState<'active' | 'not_working' | 'retired'>('active');
  const [notes, setNotes] = useState('');

  // Rules State
  const [entryRules, setEntryRules] = useState<RuleItem[]>([
    { id: 'initial-entry-1', rule_text: '', rule_order: 1 }
  ]);
  const [exitRules, setExitRules] = useState<RuleItem[]>([
    { id: 'initial-exit-1', rule_text: '', rule_order: 1 }
  ]);

  // Images State
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [markedForDeletion, setMarkedForDeletion] = useState<string[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Performance Stats State (Edit mode only)
  const [trades, setTrades] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(isEditMode);

  // Helper generator for client-side matching IDs
  const makeId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

  // Lightbox Image Preview State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Initial Strategy Data (Edit Mode)
  useEffect(() => {
    if (!isEditMode || !userId || !strategyId) return;

    let mounted = true;
    const loadStrategyData = async () => {
      try {
        setLoading(true);
        // 1. Fetch strategy row
        const { data: strat, error: stratErr } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', strategyId)
          .eq('user_id', userId)
          .single();

        if (stratErr) throw stratErr;

        if (strat && mounted) {
          setName(strat.name || '');
          setSrNo(strat.sr_no || 1);
          setTypeOfStrategy((strat.type_of_strategy as any) || '');
          setSubType(strat.sub_type || '');
          setStatus(strat.status || 'active');
          setNotes(strat.notes || '');
          setExistingImages(strat.reference_images || []);
        }

        // 2. Fetch strategy rules
        const { data: rules, error: rulesErr } = await supabase
          .from('strategy_rules')
          .select('*')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId)
          .order('rule_order', { ascending: true });

        if (rulesErr) throw rulesErr;

        if (rules && mounted) {
          const loadedEntries = rules
            .filter((r) => r.rule_type === 'entry')
            .map((r, i) => ({
              id: r.id || `${makeId()}`,
              rule_text: r.rule_text || '',
              rule_order: i + 1
            }));

          const loadedExits = rules
            .filter((r) => r.rule_type === 'exit')
            .map((r, i) => ({
              id: r.id || `${makeId()}`,
              rule_text: r.rule_text || '',
              rule_order: i + 1
            }));

          setEntryRules(loadedEntries.length > 0 ? loadedEntries : [{ id: makeId(), rule_text: '', rule_order: 1 }]);
          setExitRules(loadedExits.length > 0 ? loadedExits : [{ id: makeId(), rule_text: '', rule_order: 1 }]);
        }

        // 3. Fetch past trades for strategy metrics
        const { data: tradesData, error: tradesErr } = await supabase
          .from('trades')
          .select('status, pnl, r_multiple, date')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId);

        if (tradesErr) throw tradesErr;

        if (tradesData && mounted) {
          setTrades(tradesData);
        }
      } catch (err: any) {
        console.error('Error fetching strategy builder assets:', err);
        showError(err.message || 'Strategy not found or unauthorized.');
        navigate('/strategies');
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingStats(false);
        }
      }
    };

    loadStrategyData();
    return () => {
      mounted = false;
    };
  }, [isEditMode, strategyId, userId, navigate]);

  // Max sr_no calculations (Create Mode Only)
  useEffect(() => {
    if (isEditMode || !userId) return;

    const findMaxSrNo = async () => {
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select('sr_no')
          .eq('user_id', userId)
          .order('sr_no', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          setSrNo(Number(data[0].sr_no || 0) + 1);
        } else {
          setSrNo(1);
        }
      } catch (err) {
        console.warn('Could not determine next serial number:', err);
        setSrNo(1);
      }
    };

    findMaxSrNo();
  }, [isEditMode, userId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border-md)', borderTopColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // --- RULE LIST MODIFIERS ---
  const handleAddRule = (type: 'entry' | 'exit') => {
    const rules = type === 'entry' ? entryRules : exitRules;
    const setRules = type === 'entry' ? setEntryRules : setExitRules;

    if (rules.length >= 10) return;

    setRules([
      ...rules,
      { id: makeId(), rule_text: '', rule_order: rules.length + 1 }
    ]);
  };

  const handleRemoveRule = (index: number, type: 'entry' | 'exit') => {
    const rules = type === 'entry' ? entryRules : exitRules;
    const setRules = type === 'entry' ? setEntryRules : setExitRules;

    if (rules.length <= 1) return;

    const updated = rules
      .filter((_, idx) => idx !== index)
      .map((r, i) => ({ ...r, rule_order: i + 1 }));

    setRules(updated);
  };

  const handleRuleTextChange = (index: number, val: string, type: 'entry' | 'exit') => {
    const setRules = type === 'entry' ? setEntryRules : setExitRules;
    setRules((prev) =>
      prev.map((r, idx) => (idx === index ? { ...r, rule_text: val } : r))
    );
  };

  const moveRuleUp = (index: number, type: 'entry' | 'exit') => {
    if (index === 0) return;
    const setRules = type === 'entry' ? setEntryRules : setExitRules;
    setRules((prev) => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[index - 1];
      arr[index - 1] = temp;
      return arr.map((r, i) => ({ ...r, rule_order: i + 1 }));
    });
  };

  const moveRuleDown = (index: number, type: 'entry' | 'exit') => {
    const rules = type === 'entry' ? entryRules : exitRules;
    if (index === rules.length - 1) return;
    const setRules = type === 'entry' ? setEntryRules : setExitRules;
    setRules((prev) => {
      const arr = [...prev];
      const temp = arr[index];
      arr[index] = arr[index + 1];
      arr[index + 1] = temp;
      return arr.map((r, i) => ({ ...r, rule_order: i + 1 }));
    });
  };

  // --- IMAGE WORKFLOWS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const currentCount = existingImages.length - markedForDeletion.length + pendingUploads.length;

  const validateAndAddImages = (files: FileList) => {
    const newUploads: PendingUpload[] = [];
    const maxAllowed = 10 - currentCount;
    let count = 0;

    for (let i = 0; i < files.length; i++) {
      if (count >= maxAllowed) {
        showError('Maximum limit of 10 reference images reached.');
        break;
      }

      const file = files[i];
      // Type checks
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showError(`Invalid format: ${file.name}. Only JPG, PNG, WEBP allowed.`);
        continue;
      }
      // Size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError(`File premium limit exceeded: ${file.name} is larger than 5MB.`);
        continue;
      }

      newUploads.push({
        id: makeId(),
        file,
        preview: URL.createObjectURL(file)
      });
      count++;
    }

    if (newUploads.length > 0) {
      setPendingUploads((prev) => [...prev, ...newUploads]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndAddImages(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndAddImages(e.target.files);
    }
  };

  const triggerFileBrowser = () => {
    fileInputRef.current?.click();
  };

  // Stage removal of existing image
  const removeExistingImage = (url: string) => {
    setMarkedForDeletion((prev) => [...prev, url]);
  };

  // Revoke preview objects of staged images
  const removePendingImage = (id: string) => {
    setPendingUploads((prev) => {
      const match = prev.find((item) => item.id === id);
      if (match) {
        URL.revokeObjectURL(match.preview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // --- SAVE ACTIONS ---
  const handleSave = async () => {
    if (!userId) return;

    // Validate inputs
    if (!name.trim() || !typeOfStrategy) {
      setShowErrors(true);
      showError('Please fill in required fields.');
      return;
    }

    try {
      setSaving(true);

      // Clean/Sanitize rules: remove those with completely empty text input
      const entryToSave = entryRules.filter((r) => r.rule_text.trim() !== '');
      const exitToSave = exitRules.filter((r) => r.rule_text.trim() !== '');

      let finalImagesArr: string[] = [];

      if (!isEditMode) {
        // == CREATE MODE FLOW ==
        // 1. Insert Strategy row
        const { data: newStrat, error: insertErr } = await supabase
          .from('strategies')
          .insert({
            user_id: userId,
            sr_no: srNo,
            type_of_strategy: typeOfStrategy,
            sub_type: subType.trim() || null,
            name: name.trim(),
            status: status,
            notes: notes.trim() || null,
            reference_images: []
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (!newStrat) {
          throw new Error('Database response for created strategy was null.');
        }

        // 2. Upload brand new screenshots if staged
        const uploadUrls: string[] = [];
        for (const pending of pendingUploads) {
          const sanitizedFilename = pending.file.name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '');
          const filePath = `strategy-images/${userId}/${newStrat.id}/${Date.now()}_${sanitizedFilename}`;

          const { error: uploadErr } = await supabase.storage
            .from('trade-media')
            .upload(filePath, pending.file, { upsert: false });

          if (uploadErr) throw uploadErr;

          const { data: mediaData } = supabase.storage
            .from('trade-media')
            .getPublicUrl(filePath);

          if (mediaData?.publicUrl) {
            uploadUrls.push(mediaData.publicUrl);
          }
        }

        // 3. Update strategy with newly generated image URLs
        if (uploadUrls.length > 0) {
          const { error: updateImgErr } = await supabase
            .from('strategies')
            .update({ reference_images: uploadUrls })
            .eq('id', newStrat.id)
            .eq('user_id', userId);

          if (updateImgErr) throw updateImgErr;
        }

        // 4. Batch insert rules
        const rulesInsertBatch = [
          ...entryToSave.map((r, idx) => ({
            strategy_id: newStrat.id,
            user_id: userId,
            rule_type: 'entry',
            rule_order: idx + 1,
            rule_text: r.rule_text.trim()
          })),
          ...exitToSave.map((r, idx) => ({
            strategy_id: newStrat.id,
            user_id: userId,
            rule_type: 'exit',
            rule_order: idx + 1,
            rule_text: r.rule_text.trim()
          }))
        ];

        if (rulesInsertBatch.length > 0) {
          const { error: rulesErr } = await supabase
            .from('strategy_rules')
            .insert(rulesInsertBatch);

          if (rulesErr) throw rulesErr;
        }

        showSuccess('Strategy created successfully!');
      } else {
        // == EDIT MODE FLOW ==
        // 1. Delete marked-for-deletion images from Storage
        if (markedForDeletion.length > 0) {
          const paths = markedForDeletion
            .map((url) => {
              const splitMatch = url.split('/trade-media/');
              return splitMatch.length > 1 ? splitMatch[1] : null;
            })
            .filter((p): p is string => p !== null);

          if (paths.length > 0) {
            const { error: storageDelErr } = await supabase.storage
              .from('trade-media')
              .remove(paths);
            if (storageDelErr) {
              console.warn('Storage files removal noticed warning:', storageDelErr);
            }
          }
        }

        // 2. Upload some newly stage-dragged screenshots
        const uploadedUrls: string[] = [];
        for (const pending of pendingUploads) {
          const sanitizedFilename = pending.file.name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._-]/g, '');
          const filePath = `strategy-images/${userId}/${strategyId}/${Date.now()}_${sanitizedFilename}`;

          const { error: uploadErr } = await supabase.storage
            .from('trade-media')
            .upload(filePath, pending.file, { upsert: false });

          if (uploadErr) throw uploadErr;

          const { data: mediaData } = supabase.storage
            .from('trade-media')
            .getPublicUrl(filePath);

          if (mediaData?.publicUrl) {
            uploadedUrls.push(mediaData.publicUrl);
          }
        }

        // 3. Re-assemble final images listing: [remaining image locations + new image locations]
        const remainingExisting = existingImages.filter(
          (url) => !markedForDeletion.includes(url)
        );
        finalImagesArr = [...remainingExisting, ...uploadedUrls];

        // 4. Update core strategies values on record
        const { error: updateStratErr } = await supabase
          .from('strategies')
          .update({
            sr_no: srNo,
            type_of_strategy: typeOfStrategy,
            sub_type: subType.trim() || null,
            name: name.trim(),
            status: status,
            notes: notes.trim() || null,
            reference_images: finalImagesArr,
            updated_at: new Date().toISOString()
          })
          .eq('id', strategyId)
          .eq('user_id', userId);

        if (updateStratErr) throw updateStratErr;

        // 5. Query existing rules in DB for clean updates and insertions
        const { data: dbRules, error: dbRulesFetchErr } = await supabase
          .from('strategy_rules')
          .select('id')
          .eq('strategy_id', strategyId)
          .eq('user_id', userId);

        if (dbRulesFetchErr) throw dbRulesFetchErr;

        const dbRuleIds = (dbRules || []).map((r) => r.id);

        // 6. Update rules that already exist in database
        const rulesToUpdate = [
          ...entryToSave
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => dbRuleIds.includes(r.id))
            .map(({ r, idx }) => ({
              id: r.id,
              rule_order: idx + 1,
              rule_text: r.rule_text.trim()
            })),
          ...exitToSave
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => dbRuleIds.includes(r.id))
            .map(({ r, idx }) => ({
              id: r.id,
              rule_order: idx + 1,
              rule_text: r.rule_text.trim()
            }))
        ];

        for (const rule of rulesToUpdate) {
          const { error: updRuleErr } = await supabase
            .from('strategy_rules')
            .update({
              rule_order: rule.rule_order,
              rule_text: rule.rule_text
            })
            .eq('id', rule.id)
            .eq('user_id', userId);

          if (updRuleErr) throw updRuleErr;
        }

        // 7. Insert rules that are brand new
        const rulesInsertBatch = [
          ...entryToSave
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => !dbRuleIds.includes(r.id))
            .map(({ r, idx }) => ({
              strategy_id: strategyId,
              user_id: userId,
              rule_type: 'entry',
              rule_order: idx + 1,
              rule_text: r.rule_text.trim()
            })),
          ...exitToSave
            .map((r, idx) => ({ r, idx }))
            .filter(({ r }) => !dbRuleIds.includes(r.id))
            .map(({ r, idx }) => ({
              strategy_id: strategyId,
              user_id: userId,
              rule_type: 'exit',
              rule_order: idx + 1,
              rule_text: r.rule_text.trim()
            }))
        ];

        if (rulesInsertBatch.length > 0) {
          const { error: rulesErr } = await supabase
            .from('strategy_rules')
            .insert(rulesInsertBatch);

          if (rulesErr) throw rulesErr;
        }

        // 8. Safely delete rules deleted by user, but only if they are not referenced
        const activeRuleIds = new Set([
          ...entryToSave.map((r) => r.id),
          ...exitToSave.map((r) => r.id)
        ]);
        const deletedRuleIds = dbRuleIds.filter((id) => !activeRuleIds.has(id));

        if (deletedRuleIds.length > 0) {
          const { data: referencingAdherences, error: refErr } = await supabase
            .from('trade_rule_adherence')
            .select('rule_id')
            .in('rule_id', deletedRuleIds)
            .eq('user_id', userId);

          if (refErr) throw refErr;

          const referencedIds = new Set((referencingAdherences || []).map((row) => row.rule_id));
          const safelyDeletableRuleIds = deletedRuleIds.filter((id) => !referencedIds.has(id));

          if (safelyDeletableRuleIds.length > 0) {
            const { error: cleanupErr } = await supabase
              .from('strategy_rules')
              .delete()
              .in('id', safelyDeletableRuleIds)
              .eq('user_id', userId);

            if (cleanupErr) throw cleanupErr;
          }
        }

        showSuccess('Strategy updated!');
      }

      // Cleanup previews on success
      pendingUploads.forEach((item) => URL.revokeObjectURL(item.preview));
      navigate('/strategies');
    } catch (err: any) {
      console.error('Save Strategy operation error:', err);
      showError(err.message || 'Error occurred while saving strategy.');
    } finally {
      setSaving(false);
    }
  };

  // --- DIRECT TRASH TRIGGER (Edit Mode Header Only) ---
  const handleDeleteFromEditMode = async () => {
    if (!isEditMode || !strategyId || !userId) return;

    try {
      setSaving(true);
      // Remove all images from storage associated first
      const allToDel = [...existingImages];
      if (allToDel.length > 0) {
        const paths = allToDel
          .map((url) => {
            const splitMatch = url.split('/trade-media/');
            return splitMatch.length > 1 ? splitMatch[1] : null;
          })
          .filter((p): p is string => p !== null);

        if (paths.length > 0) {
          await supabase.storage.from('trade-media').remove(paths);
        }
      }

      // Delete Strategy record
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', strategyId)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess('Strategy deleted.');
      setDeleteModalOpen(false);
      navigate('/strategies');
    } catch (err: any) {
      showError(err.message || 'Failed to delete strategy.');
    } finally {
      setSaving(false);
    }
  };

  // --- STATS MATHEMATICAL CALCULATION CORES (Edit mode only) ---
  const totalTradesCount = trades.length;
  const winsCount = trades.filter((t) => t.status === 'Win').length;
  const lossesCount = trades.filter((t) => t.status === 'Loss').length;
  const breakevenCount = trades.filter((t) => t.status === 'Breakeven').length;

  const calculatedWinRate = totalTradesCount > 0 ? Math.round((winsCount / totalTradesCount) * 100) : 0;
  
  const calculatedTotalR = trades.reduce((sum, t) => sum + Number(t.r_multiple || 0), 0);
  const calculatedAvgR = totalTradesCount > 0 ? (calculatedTotalR / totalTradesCount) : 0;
  
  const calculatedPnL = trades.reduce((sum, t) => sum + Number(t.pnl || 0), 0);

  // Monthly Split (1st Half: day of month <= 15, 2nd Half: day > 15)
  const firstHalfTrades = trades.filter((t) => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d.getDate() <= 15;
  });
  const secondHalfTrades = trades.filter((t) => {
    const d = new Date(t.date);
    return !isNaN(d.getTime()) && d.getDate() > 15;
  });

  const firstHalfWins = firstHalfTrades.filter((t) => t.status === 'Win').length;
  const firstHalfWinRate = firstHalfTrades.length > 0 ? Math.round((firstHalfWins / firstHalfTrades.length) * 100) : 0;

  const secondHalfWins = secondHalfTrades.filter((t) => t.status === 'Win').length;
  const secondHalfWinRate = secondHalfTrades.length > 0 ? Math.round((secondHalfWins / secondHalfTrades.length) * 100) : 0;

  const hasEnoughSplitData = firstHalfTrades.length >= 5 && secondHalfTrades.length >= 5;

  const getWinRateColorStyle = (rate: number) => {
    if (rate >= 60) return { color: '#008F67' };
    if (rate >= 40) return {};
    return { color: '#DF1C30' };
  };

  const getWinRateColorClass = (rate: number) => {
    if (rate >= 40 && rate < 60) return 'text-amber-500';
    return '';
  };

  const getDeltaColor = (val: number) => {
    if (val > 0) return '#008F67';
    if (val < 0) return '#DF1C30';
    return 'var(--text)';
  };

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0
    }).format(absVal);
    return `${isNegative ? '-' : ''}₹ ${formatted}`;
  };

  const visibleImages = existingImages.filter((url) => !markedForDeletion.includes(url));

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE VIEW */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col min-h-screen">
        {/* MOBILE TOPBAR header */}
        <header 
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-25"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ color: 'var(--text-sub)' }}
            aria-label="Open navigation drawer"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* LOADING SHIM */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
            <Loader2 style={{ color: 'var(--accent)' }} className="w-10 h-10 animate-spin" />
            <span className="text-xs font-medium tracking-wide mt-3 uppercase" style={{ color: 'var(--text-muted)' }}>
              Fetching strategy profile...
            </span>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-0">
            <div className="max-w-7xl mx-auto">
              
              {/* BREADCRUMB HEADER */}
              <Link
                to="/strategies"
                className="inline-flex items-center gap-1.5 text-sm hover:opacity-90 font-bold transition-all group"
                style={{ color: 'var(--accent)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform animate-none" />
                <span>Back to Strategies</span>
              </Link>

              {/* TITLE AND CONTROL BUTTONS ROW */}
              <div 
                className="flex flex-row items-center justify-between gap-4"
                style={{
                  background: 'var(--card)',
                  width: 'calc(100% + 48px)',
                  marginLeft: '-24px',
                  marginRight: '-24px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingTop: '3px',
                  paddingBottom: '3px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '16px'
                }}
              >
                <h1 className="text-3xl font-bold tracking-tight leading-none font-display" style={{ color: 'var(--text)' }}>
                  {isEditMode ? `Edit Strategy — ${name || 'Setup'}` : 'New Strategy'}
                </h1>
                
                <div className="flex flex-row items-center gap-2.5">
                  {isEditMode && (
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={saving}
                      style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '10px 20px' }}
                      className="max-sm:flex-1 hover:opacity-90 transition-all"
                    >
                      Delete Strategy
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim() || !typeOfStrategy}
                    style={{
                      background: saving || !name.trim() || !typeOfStrategy ? 'var(--border)' : 'var(--accent)',
                      color: saving || !name.trim() || !typeOfStrategy ? 'var(--text-muted)' : '#ffffff',
                      border: 'none',
                      padding: '6px 20px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: saving || !name.trim() || !typeOfStrategy ? 'not-allowed' : 'pointer'
                    }}
                    className="max-sm:flex-1 hover:opacity-90 transition-all inline-flex items-center justify-center gap-2 font-sans"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Strategy</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="border-b mt-5 mb-6" style={{ borderColor: 'var(--border)' }} />

              {/* TWO COLUMN FORM WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT WORKSPACE: SPANS 2 COLS */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* CARD 1: STRATEGY DETAILS */}
                  <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }} className="relative overflow-hidden">
                    <h2 style={{ color: 'var(--text)', borderColor: 'var(--border)' }} className="text-lg font-bold border-b pb-3 font-display">
                      Strategy Details
                    </h2>

                    <div className="space-y-5 mt-5">
                      {/* Name Entry */}
                      <div>
                        <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="strat_name">
                          Strategy Name *
                        </label>
                        <input
                          id="strat_name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Morning Top Reversal"
                          style={{ 
                            backgroundColor: 'var(--card)', 
                            border: showErrors && !name.trim() ? '1px solid #ef4444' : '0.5px solid var(--border)', 
                            borderRadius: '8px', 
                            padding: '10px 14px', 
                            fontSize: '13px', 
                            color: 'var(--text)' 
                          }}
                          className="w-full focus:border-[var(--accent)] focus:ring-[var(--accent)] focus:ring-1 focus:outline-none placeholder-[var(--text-muted)] transition-all duration-150 text-sm"
                        />
                        {showErrors && !name.trim() && (
                          <p className="mt-1.5 text-xs font-semibold" style={{ color: '#DF1C30' }}>
                            Strategy name is required.
                          </p>
                        )}
                      </div>

                      {/* Row 1 Entry */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                        <div>
                          <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="sr_no">
                            Sr. No.
                          </label>
                          <input
                            id="sr_no"
                            type="number"
                            min="1"
                            value={isNaN(srNo) ? '' : srNo}
                            onChange={(e) => setSrNo(parseInt(e.target.value, 10))}
                            style={{ 
                              backgroundColor: 'var(--card)', 
                              border: '0.5px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '10px 14px', 
                              fontSize: '13px', 
                              color: 'var(--text)' 
                            }}
                            className="w-full focus:border-[var(--accent)] focus:ring-[var(--accent)] focus:ring-1 focus:outline-none transition-all text-sm font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono">
                            Type of Strategy *
                          </label>
                          <div className="flex flex-wrap gap-2.5 mt-1.5">
                            {(['Breakout', 'Reversal', 'Neutral'] as const).map((type) => {
                              const isSelected = typeOfStrategy === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setTypeOfStrategy(type)}
                                  style={{
                                    borderRadius: '8px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    border: isSelected ? '1px solid var(--accent)' : '0.5px solid var(--border)',
                                    backgroundColor: isSelected ? 'var(--accent-muted)' : 'transparent',
                                    color: isSelected ? 'var(--accent)' : 'var(--text)',
                                    cursor: 'pointer'
                                  }}
                                  className="transition-all hover:opacity-90 active:scale-95"
                                >
                                  {type.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                          {showErrors && !typeOfStrategy && (
                            <p className="mt-1.5 text-xs font-semibold" style={{ color: '#DF1C30' }}>
                              Please select a type of strategy.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Row 2 Entry */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="sub_type">
                            Sub Type
                          </label>
                          <input
                            id="sub_type"
                            type="text"
                            value={subType}
                            onChange={(e) => setSubType(e.target.value)}
                            placeholder="e.g. HTF OB Reversal, Scalp"
                            style={{ 
                              backgroundColor: 'var(--card)', 
                              border: '0.5px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '10px 14px', 
                              fontSize: '13px', 
                              color: 'var(--text)' 
                            }}
                            className="w-full focus:border-[var(--accent)] focus:ring-[var(--accent)] focus:ring-1 focus:outline-none placeholder-[var(--text-muted)] transition-all duration-150 text-sm"
                          />
                        </div>

                        <div>
                          <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="status">
                            Status
                          </label>
                          <select
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            style={{ 
                              backgroundColor: 'var(--card)', 
                              border: '0.5px solid var(--border)', 
                              borderRadius: '8px', 
                              padding: '10px 14px', 
                              fontSize: '13px', 
                              color: 'var(--text)' 
                            }}
                            className="w-full focus:border-[var(--accent)] focus:ring-[var(--accent)] focus:ring-1 focus:outline-none transition-all text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="not_working">Not Working Well</option>
                            <option value="retired">Retired</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes Entries */}
                      <div>
                        <label style={{ color: 'var(--text-sub)' }} className="block text-[11px] font-bold uppercase tracking-wider mb-2 font-mono" htmlFor="notes">
                          Notes
                        </label>
                        <textarea
                          id="notes"
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Describe when this setup forms, ideal market conditions, personal observations. This is your trading notes for this strategy..."
                          style={{ 
                            backgroundColor: 'var(--card)', 
                            border: '0.5px solid var(--border)', 
                            borderRadius: '8px', 
                            padding: '10px 14px', 
                            fontSize: '13px', 
                            color: 'var(--text)' 
                          }}
                          className="w-full focus:border-[var(--accent)] focus:ring-[var(--accent)] focus:ring-1 focus:outline-none placeholder-[var(--text-muted)] transition-all resize-y text-sm"
                        />
                      </div>
                    </div>
                  </section>

                  {/* CARD 2: ENTRY RULES */}
                  <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }} className="relative overflow-hidden font-sans">
                    <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Entry Rules</h2>
                        <p style={{ color: 'var(--text)' }} className="text-xs mt-0.5">
                          Criteria required BEFORE entering trades. These auto-populate as checklist items.
                        </p>
                      </div>
                      <span style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }} className="text-xs font-mono rounded-lg px-2.5 py-1">
                        {entryRules.length} / 10
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {entryRules.map((rule, idx) => (
                        <div 
                          key={rule.id} 
                          className="flex items-center gap-2 p-2"
                          style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }}
                        >
                          {/* Order Badge */}
                          <span style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text-muted)' }} className="text-xs font-mono font-bold rounded-md py-1 px-2 shrink-0">
                            #{rule.rule_order}
                          </span>

                          <input
                            type="text"
                            value={rule.rule_text}
                            onChange={(e) => handleRuleTextChange(idx, e.target.value, 'entry')}
                            placeholder={idx === 0 ? 'e.g. Liquidity sweep at HTF key level' : `Enter rule #${idx + 1}...`}
                            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text)', fontSize: '13px' }}
                            className="flex-1 focus:outline-none transition-all placeholder-[var(--text-muted)] w-full py-1.5 px-1"
                          />

                          {/* Control Swappings */}
                          <div className="flex items-center gap-0.5 pr-1">
                            <button
                              type="button"
                              onClick={() => moveRuleUp(idx, 'entry')}
                              disabled={idx === 0}
                              style={{ color: 'var(--text-muted)' }}
                              className="hover:text-[var(--accent)] p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRuleDown(idx, 'entry')}
                              disabled={idx === entryRules.length - 1}
                              style={{ color: 'var(--text-muted)' }}
                              className="hover:text-[var(--accent)] p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(idx, 'entry')}
                              disabled={entryRules.length <= 1}
                              style={{ color: 'var(--text-muted)' }}
                              className="p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Delete rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      {entryRules.length < 10 ? (
                        <button
                          type="button"
                          onClick={() => handleAddRule('entry')}
                          style={{ 
                            border: '1.5px dashed var(--accent)', 
                            backgroundColor: 'transparent',
                            color: 'var(--accent)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer' 
                          }}
                          className="w-full text-center uppercase tracking-wider font-sans hover:bg-[var(--accent-muted)] transition-all"
                        >
                          ＋ ADD ENTRY RULE
                        </button>
                      ) : (
                        <p className="text-center text-xs py-2.5 italic font-mono border rounded-xl" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                          Maximum 10 entry rules reached.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* CARD 3: EXIT RULES */}
                  <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }} className="relative overflow-hidden font-sans">
                    <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Exit Rules</h2>
                        <p style={{ color: 'var(--text)' }} className="text-xs mt-0.5">
                          Criteria suggesting when to secure the trade. These auto-populate in checklists.
                        </p>
                      </div>
                      <span style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', color: 'var(--text-sub)' }} className="text-xs font-mono rounded-lg px-2.5 py-1">
                        {exitRules.length} / 10
                      </span>
                    </div>

                    <div className="mt-4 space-y-2.5">
                      {exitRules.map((rule, idx) => (
                        <div 
                          key={rule.id} 
                          className="flex items-center gap-2 p-2"
                          style={{ backgroundColor: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: '8px' }}
                        >
                          {/* Order Badge */}
                          <span style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', color: 'var(--text-muted)' }} className="text-xs font-mono font-bold rounded-md py-1 px-2 shrink-0">
                            #{rule.rule_order}
                          </span>

                          <input
                            type="text"
                            value={rule.rule_text}
                            onChange={(e) => handleRuleTextChange(idx, e.target.value, 'exit')}
                            placeholder={idx === 0 ? 'e.g. Primary structural resistance reached' : `Enter rule #${idx + 1}...`}
                            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text)', fontSize: '13px' }}
                            className="flex-1 focus:outline-none transition-all placeholder-[var(--text-muted)] w-full py-1.5 px-1"
                          />

                          {/* Control Swappings */}
                          <div className="flex items-center gap-0.5 pr-1">
                            <button
                              type="button"
                              onClick={() => moveRuleUp(idx, 'exit')}
                              disabled={idx === 0}
                              style={{ color: 'var(--text-muted)' }}
                              className="hover:text-[var(--accent)] p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRuleDown(idx, 'exit')}
                              disabled={idx === exitRules.length - 1}
                              style={{ color: 'var(--text-muted)' }}
                              className="hover:text-[var(--accent)] p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(idx, 'exit')}
                              disabled={exitRules.length <= 1}
                              style={{ color: 'var(--text-muted)' }}
                              className="p-1.5 rounded transition-colors disabled:opacity-30 cursor-pointer"
                              title="Delete rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      {exitRules.length < 10 ? (
                        <button
                          type="button"
                          onClick={() => handleAddRule('exit')}
                          style={{ 
                            border: '1.5px dashed var(--accent)', 
                            backgroundColor: 'transparent',
                            color: 'var(--accent)',
                            borderRadius: '8px',
                            padding: '8px 16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer' 
                          }}
                          className="w-full text-center uppercase tracking-wider font-sans hover:bg-[var(--accent-muted)] transition-all"
                        >
                          ＋ ADD EXIT RULE
                        </button>
                      ) : (
                        <p className="text-center text-xs py-2.5 italic font-mono border rounded-xl" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                          Maximum 10 exit rules reached.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* BOTTOM SAVE ACTION CARD */}
                  <div className="pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving || !name.trim() || !typeOfStrategy}
                      style={{
                        backgroundColor: saving || !name.trim() || !typeOfStrategy ? 'var(--border)' : 'var(--accent)',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '14px',
                        fontSize: '14px',
                        fontWeight: '600',
                        width: '100%',
                        cursor: saving || !name.trim() || !typeOfStrategy ? 'not-allowed' : 'pointer',
                        border: 'none'
                      }}
                      className="hover:opacity-90 transition-all font-display shadow-lg flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Saving Strategy...</span>
                        </>
                      ) : (
                        <span>Save Strategy</span>
                      )}
                    </button>
                  </div>

                </div>

                {/* RIGHT WORKSPACE: SPANS 1 COL */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* CARD 4: REFERENCE IMAGES */}
                  <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }} className="relative overflow-hidden font-sans">
                    <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h2 style={{ color: 'var(--text)' }} className="text-lg font-bold font-display">Reference Images</h2>
                        <p style={{ color: 'var(--text)' }} className="text-xs mt-0.5">
                          Screenshots showing ideal examples.
                        </p>
                      </div>
                      <span style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text)' }} className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
                        {currentCount} / 10
                      </span>
                    </div>

                    {/* DRAG AND DROP ZONE */}
                    {currentCount < 10 ? (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileBrowser}
                        style={{
                          backgroundColor: dragActive ? 'rgba(6, 182, 212, 0.05)' : 'var(--bar)',
                          border: dragActive ? '1.5px dashed var(--accent)' : '1.5px dashed var(--border)',
                          borderRadius: '10px',
                          padding: '32px',
                          cursor: 'pointer'
                        }}
                        className="mt-4 text-center transition-all hover:border-[var(--accent)]"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleChange}
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                        />
                        <ImagePlus className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                        <p style={{ color: 'var(--text)' }} className="text-xs font-semibold">Drag & drop screenshots</p>
                        <p style={{ color: 'var(--accent)' }} className="text-xs font-semibold underline mt-1">or click to browse</p>
                        <p style={{ color: 'var(--text-muted)' }} className="text-[10px] mt-2 font-mono">
                          JPG · PNG · WEBP · Max 5MB each
                        </p>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)', color: 'var(--text-muted)' }} className="mt-4 rounded-xl p-4 text-center text-xs">
                        10/10 images — maximum reached
                      </div>
                    )}

                    {/* IMAGES GRID */}
                    {currentCount > 0 && (
                      <div className="grid grid-cols-2 gap-2.5 mt-4">
                        {/* EXISTING IMAGES */}
                        {existingImages
                          .filter((url) => !markedForDeletion.includes(url))
                          .map((url, index) => (
                            <div 
                              key={`exist-${index}`} 
                              className="group relative aspect-square rounded-xl border overflow-hidden"
                              style={{ borderColor: 'var(--border)', cursor: 'pointer', backgroundColor: 'var(--bg)' }}
                              onClick={() => setLightboxImage(url)}
                            >
                              <img
                                src={url}
                                alt={`Screenshot reference #${index + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                              />
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(url);
                                  }}
                                  className="text-white rounded-xl p-2.5 transition-all shadow-md cursor-pointer hover:scale-105"
                                  style={{ backgroundColor: 'var(--accent)' }}
                                  title="Expand image"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeExistingImage(url);
                                  }}
                                  className="text-white rounded-xl p-2.5 transition-all shadow-md cursor-pointer hover:scale-105"
                                  style={{ backgroundColor: '#DF1C30' }}
                                  title="Delete screenshot"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}

                        {/* STAGED PENDING UPLOADS */}
                        {pendingUploads.map((item) => (
                          <div 
                            key={item.id} 
                            className="group relative aspect-square rounded-xl border overflow-hidden"
                            style={{ borderColor: 'var(--border)', cursor: 'pointer', backgroundColor: 'var(--bg)' }}
                            onClick={() => setLightboxImage(item.preview)}
                          >
                            <img
                              src={item.preview}
                              alt="Screenshot upload stage preview"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                            />
                            {/* Badging for pending staged file */}
                            <span className="absolute top-1 left-1 text-[9px] font-mono font-medium rounded-md px-1.5 py-0.5 text-white tracking-wide border" style={{ backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' }}>
                              Staged
                            </span>
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(item.preview);
                                }}
                                className="text-white rounded-xl p-2.5 transition-all shadow-md cursor-pointer hover:scale-105"
                                style={{ backgroundColor: 'var(--accent)' }}
                                title="Expand image"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePendingImage(item.id);
                                }}
                                className="text-white rounded-xl p-2.5 transition-all shadow-md cursor-pointer hover:scale-105"
                                style={{ backgroundColor: '#DF1C30' }}
                                title="Remove upload item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* CARD 5: PERFORMANCE STATS */}
                  {isEditMode && (
                    <section style={{ backgroundColor: 'var(--card)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '20px' }} className="relative overflow-hidden font-sans">
                      <h2 style={{ color: 'var(--text)', borderColor: 'var(--border)' }} className="text-lg font-bold border-b pb-3 font-display">
                        Performance Stats
                      </h2>
                      <p style={{ color: 'var(--text)' }} className="text-xs mt-2 pb-1">
                        Auto-calculated from your trade history logs.
                      </p>

                      {loadingStats ? (
                        <div className="space-y-3 mt-4">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-10 rounded-xl skeleton" />
                          ))}
                        </div>
                      ) : totalTradesCount === 0 ? (
                        <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="text-center py-6 mt-4 rounded-2xl">
                          <p style={{ color: 'var(--text-sub)' }} className="text-xs italic font-medium">
                            No trades logged for this strategy yet.
                          </p>
                          <p style={{ color: 'var(--text-muted)' }} className="text-[10px] max-w-[180px] mx-auto mt-2">
                            Stats will appear automatically after you log your first trade in Phase 3.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {/* Row 1 details */}
                          <div style={{ borderColor: 'var(--border)' }} className="grid grid-cols-3 gap-2 py-1.5 border-b">
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="text-center p-2.5 rounded-xl flex flex-col justify-center font-sans">
                              <span style={{ color: 'var(--text)' }} className="font-extrabold text-sm">{totalTradesCount}</span>
                              <span style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-widest font-bold mt-0.5">Trades</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="text-center p-2.5 rounded-xl flex flex-col justify-center font-sans">
                              <span className="font-extrabold text-sm" style={{ color: '#008F67' }}>+{winsCount}</span>
                              <span style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-widest font-bold mt-0.5">Wins</span>
                            </div>
                            <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="text-center p-2.5 rounded-xl flex flex-col justify-center font-sans">
                              <span className="font-extrabold text-sm" style={{ color: '#DF1C30' }}>{lossesCount > 0 ? `-${lossesCount}` : '0'}</span>
                              <span style={{ color: 'var(--text-muted)' }} className="text-[9px] uppercase tracking-widest font-bold mt-0.5">Losses</span>
                            </div>
                          </div>

                          {/* Stat items */}
                          <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-center py-2.5 border-b">
                            <span style={{ color: 'var(--text-sub)' }} className="text-xs font-medium font-sans">Win Rate</span>
                            <span className={`text-sm font-bold ${getWinRateColorClass(calculatedWinRate)}`} style={getWinRateColorStyle(calculatedWinRate)}>
                              {calculatedWinRate}%
                            </span>
                          </div>

                          <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-center py-2.5 border-b">
                            <span style={{ color: 'var(--text-sub)' }} className="text-xs font-medium">Breakevens</span>
                            <span style={{ color: 'var(--text)' }} className="text-sm font-bold">{breakevenCount}</span>
                          </div>

                          <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-center py-2.5 border-b">
                            <span style={{ color: 'var(--text-sub)' }} className="text-xs font-medium">Avg R-Multiple</span>
                            <span className="text-sm font-bold" style={{ color: getDeltaColor(calculatedAvgR) }}>
                              {calculatedAvgR > 0 ? '+' : ''}{calculatedAvgR.toFixed(1)}R
                            </span>
                          </div>

                          <div style={{ borderColor: 'var(--border)' }} className="flex justify-between items-center py-2.5 border-b">
                            <span style={{ color: 'var(--text-sub)' }} className="text-xs font-medium">Total P&L</span>
                            <span className="text-sm font-bold" style={{ color: getDeltaColor(calculatedPnL) }}>
                              {formatCurrency(calculatedPnL)}
                            </span>
                          </div>

                          {/* Split/Monthly Split Pattern */}
                          <div>
                            <span style={{ color: 'var(--text-sub)' }} className="text-[10px] font-bold uppercase tracking-widest block mt-4 mb-2">
                              Monthly Pattern
                            </span>
                            {hasEnoughSplitData ? (
                              <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="flex select-none items-center justify-between text-xs font-mono font-medium rounded-xl p-3">
                                <div className="text-center flex-1 font-sans">
                                  <div style={{ color: 'var(--text-sub)' }} className="text-[10px] font-semibold mb-0.5">1st Half (≤15th)</div>
                                  <div className={`font-bold ${getWinRateColorClass(firstHalfWinRate)}`} style={getWinRateColorStyle(firstHalfWinRate)}>
                                    {firstHalfWinRate}% Win Rate
                                  </div>
                                  <div style={{ color: 'var(--text-muted)' }} className="text-[9px] mt-0.5">{firstHalfTrades.length} Trades</div>
                                </div>
                                <div style={{ backgroundColor: 'var(--border)' }} className="w-px h-8 shrink-0" />
                                <div className="text-center flex-1 font-sans">
                                  <div style={{ color: 'var(--text-sub)' }} className="text-[10px] font-semibold mb-0.5">2nd Half (&gt;15th)</div>
                                  <div className={`font-bold ${getWinRateColorClass(secondHalfWinRate)}`} style={getWinRateColorStyle(secondHalfWinRate)}>
                                    {secondHalfWinRate}% Win Rate
                                  </div>
                                  <div style={{ color: 'var(--text-muted)' }} className="text-[9px] mt-0.5">{secondHalfTrades.length} Trades</div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ backgroundColor: 'var(--bar)', border: '0.5px solid var(--border)' }} className="p-3 rounded-xl text-center">
                                <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-light italic">
                                  — Not enough data for bi-weekly split (needs 5+ per half)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                </div>

              </div>

            </div>
          </main>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Strategy?"
      >
        <div className="text-center pt-2">
          <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
          </div>
          
          <h3 className="text-zinc-100 text-base font-semibold">
            Are you sure you want to delete this?
          </h3>
          
          <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
            You are about to delete <strong className="text-zinc-100 font-semibold">"{name || 'this strategy'}"</strong>. 
            This will permanently remove the strategy and all associated rules. 
            This operation is irreversible.
          </p>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={saving}
              className="flex-1 bg-transparent hover:bg-zinc-850 text-zinc-300 border border-zinc-800 rounded-xl px-4 py-2.5 font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteFromEditMode}
              disabled={saving}
              className="flex-1 bg-red-650 hover:bg-red-700 text-white rounded-xl px-4 py-2.5 font-semibold transition-all shadow-lg shadow-red-950/25 cursor-pointer"
            >
              Delete Strategy
            </button>
          </div>
        </div>
      </Modal>

      {/* LIGHTBOX OVERLAY */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Close button with circular background */}
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 cursor-pointer border border-white/20 transition-all shadow-lg hover:scale-105"
            aria-label="Close preview"
            title="Close preview (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-full max-h-full flex items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Reference Full Size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
};
