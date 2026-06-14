import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import { StrategyCard, Strategy } from '../components/StrategyCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { Modal } from '../components/Modal';
import { Menu, Target, AlertTriangle, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export const StrategiesPage: React.FC = () => {
  const { user, userId, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Modal States
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // Fetch count of rules/logs to display inside the delete confirmation modal
  const [rulesToDeleteCount, setRulesToDeleteCount] = useState<number>(0);

  // Fetch user strategies on load
  useEffect(() => {
    let mounted = true;
    if (!userId) return;

    const fetchStrategies = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('strategies')
          .select('*')
          .eq('user_id', userId)
          .order('sr_no', { ascending: true });

        if (error) {
          throw error;
        }

        if (mounted && data) {
          setStrategies(data as Strategy[]);
        }
      } catch (err: any) {
        console.error('Error loading strategies:', err);
        showError(err.message || 'Error occurred while loading strategies.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStrategies();
    return () => {
      mounted = false;
    };
  }, [userId]);

  // Handle Fetching count for safety prompt on delete
  useEffect(() => {
    if (!selectedStrategy || !userId) return;

    const fetchRulesCount = async () => {
      try {
        const { data, error } = await supabase
          .from('strategy_rules')
          .select('id', { count: 'exact', head: true })
          .eq('strategy_id', selectedStrategy.id)
          .eq('user_id', userId);
        
        if (error) throw error;
        setRulesToDeleteCount(data ? data.length : 0);
      } catch (err) {
        console.warn('Could not load rule counts', err);
        setRulesToDeleteCount(0);
      }
    };

    fetchRulesCount();
  }, [selectedStrategy, userId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle action triggers from child StrategyCard
  const handleOpenStatusModal = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setStatusModalOpen(true);
  };

  const handleOpenDeleteModal = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setDeleteModalOpen(true);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedStrategy || !userId) return;

    try {
      const { error } = await supabase
        .from('strategies')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStrategy.id)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess(`Strategy status set to '${newStatus.replace('_', ' ')}'`);
      setStrategies((prev) =>
        prev.map((s) => (s.id === selectedStrategy.id ? { ...s, status: newStatus, updated_at: new Date().toISOString() } : s))
      );
      setStatusModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteStrategy = async () => {
    if (!selectedStrategy || !userId) return;

    try {
      // 1. Delete associated reference images from storage bucket
      if (selectedStrategy.reference_images && selectedStrategy.reference_images.length > 0) {
        const paths = selectedStrategy.reference_images
          .map((url) => {
            const splitMatch = url.split('/trade-media/');
            return splitMatch.length > 1 ? splitMatch[1] : null;
          })
          .filter((p): p is string => p !== null);

        if (paths.length > 0) {
          const { error: storageErr } = await supabase.storage.from('trade-media').remove(paths);
          if (storageErr) {
            console.warn('Storage removal noticed message:', storageErr);
          }
        }
      }

      // 2. Perform DB deletion on strategies (strategy_rules will cascade delete)
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', selectedStrategy.id)
        .eq('user_id', userId);

      if (error) throw error;

      showSuccess('Strategy deleted.');
      setStrategies((prev) => prev.filter((s) => s.id !== selectedStrategy.id));
      setDeleteModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Error occurred while deleting strategy.');
    }
  };

  // Status Filter options
  const statusFilterOptions = ['All', 'Active', 'Not Working', 'Retired'];
  const typeFilterOptions = ['All', 'Breakout', 'Reversal', 'Neutral'];

  // Filter application
  const filteredStrategies = strategies.filter((s) => {
    // Status translation mapping
    const mappedStatus = s.status === 'active' 
      ? 'Active' 
      : s.status === 'not_working' 
      ? 'Not Working' 
      : s.status === 'retired' 
      ? 'Retired' 
      : s.status;
      
    const matchStatus = statusFilter === 'All' || mappedStatus === statusFilter;
    const matchType = typeFilter === 'All' || s.type_of_strategy === typeFilter;

    return matchStatus && matchType;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE MAIN CONTAINER */}
      <div className="flex-1 md:pl-[250px] flex flex-col min-h-screen">
        {/* MOBILE HEADER BAR */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 md:hidden bg-zinc-900 sticky top-0 z-20">
          <div className="text-xl font-bold text-indigo-400 tracking-wider font-display">TRADELYZE</div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* INNER VIEW CONTENT */}
        <main className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* PAGE HEADER ROW */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100 font-display">My Strategies</h1>
                <p className="text-sm text-zinc-400 mt-1">
                  Build your setup library — define your rules — track your edge.
                </p>
              </div>
              <div>
                <Link
                  to="/strategies/new"
                  className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-4 py-2.5 text-sm transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 shadow-lg shadow-white/5 font-display"
                >
                  <span>+ Add New Strategy</span>
                </Link>
              </div>
            </div>

            <div className="border-b border-zinc-800 mt-5 mb-6" />

            {/* FILTER BAR SECTION */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6 space-y-4">
              {/* STATUS FILTER */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-16 font-mono">Status:</span>
                <div className="flex items-center flex-wrap gap-1.5">
                  {statusFilterOptions.map((opt) => {
                    const active = statusFilter === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setStatusFilter(opt)}
                        className={`text-xs rounded-xl px-4 py-2 font-medium transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TYPE FILTER */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-16 font-mono">Type:</span>
                <div className="flex items-center flex-wrap gap-1.5">
                  {typeFilterOptions.map((opt) => {
                    const active = typeFilter === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => setTypeFilter(opt)}
                        className={`text-xs rounded-xl px-4 py-2 font-medium transition-all duration-150 cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STRATEGIES DRAW VIEWS */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredStrategies.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-8 flex flex-col items-center shadow-xl">
                <div className="bg-indigo-500/10 border border-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
                  <Target className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-zinc-200 font-display">No strategies yet</h3>
                <p className="text-zinc-500 text-sm mt-2 max-w-sm">
                  {strategies.length === 0
                    ? 'Add your first setup to start tracking your trading edge.'
                    : 'No setups match your selected status and type filters. Try adjusting them.'}
                </p>
                {strategies.length === 0 && (
                  <Link
                    to="/strategies/new"
                    className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-all duration-150 shadow-lg shadow-indigo-600/20"
                  >
                    + Add New Strategy
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStrategies.map((strategy) => (
                  <StrategyCard
                    key={strategy.id}
                    strategy={strategy}
                    userId={userId ?? ''}
                    onChangeStatusClick={handleOpenStatusModal}
                    onDeleteClick={handleOpenDeleteModal}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CHANGE STATUS MODAL */}
      {selectedStrategy && (
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          title="Change Status"
        >
          <div className="space-y-4 pt-1">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">
              Strategy: {selectedStrategy.name}
            </span>
            
            <div className="space-y-2.5">
              {/* ACTIVE STATUS BUTTON */}
              <button
                onClick={() => handleStatusChange('active')}
                className={`w-full text-left py-3 px-4 rounded-lg border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'active'
                    ? 'bg-green-950/40 border-green-700 text-green-400'
                    : 'border-[#2A2D3A] text-gray-400 hover:bg-green-950/20 hover:border-green-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span>● Set Active</span>
                </span>
                {selectedStrategy.status === 'active' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              </button>

              {/* NOT WORKING WELL BUTTON */}
              <button
                onClick={() => handleStatusChange('not_working')}
                className={`w-full text-left py-3 px-4 rounded-lg border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'not_working'
                    ? 'bg-amber-950/40 border-amber-700 text-amber-400'
                    : 'border-[#2A2D3A] text-gray-400 hover:bg-amber-950/20 hover:border-amber-800'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚠</span>
                  <span>⚠ Set Not Working Well</span>
                </span>
                {selectedStrategy.status === 'not_working' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </button>

              {/* RETIRED STATUS BUTTON */}
              <button
                onClick={() => handleStatusChange('retired')}
                className={`w-full text-left py-3 px-4 rounded-lg border text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                  selectedStrategy.status === 'retired'
                    ? 'bg-gray-800/40 border-gray-600 text-gray-400'
                    : 'border-[#2A2D3A] text-gray-400 hover:bg-gray-800/20 hover:border-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">—</span>
                  <span>— Set Retired</span>
                </span>
                {selectedStrategy.status === 'retired' && <CheckCircle2 className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
            
            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setStatusModalOpen(false)}
                className="bg-transparent hover:bg-[#2A2D3A] text-gray-300 border border-[#2A2D3A] rounded-lg px-4 py-2 text-sm transition-all cursor-pointer font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {selectedStrategy && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Delete Strategy?"
        >
          <div className="text-center pt-2">
            <div className="bg-red-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            
            <p className="text-gray-200 text-base font-semibold">
              Are you sure you want to delete this?
            </p>
            
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">
              You are about to delete <strong className="text-gray-100 font-semibold">"{selectedStrategy.name}"</strong>. 
              This will permanently remove the strategy and all {rulesToDeleteCount || ''} entry/exit rules. 
              Your trade logs that used this strategy will <strong className="text-indigo-400 font-semibold">NOT</strong> be deleted.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 bg-transparent hover:bg-[#2A2D3A] text-gray-300 border border-[#2A2D3A] rounded-lg px-4 py-2 font-medium transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStrategy}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium transition-all duration-200 cursor-pointer shadow-lg shadow-red-950/20"
              >
                Delete Strategy
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
