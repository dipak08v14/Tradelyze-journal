import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Sidebar } from '../components/Sidebar';
import {
  Menu,
  Plus,
  MoreHorizontal,
  Folder,
  Trash2,
  Tag,
  FilePlus,
  ArrowUpDown,
  BookOpen,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  HelpCircle,
  FileText,
  RotateCcw,
  CheckSquare,
  Square,
  Search,
  X,
  Calendar
} from 'lucide-react';

interface FolderItem {
  id: string;
  name: string;
  color: string;
  created_at: string;
  user_id: string;
}

interface EntryItem {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  tags: string[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  log_date?: string | null;
}

const SWATCHES = [
  '#e2e8f0', '#64748b', '#6366f1', '#3b82f6', '#06b6d4',
  '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899'
];

export function Notebook() {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [dateFromDashboard, setDateFromDashboard] = useState<string | null>(null);

  // States
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [allEntries, setAllEntries] = useState<EntryItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'TRASH'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Clear dateFromDashboard when an active note is selected
  useEffect(() => {
    if (activeNoteId) {
      setDateFromDashboard(null);
    }
  }, [activeNoteId]);

  // Search feature state
  const [searchQuery, setSearchQuery] = useState('');

  // Hover states for enhanced visual styling
  const [isAddFolderHovered, setIsAddFolderHovered] = useState(false);
  const [isAllNotesHovered, setIsAllNotesHovered] = useState(false);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [hoveredTagName, setHoveredTagName] = useState<string | null>(null);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

  // Log Day feature states
  const [isLogDayModalOpen, setIsLogDayModalOpen] = useState(false);
  const [logDateInput, setLogDateInput] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });
  const [isCreatingLog, setIsCreatingLog] = useState(false);

  // Template states
  const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);

  // Note Checkboxes / Bulk selection
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Modals & Menu Actions
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'edit'>('create');
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderColorInput, setFolderColorInput] = useState('#06b6d4');
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);

  // Tag input state
  const [tagInput, setTagInput] = useState<string>('');

  // Date picker & Link trade date states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split('T')[0];
  });

  // Log Day confirmation dialog state
  const [logDayConfirmData, setLogDayConfirmData] = useState<{ count: number; date: string } | null>(null);

  // Helper bindings for custom tag implementation
  const fetchNotes = () => { fetchEntries(); };
  const setActiveNote = (note: EntryItem | null) => {
    if (!note) {
      setActiveNoteId(null);
      return;
    }
    setAllEntries((prev) =>
      prev.map((n) => (n.id === note.id ? note : n))
    );
  };

  // Save Indicator state
  const [titleSaving, setTitleSaving] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [hasSavedRecently, setHasSavedRecently] = useState(false);

  // Active note editors local visual copy to avoid cursor jumps
  const [localTitle, setLocalTitle] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Timeout Debounces
  const titleTimeoutRef = useRef<any>(null);
  const contentTimeoutRef = useRef<any>(null);

  // References for dropdown close click listener
  const folderMenuDropdownRef = useRef<HTMLDivElement>(null);

  // Check user details
  useEffect(() => {
    if (user?.id) {
      fetchFolders();
      fetchEntries();
    }
  }, [user]);

  // Click outside to dismiss folder menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (folderMenuDropdownRef.current && !folderMenuDropdownRef.current.contains(event.target as Node)) {
        setFolderMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch Folders
  const fetchFolders = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notebook_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err: any) {
      console.error('Error fetching folders:', err);
      showError('Failed to load notebook folders.');
    }
  };

  // Fetch Entries
  const fetchEntries = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      const loadedEntries = data || [];
      setAllEntries(loadedEntries);

      // Handle auto-open note logic from URL date parameter
      const dateParam = searchParams.get('date');
      if (dateParam) {
        const matchingNote = loadedEntries.find(n =>
          n.log_date && n.log_date.startsWith(dateParam)
        );
        if (matchingNote) {
          setActiveNoteId(matchingNote.id);
        } else {
          setDateFromDashboard(dateParam);
        }
        window.history.replaceState({}, '', '/notebook');
      }
    } catch (err: any) {
      console.error('Error fetching entries:', err);
      showError('Failed to load notebook notes.');
    }
  };

  // Group tags and compute counters across ALL user notes
  const tagsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allEntries.forEach((entry) => {
      if (!entry.is_deleted && entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) {
            counts[trimmed] = (counts[trimmed] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [allEntries]);

  // Non-deleted entries listed
  const filteredEntries = useMemo(() => {
    let result = [...allEntries];

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const isTrash = selectedFolderId === 'TRASH';
      result = result.filter((entry) => {
        const titleMatch = (entry.title || '').toLowerCase().includes(query);
        const contentMatch = (entry.content || '').toLowerCase().includes(query);
        return (titleMatch || contentMatch) && (entry.is_deleted === isTrash);
      });
      if (isTrash) {
        result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else {
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      return result;
    }

    if (selectedFolderId === 'TRASH') {
      result = result.filter((entry) => entry.is_deleted);
      result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else {
      result = result.filter((entry) => !entry.is_deleted);

      if (selectedFolderId !== 'ALL') {
        result = result.filter((entry) => entry.folder_id === selectedFolderId);
      }
      if (selectedTag) {
        result = result.filter((entry) => entry.tags && entry.tags.includes(selectedTag));
      }
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [allEntries, selectedFolderId, selectedTag, searchQuery]);

  // Group entries by log_date
  const groupedEntries = useMemo(() => {
    const withLogDate = filteredEntries.filter(entry => entry.log_date);
    const withoutLogDate = filteredEntries.filter(entry => !entry.log_date);

    const groupsMap: Record<string, EntryItem[]> = {};
    withLogDate.forEach(entry => {
      const date = entry.log_date as string;
      if (!groupsMap[date]) {
        groupsMap[date] = [];
      }
      groupsMap[date].push(entry);
    });

    Object.keys(groupsMap).forEach(date => {
      groupsMap[date].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

    const sortedDates = Object.keys(groupsMap).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      sortedDates,
      groupsMap,
      withoutLogDate
    };
  }, [filteredEntries]);

  // Identify active note
  const activeNote = useMemo(() => {
    return allEntries.find((entry) => entry.id === activeNoteId) || null;
  }, [allEntries, activeNoteId]);

  // Check if all filtered notes are selected for bulk action
  const isAllSelected = useMemo(() => {
    if (filteredEntries.length === 0) return false;
    return filteredEntries.every((entry) => selectedNoteIds.includes(entry.id));
  }, [filteredEntries, selectedNoteIds]);

  // Synchronize active note content editable and details (triggers when activeNoteId changes)
  useEffect(() => {
    if (activeNote) {
      setLocalTitle(activeNote.title || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = activeNote.content || '';
      }
      setTagInput('');
      setShowDatePicker(false);
    } else {
      setLocalTitle('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [activeNoteId]);

  // Handle Note List Change clean up selection
  useEffect(() => {
    setSelectedNoteIds([]);
  }, [selectedFolderId, selectedTag]);

  // Select/Deselect All Checkbox
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedNoteIds([]);
    } else {
      setSelectedNoteIds(filteredEntries.map((n) => n.id));
    }
  };

  const handleToggleSelectNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setSelectedNoteIds((prev) => {
      if (prev.includes(noteId)) {
        return prev.filter((id) => id !== noteId);
      } else {
        return [...prev, noteId];
      }
    });
  };

  // Add folder triggered
  const handleOpenAddFolderModal = () => {
    setFolderModalMode('create');
    setFolderNameInput('');
    setFolderColorInput('#06b6d4');
    setEditFolderId(null);
    setIsFolderModalOpen(true);
  };

  // Edit folder setup from popover
  const handleOpenRenameFolderModal = (e: React.MouseEvent, folder: FolderItem) => {
    e.stopPropagation();
    setFolderMenuId(null);
    setFolderModalMode('edit');
    setEditFolderId(folder.id);
    setFolderNameInput(folder.name);
    setFolderColorInput(folder.color || '#06b6d4');
    setIsFolderModalOpen(true);
  };

  // Submit create or edit folder modal
  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !folderNameInput.trim()) return;

    try {
      if (folderModalMode === 'create') {
        const { data, error } = await supabase
          .from('notebook_folders')
          .insert([{ name: folderNameInput.trim(), color: folderColorInput, user_id: user.id }])
          .select();

        if (error) throw error;
        showSuccess('Folder created successfully.');
        await fetchFolders();

        if (data && data[0]) {
          setSelectedFolderId(data[0].id);
          setSelectedTag(null);
        }
      } else if (folderModalMode === 'edit' && editFolderId) {
        const { error } = await supabase
          .from('notebook_folders')
          .update({ name: folderNameInput.trim(), color: folderColorInputRaw })
          .eq('id', editFolderId);

        if (error) throw error;
        showSuccess('Folder renamed successfully.');
        await fetchFolders();
      }
      setIsFolderModalOpen(false);
    } catch (err: any) {
      console.error('Error saving folder:', err);
      showError('Failed to save folder details.');
    }
  };

  const folderColorInputRaw = useMemo(() => folderColorInput, [folderColorInput]);

  // Delete folder from database
  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setFolderMenuId(null);
    if (!confirm('Are you sure you want to delete this folder? Your notes in this folder will not be deleted; they will be moved to "All notes".')) return;

    try {
      // 1. Move notes in this folder to null folder
      await supabase
        .from('notebook_entries')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      // 2. Delete the folder
      const { error } = await supabase
        .from('notebook_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
      showSuccess('Folder deleted successfully.');

      // Adjust views if the deleted folder was active
      if (selectedFolderId === folderId) {
        setSelectedFolderId('ALL');
      }

      await fetchFolders();
      await fetchEntries();
    } catch (err: any) {
      console.error('Error deleting folder:', err);
      showError('Failed to delete folder.');
    }
  };

  // Create New Note
  const handleCreateNote = async () => {
    if (!user?.id) return;
    try {
      // If we are currently inside a specific custom folder, file this new note into that folder automatically!
      const activeFolder = (selectedFolderId !== 'ALL' && selectedFolderId !== 'TRASH') ? selectedFolderId : null;

      const newNotePayload = {
        user_id: user.id,
        folder_id: activeFolder,
        title: 'Untitled',
        content: '',
        tags: [],
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notebook_entries')
        .insert([newNotePayload])
        .select();

      if (error) throw error;
      showSuccess('Created a new note.');
      await fetchEntries();

      if (data && data[0]) {
        setActiveNoteId(data[0].id);
        // Focus the title input using browser micro-tick
        setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
        }, 100);
      }
    } catch (err: any) {
      console.error('Error creating note:', err);
      showError('Failed to create new note.');
    }
  };

  // Debounced note title update
  const triggerTitleSave = (newTitle: string) => {
    if (!activeNoteId) return;
    setTitleSaving(true);
    setHasSavedRecently(true);

    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);

    titleTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('notebook_entries')
          .update({ title: newTitle.trim(), updated_at: new Date().toISOString() })
          .eq('id', activeNoteId);

        if (error) throw error;
        
        // Update local memory list instantly to prevent stutter
        setAllEntries((prev) =>
          prev.map((item) =>
            item.id === activeNoteId
              ? { ...item, title: newTitle.trim(), updated_at: new Date().toISOString() }
              : item
          )
        );
      } catch (err) {
        console.error('Error updating title:', err);
      } finally {
        setTitleSaving(false);
      }
    }, 1000);
  };

  // Debounced note content update
  const triggerContentSave = (newContent: string) => {
    if (!activeNoteId) return;
    setContentSaving(true);
    setHasSavedRecently(true);

    if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);

    contentTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('notebook_entries')
          .update({ content: newContent, updated_at: new Date().toISOString() })
          .eq('id', activeNoteId);

        if (error) throw error;

        setAllEntries((prev) =>
          prev.map((item) =>
            item.id === activeNoteId
              ? { ...item, content: newContent, updated_at: new Date().toISOString() }
              : item
          )
        );
      } catch (err) {
        console.error('Error updating content:', err);
      } finally {
        setContentSaving(false);
      }
    }, 1000);
  };

  // Format Helper trigger
  const triggerFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      triggerContentSave(editorRef.current.innerHTML);
    }
  };

  // Link format prompt
  const triggerLinkFormat = () => {
    const url = prompt('Enter the link destination URL:');
    if (url) {
      triggerFormat('createLink', url);
    }
  };

  // Soft delete active note in editor
  const handleDeleteNote = async () => {
    if (!activeNoteId) return;
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', activeNoteId);

      if (error) throw error;
      showSuccess('Moved note to Recently Deleted.');

      setAllEntries((prev) =>
        prev.map((n) => (n.id === activeNoteId ? { ...n, is_deleted: true, updated_at: new Date().toISOString() } : n))
      );
      setActiveNoteId(null);
    } catch (err: any) {
      console.error('Error deleting note:', err);
      showError('Failed to delete note.');
    }
  };

  // Restore note per item in Panel 2
  const handleRestoreNoteItem = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) throw error;
      showSuccess('Note restored.');

      setAllEntries((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, is_deleted: false, updated_at: new Date().toISOString() } : n))
      );
    } catch (err: any) {
      console.error('Error restoring note:', err);
      showError('Failed to restore note.');
    }
  };

  // Bulk Delete Selected
  const handleBulkDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    const confirmMsg = `Are you sure you want to move ${selectedNoteIds.length} selected note(s) to Recently Deleted?`;
    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .in('id', selectedNoteIds);

      if (error) throw error;
      showSuccess(`Moved ${selectedNoteIds.length} note(s) to Recently Deleted.`);

      setAllEntries((prev) =>
        prev.map((n) => (selectedNoteIds.includes(n.id) ? { ...n, is_deleted: true, updated_at: new Date().toISOString() } : n))
      );
      if (activeNoteId && selectedNoteIds.includes(activeNoteId)) {
        setActiveNoteId(null);
      }
      setSelectedNoteIds([]);
    } catch (err) {
      console.error('Bulk delete error:', err);
      showError('Failed to perform bulk deletion.');
    }
  };

  // Bulk Permanent Delete Selected (if in Trash view)
  const handleBulkPermanentDelete = async () => {
    if (selectedNoteIds.length === 0) return;
    const confirmMsg = `Are you sure you want to PERMANENTLY delete ${selectedNoteIds.length} selected note(s)? This action is irreversible!`;
    if (!confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('notebook_entries')
        .delete()
        .in('id', selectedNoteIds);

      if (error) throw error;
      showSuccess(`Deleted ${selectedNoteIds.length} notes permanently.`);

      setAllEntries((prev) => prev.filter((n) => !selectedNoteIds.includes(n.id)));
      if (activeNoteId && selectedNoteIds.includes(activeNoteId)) {
        setActiveNoteId(null);
      }
      setSelectedNoteIds([]);
    } catch (err) {
      console.error('Permanently deleting error:', err);
      showError('Failed to permanently delete notes.');
    }
  };

  // Bulk Restore Selected
  const handleBulkRestore = async () => {
    if (selectedNoteIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .in('id', selectedNoteIds);

      if (error) throw error;
      showSuccess(`Restored ${selectedNoteIds.length} note(s).`);

      setAllEntries((prev) =>
        prev.map((n) => (selectedNoteIds.includes(n.id) ? { ...n, is_deleted: false, updated_at: new Date().toISOString() } : n))
      );
      setSelectedNoteIds([]);
    } catch (err) {
      console.error('Bulk restore error:', err);
      showError('Failed to perform bulk restoration.');
    }
  };

  // Tag input onKeyDown handler
  const handleTagKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!newTag || !activeNote) return;
      if (activeNote.tags?.includes(newTag)) { setTagInput(''); return; }
      const updatedTags = [...(activeNote.tags || []), newTag];
      setTagInput('');
      setActiveNote({ ...activeNote, tags: updatedTags });
      await supabase.from('notebook_entries')
        .update({ tags: updatedTags, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id);
      fetchNotes();
    }
    if (e.key === 'Backspace' && tagInput === '' && activeNote.tags?.length > 0) {
      const updatedTags = activeNote.tags.slice(0, -1);
      setActiveNote({ ...activeNote, tags: updatedTags });
      await supabase.from('notebook_entries')
        .update({ tags: updatedTags, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id);
      fetchNotes();
    }
  };

  // Remove tag (×) handler
  const removeTag = async (tagToRemove: string) => {
    const updatedTags = (activeNote.tags || []).filter(t => t !== tagToRemove);
    setActiveNote({ ...activeNote, tags: updatedTags });
    await supabase.from('notebook_entries')
      .update({ tags: updatedTags, updated_at: new Date().toISOString() })
      .eq('id', activeNote.id);
    fetchNotes();
  };

  const formatLogDateLabel = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleRemoveTradeDate = async () => {
    if (!activeNote) return;
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ log_date: null, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id);
      if (error) throw error;
      setActiveNote({ ...activeNote, log_date: null });
      fetchNotes();
      showSuccess('Trade date removed.');
    } catch (err) {
      console.error(err);
      showError('Failed to remove trade date.');
    }
  };

  const handleConfirmTradeDate = async () => {
    if (!activeNote) return;
    try {
      const { error } = await supabase
        .from('notebook_entries')
        .update({ log_date: selectedLogDate, updated_at: new Date().toISOString() })
        .eq('id', activeNote.id);
      if (error) throw error;
      setActiveNote({ ...activeNote, log_date: selectedLogDate });
      fetchNotes();
      setShowDatePicker(false);
      showSuccess('Linked to trading day.');
    } catch (err) {
      console.error(err);
      showError('Failed to set trade date.');
    }
  };

  // Helper to determine if contentEditable editor is essentially empty
  const isContentEmpty = (content: string | undefined | null) => {
    if (!content) return true;
    const cleanText = content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
    return cleanText === '';
  };

  // Click handler to apply preselected built-in templates
  const handleApplyTemplate = (templateHtml: string) => {
    if (!activeNoteId) return;

    const editorHtml = editorRef.current?.innerHTML || '';
    const isEmpty = isContentEmpty(editorHtml);

    if (isEmpty || window.confirm('Replace current content?')) {
      if (editorRef.current) {
        editorRef.current.innerHTML = templateHtml;
      }
      triggerContentSave(templateHtml);
    }
  };

  // Local helper for formatting INR standard currency output
  const formatPnl = (val: number | null) => {
    if (val === null || val === undefined) return '₹0';
    const isNeg = val < 0;
    const formatted = Math.round(Math.abs(val)).toLocaleString('en-IN');
    return isNeg ? `-₹${formatted}` : `₹${formatted}`;
  };

  // Handler to fetch trade details and create pre-filled Log Day entry
  const handleCreateLog = async (bypassExistsCheck: boolean = false) => {
    if (!user?.id) return;

    if (!bypassExistsCheck) {
      const existingEntriesCount = allEntries.filter(
        (entry) => !entry.is_deleted && entry.log_date === logDateInput
      ).length;

      if (existingEntriesCount > 0) {
        setLogDayConfirmData({ count: existingEntriesCount, date: logDateInput });
        return;
      }
    }

    setIsCreatingLog(true);
    try {
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*, strategies(name)')
        .eq('user_id', user.id)
        .eq('date', logDateInput);

      if (tradesError) throw tradesError;

      const tradesList: any[] = tradesData || [];

      let netPnl = 0;
      let totalTrades = tradesList.length;
      let winners = 0;
      let losers = 0;
      let bestPnl = -Infinity;
      let worstPnl = Infinity;
      let bestTradeSymbol = 'N/A';
      let worstTradeSymbol = 'N/A';

      tradesList.forEach((t) => {
        const p = t.pnl || 0;
        netPnl += p;
        
        const statusClean = t.status ? t.status.toLowerCase() : '';
        if (statusClean === 'win') {
          winners++;
        } else if (statusClean === 'loss') {
          losers++;
        }

        if (p > bestPnl) {
          bestPnl = p;
          bestTradeSymbol = t.symbol || 'N/A';
        }
        if (p < worstPnl) {
          worstPnl = p;
          worstTradeSymbol = t.symbol || 'N/A';
        }
      });

      const winRate = totalTrades > 0 ? (winners / totalTrades) * 100 : 0;

      let tradeNotesStr = '';
      if (tradesList.length > 0) {
        tradesList.forEach((t) => {
          const direct = t.direction || 'LONG';
          const pVal = t.pnl || 0;
          const stat = t.status || 'Breakeven';
          tradeNotesStr += `• ${t.symbol} ${direct} → ${formatPnl(pVal)} (${stat})\n`;
        });
      } else {
        tradeNotesStr = 'No trades on this date\n';
      }

      const dateParts = logDateInput.split('-');
      const parsedDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const dayOfWeek = daysOfWeek[parsedDate.getDay()];
      const monthName = monthsOfYear[parsedDate.getMonth()];
      const dayOfMonth = dateParts[2];
      const yearVal = dateParts[0];

      const noteTitle = `${dayOfWeek}, ${monthName} ${dayOfMonth} ${yearVal}`;
      const formattedNetPnl = formatPnl(netPnl);

      const prefilledBody = `--- NET P&L: [${formattedNetPnl}] | TRADES: [${totalTrades}] | WIN RATE: [${winRate.toFixed(0)}%] ---\n\nPRE-MARKET PLAN:\n\n\nWHAT HAPPENED TODAY:\n\n\nWHAT I DID WELL:\n\n\nWHAT TO IMPROVE:\n\n\nTRADE NOTES:\n${tradeNotesStr}\n\nTOMORROW'S FOCUS:\n`;
      const htmlBody = prefilledBody.replace(/\n/g, '<br />');

      const { data: newEntryData, error: insertError } = await supabase
        .from('notebook_entries')
        .insert([{
          user_id: user.id,
          folder_id: null,
          title: noteTitle,
          content: htmlBody,
          tags: ['Log Day'],
          is_deleted: false,
          log_date: logDateInput,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (insertError) throw insertError;

      showSuccess('Created log day note successfully.');
      setIsLogDayModalOpen(false);

      await fetchEntries();

      if (newEntryData && newEntryData[0]) {
        setSelectedFolderId('ALL');
        setSelectedTag(null);
        setActiveNoteId(newEntryData[0].id);
      }
    } catch (err: any) {
      console.error('Error creating Log Day note:', err);
      showError(err.message || 'Failed to create log day.');
    } finally {
      setIsCreatingLog(false);
    }
  };

  // Datetime helper inside panel 3
  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  // Date helper inside notes list panel 2
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // UI styling helpers
  const getFolderColorDot = (color: string | undefined | null) => {
    return color || '#06b6d4';
  };

  // Render note item helper for grouped and other lists
  const renderNoteItem = (note: EntryItem) => {
    const isActive = activeNoteId === note.id;
    const isChecked = selectedNoteIds.includes(note.id);
    const isHovered = hoveredEntryId === note.id;

    return (
      <div
        key={note.id}
        onClick={() => setActiveNoteId(note.id)}
        className="group transition-all relative flex items-start gap-3"
        style={{
          backgroundColor: isActive ? 'var(--accent-muted)' : (isHovered ? 'rgba(0,0,0,0.025)' : 'transparent'),
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          padding: '10px 12px',
          cursor: 'pointer'
        }}
        onMouseEnter={() => setHoveredEntryId(note.id)}
        onMouseLeave={() => setHoveredEntryId(null)}
      >
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => handleToggleSelectNote(e, note.id)}
          className="mt-0.5 text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 cursor-pointer bg-transparent border-none p-0"
        >
          {isChecked ? (
            <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1 w-full">
            {/* Title */}
            <span
              className="tracking-tight truncate flex-1 flex items-center gap-1.5"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: isActive ? 'var(--accent)' : 'var(--text)'
              }}
            >
              {note.log_date && (
                <Calendar className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
              )}
              {note.title && note.title.trim() !== '' ? note.title : 'Untitled'}
            </span>
            
            {/* Folder Color indicator dot if All Notes is active */}
            {selectedFolderId === 'ALL' && note.folder_id && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: getFolderColorDot(
                    folders.find((f) => f.id === note.folder_id)?.color
                  )
                }}
                title={folders.find((f) => f.id === note.folder_id)?.name}
              />
            )}
          </div>

          {/* Content text snippet */}
          <p
            className="font-sans leading-relaxed"
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {note.content && note.content.trim() !== ''
              ? note.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ') // remove HTML tags
              : 'No content...'}
          </p>

          <div className="flex items-center justify-between mt-1">
            {/* Date */}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">
              {formatDate(note.created_at)}
            </span>

            {/* Restore button if in trash */}
            {selectedFolderId === 'TRASH' && (
              <button
                type="button"
                onClick={(e) => handleRestoreNoteItem(e, note.id)}
                className="px-2 py-0.5 text-[10px] font-mono font-bold text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded cursor-pointer transition-colors"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="notebook-page-layout" className="min-h-screen w-full flex flex-col md:flex-row md:items-start font-sans font-medium select-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* SIDEBAR NAVIGATION */}
      <Sidebar userEmail={user?.email ?? ''} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* RIGHT SIDE CONTAINER */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        
        {/* MOBILE HEADER BAR */}
        <header
          id="notebook-mobile-header"
          className="flex items-center justify-between px-6 py-4 md:hidden sticky top-0 z-20 shrink-0"
          style={{ backgroundColor: 'var(--topbar)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="text-xl font-bold tracking-wider font-display animate-none" style={{ color: 'var(--accent)' }}>TRADELYZE</div>
          <button
            id="notebook-btn-mobile-toggle"
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-1 bg-transparent border-none cursor-pointer"
            style={{ color: 'var(--text)' }}
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* THREE PANEL GRID CONTAINER */}
        <div id="notebook-three-panels" className="flex-1 flex flex-row overflow-hidden w-full h-full">

          {/* PANEL 1: FOLDERS (220px) */}
          <aside
            id="notebook-panel-folders"
            className="w-[220px] shrink-0 h-full overflow-y-auto flex flex-col justify-between p-4 flex-shrink-0"
            style={{ borderRight: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
          >
            <div>
              {/* Add folder full width */}
              <button
                id="notebook-btn-add-folder"
                type="button"
                onClick={handleOpenAddFolderModal}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 transition-colors cursor-pointer"
                style={{
                  background: 'transparent',
                  border: isAddFolderHovered ? '1px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  color: isAddFolderHovered ? 'var(--accent)' : 'var(--text-sub)',
                  fontSize: '13px',
                  fontWeight: 500
                }}
                onMouseEnter={() => setIsAddFolderHovered(true)}
                onMouseLeave={() => setIsAddFolderHovered(false)}
              >
                <Plus className="w-3.5 h-3.5" />
                ADD FOLDER
              </button>

              {/* FOLDERS Label */}
              <div
                id="notebook-lbl-folders"
                className="mb-2 mt-5"
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)'
                }}
              >
                FOLDERS
              </div>

              {/* Special row: All notes */}
              <div className="space-y-0.5">
                <button
                  id="notebook-folder-all"
                  type="button"
                  onClick={() => {
                    setSelectedFolderId('ALL');
                    setSelectedTag(null);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors text-left"
                  style={{
                    backgroundColor: selectedFolderId === 'ALL' ? 'var(--accent-muted)' : (isAllNotesHovered ? 'rgba(0,0,0,0.04)' : 'transparent'),
                    color: selectedFolderId === 'ALL' ? 'var(--accent)' : 'var(--text-sub)',
                    fontWeight: selectedFolderId === 'ALL' ? 600 : 400,
                    borderRadius: '8px'
                  }}
                  onMouseEnter={() => setIsAllNotesHovered(true)}
                  onMouseLeave={() => setIsAllNotesHovered(false)}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-sans font-medium">All notes</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono">
                    {allEntries.filter((entr) => !entr.is_deleted).length}
                  </span>
                </button>

                {/* Custom Folder Items */}
                {folders.map((folder) => {
                  const isActive = selectedFolderId === folder.id;
                  const isHovered = hoveredFolderId === folder.id;
                  const countInFolder = allEntries.filter((entr) => !entr.is_deleted && entr.folder_id === folder.id).length;

                  return (
                    <div
                      key={folder.id}
                      className="group relative flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--accent-muted)' : (isHovered ? 'rgba(0,0,0,0.04)' : 'transparent'),
                        color: isActive ? 'var(--accent)' : 'var(--text-sub)',
                        fontWeight: isActive ? 600 : 400,
                        borderRadius: '8px'
                      }}
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setSelectedTag(null);
                      }}
                      onMouseEnter={() => setHoveredFolderId(folder.id)}
                      onMouseLeave={() => setHoveredFolderId(null)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getFolderColorDot(folder.color) }} />
                        <span className="font-sans font-medium truncate" title={folder.name}>{folder.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* count */}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="font-mono group-hover:hidden">
                          {countInFolder}
                        </span>

                        {/* Hover ellipses ... */}
                        <div className="relative" ref={folderMenuId === folder.id ? folderMenuDropdownRef : null}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                            }}
                            className="p-0.5 rounded hover:bg-zinc-700/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                          </button>

                          {/* Ellipsis menu dropdown */}
                          {folderMenuId === folder.id && (
                            <div className="absolute top-5 right-0 mt-1 w-28 bg-[var(--card)] rounded-lg shadow-xl border border-[var(--border)] p-1 z-30 font-sans flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => handleOpenRenameFolderModal(e, folder)}
                                className="w-full text-left font-medium rounded px-2 py-1 text-xs text-zinc-350 hover:bg-[var(--bar)] hover:text-white cursor-pointer"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteFolder(e, folder.id)}
                                className="w-full text-left font-medium rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TAGS Label */}
              <div
                id="notebook-lbl-tags"
                className="mb-2 mt-6"
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)'
                }}
              >
                TAGS
              </div>

              {/* Tags List */}
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(tagsWithCounts).length === 0 ? (
                  <div className="text-[11px] font-sans font-medium text-zinc-500 italic px-1">
                    No tags logged
                  </div>
                ) : (
                  Object.entries(tagsWithCounts).map(([tagName, tagCount]) => {
                    const isTagActive = selectedTag === tagName;
                    const isTagHovered = hoveredTagName === tagName;
                    return (
                      <button
                        key={tagName}
                        type="button"
                        onClick={() => {
                          setSelectedTag(selectedTag === tagName ? null : tagName);
                        }}
                        className="inline-flex items-center gap-1 transition-all cursor-pointer animate-none"
                        style={{
                          background: isTagActive ? 'var(--accent-muted)' : 'var(--bg)',
                          border: isTagActive || isTagHovered ? '1px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: '20px',
                          fontSize: '11px',
                          color: isTagActive || isTagHovered ? 'var(--accent)' : 'var(--text-sub)',
                          padding: '2px 8px'
                        }}
                        onMouseEnter={() => setHoveredTagName(tagName)}
                        onMouseLeave={() => setHoveredTagName(null)}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>{tagName}</span>
                        <span className="font-mono text-[9px] text-zinc-500">({tagCount})</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Trash Panel */}
            <div className="pt-4 border-t border-[var(--border)] shrink-0">
              <button
                id="notebook-folder-trash"
                type="button"
                onClick={() => {
                  setSelectedFolderId('TRASH');
                  setSelectedTag(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-left"
                style={{
                  backgroundColor: selectedFolderId === 'TRASH' ? 'var(--accent-muted)' : 'transparent',
                  color: selectedFolderId === 'TRASH' ? 'var(--accent)' : (isTrashHovered ? '#ef4444' : 'var(--text-muted)'),
                  fontSize: '12px'
                }}
                onMouseEnter={() => setIsTrashHovered(true)}
                onMouseLeave={() => setIsTrashHovered(false)}
              >
                <Trash2 className="w-4 h-4" style={{ color: selectedFolderId === 'TRASH' ? 'var(--accent)' : (isTrashHovered ? '#ef4444' : 'var(--text-muted)') }} />
                <span className="font-sans font-medium">Recently Deleted</span>
                <span className="ml-auto font-mono text-[10px]" style={{ color: selectedFolderId === 'TRASH' ? 'var(--accent)' : (isTrashHovered ? '#ef4444' : 'var(--text-muted)') }}>
                  {allEntries.filter((entr) => entr.is_deleted).length}
                </span>
              </button>
            </div>
          </aside>

          {/* PANEL 2: NOTES LIST (280px) */}
          <section
            id="notebook-panel-notes"
            className="w-[280px] shrink-0 h-full overflow-y-auto flex flex-col justify-start flex-shrink-0"
            style={{ borderRight: '0.5px solid var(--border)', backgroundColor: 'var(--bg)' }}
          >
            {/* Search notes box - added above top row nav actions */}
            <div className="p-3 shrink-0 border-b border-[var(--border)]/40">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-8 py-2 bg-[var(--card)] border border-[var(--border)] rounded-[8px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 bg-transparent border-none cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Top Row Nav actions */}
            <div className="p-3 shrink-0 flex items-center justify-between gap-1" style={{ borderBottom: '0.5px solid var(--border)' }}>
              {selectedFolderId !== 'TRASH' ? (
                <div className="flex items-center gap-1.5">
                  <button
                    id="notebook-btn-new-note"
                    type="button"
                    onClick={handleCreateNote}
                    className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono font-bold text-cyan-500 hover:text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer rounded-lg border border-cyan-500/20"
                  >
                    <FilePlus className="w-3 h-3" />
                    NEW NOTE
                  </button>
                  <button
                    id="notebook-btn-log-day"
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const offset = today.getTimezoneOffset();
                      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
                      setLogDateInput(localToday.toISOString().split('T')[0]);
                      setIsLogDayModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono font-bold text-cyan-500 hover:text-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10 cursor-pointer rounded-lg border border-cyan-500/20"
                  >
                    <Calendar className="w-3 h-3" />
                    LOG DAY
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-bold font-mono text-zinc-400 dark:text-zinc-500 tracking-wider">
                  TRASH CORNER
                </span>
              )}
              {/* decorative sort button */}
              <button type="button" className="p-1 px-1.5 rounded hover:bg-[var(--bar)] text-zinc-400"><ArrowUpDown className="w-4 h-4" /></button>
            </div>

            {/* Select All Checkbox / Bulk Options Row */}
            <div className="px-4 py-2 bg-[var(--bar)]/20 shadow-sm flex items-center justify-between select-none border-b border-[var(--border)]/40 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 cursor-pointer"
                  title="Toggle select all"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
                <span className="text-[10px] font-bold font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                  {selectedNoteIds.length > 0 ? `${selectedNoteIds.length} SELECTED` : 'SELECT ALL'}
                </span>
              </div>

              {/* Bulk Actions display if items selected */}
              {selectedNoteIds.length > 0 && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {selectedFolderId === 'TRASH' ? (
                    <>
                      <button
                        type="button"
                        onClick={handleBulkRestore}
                        className="p-1 rounded text-green-500 hover:bg-green-500/10 transition-colors cursor-pointer"
                        title="Restore Selected"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkPermanentDelete}
                        className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="PERMANENTLY Delete Selected"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Move Selected to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable list of notes */}
            <div className="flex-1 divide-y divide-[var(--border)]/30 overflow-y-auto">
              {filteredEntries.length === 0 ? (
                <div className="p-8 text-center" id="notebook-empty-notes-prompt">
                  <HelpCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
                  <p className="text-xs text-zinc-500 font-mono italic leading-relaxed">
                    {searchQuery.trim() !== ''
                      ? 'No notes match your search.'
                      : selectedFolderId === 'TRASH'
                      ? 'No deleted notes here.'
                      : 'No notes yet. Click New note to get started.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* render date groups */}
                  {groupedEntries.sortedDates.map((groupDate) => {
                    const notes = groupedEntries.groupsMap[groupDate];
                    return (
                      <div key={groupDate} id={`date-group-${groupDate}`} className="flex flex-col">
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)',
                            background: 'rgba(0,0,0,0.02)',
                            padding: '4px 12px'
                          }}
                        >
                          <span>📅 {formatLogDateLabel(groupDate)}</span>
                        </div>
                        <div className="divide-y divide-[var(--border)]/30">
                          {notes.map((note) => renderNoteItem(note))}
                        </div>
                      </div>
                    );
                  })}

                  {/* render notes without log_date */}
                  {groupedEntries.withoutLogDate.length > 0 && (
                    <div className="flex flex-col">
                      {groupedEntries.sortedDates.length > 0 && (
                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: 'var(--text-muted)',
                            background: 'rgba(0,0,0,0.02)',
                            padding: '4px 12px'
                          }}
                        >
                          <span>— OTHER NOTES —</span>
                        </div>
                      )}
                      <div className="divide-y divide-[var(--border)]/30 border-t border-[var(--border)]/30">
                        {groupedEntries.withoutLogDate.map((note) => renderNoteItem(note))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* PANEL 3: NOTE EDITOR (flex-1) */}
          <main
            id="notebook-panel-editor"
            className="flex-1 h-full overflow-y-auto flex flex-col p-6 font-sans relative"
            style={{ backgroundColor: 'var(--card)' }}
          >
            {!activeNote ? (
              dateFromDashboard ? (
                <div id="notebook-no-note-date-prompt" className="flex-1 flex flex-col items-center justify-center text-center p-12 max-w-sm mx-auto">
                  <Calendar className="w-12 h-12 text-cyan-500 animate-none mb-3 shrink-0" />
                  <h4 className="text-zinc-200 font-sans font-bold text-sm tracking-wide uppercase mb-2">
                    NO NOTE LINKED
                  </h4>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6">
                    No note linked to <strong className="text-white">{formatLogDateLabel(dateFromDashboard)}</strong> yet.<br/><br/>
                    Click Log Day below to create one, or open an existing note and use <strong className="text-cyan-400">Set trade date</strong> to link it to this day.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setLogDateInput(dateFromDashboard);
                      setIsLogDayModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer transition-all shrink-0"
                  >
                    Log Day &rarr;
                  </button>
                </div>
              ) : (
                <div id="notebook-no-note-prompt" className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <FileText className="w-12 h-12 text-zinc-600 animate-none mb-3" />
                  <h4
                    className="font-sans uppercase mb-1"
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-muted)'
                    }}
                  >
                    NO NOTE SELECTED
                  </h4>
                  <p
                    className="font-mono italic"
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-muted)'
                    }}
                  >
                    Select a note or create a new one to start writing.
                  </p>
                </div>
              )
            ) : (
              <div id="notebook-active-note-view" className="flex-1 flex flex-col gap-5 max-w-4xl mx-auto w-full">
                
                {/* TOP HEADER CONTROLS (Title, dates, save state indicator) */}
                <div className="flex flex-col gap-2 relative border-b border-[var(--border)] pb-4 shrink-0">
                  
                  {/* Indicators line */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest bg-zinc-800/20 px-2 py-0.5 rounded border border-[var(--border)]">
                      {(selectedFolderId === 'TRASH' || activeNote.is_deleted) ? 'READ-ONLY TRASH NOTE' : 'ACTIVE NOTE'}
                    </span>
                    
                    {/* SAVE STATUS INDICATOR */}
                    {!activeNote.is_deleted && (
                      <div id="notebook-save-indicator" className="text-[11px] font-mono font-medium">
                        {titleSaving || contentSaving ? (
                          <span className="text-amber-500 animate-pulse bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">Saving...</span>
                        ) : hasSavedRecently ? (
                          <span className="text-green-500 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10">Saved ✓</span>
                        ) : (
                          <span className="text-zinc-500 bg-zinc-800/10 px-2 py-0.5 rounded border border-[var(--border)]">Idle</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NOTE TITLE INPUT */}
                  <input
                    id="notebook-title-input"
                    ref={titleInputRef}
                    type="text"
                    placeholder="Untitled"
                    disabled={activeNote.is_deleted}
                    value={localTitle}
                    onChange={(e) => {
                      setLocalTitle(e.target.value);
                      triggerTitleSave(e.target.value);
                    }}
                    className="text-2xl font-bold font-sans text-white focus:outline-none w-full bg-transparent border-none p-0 focus:ring-0 mt-1 placeholder:text-zinc-600"
                  />

                  {/* Subtle link prompt if log_date is not set */}
                  {!activeNote.is_deleted && !activeNote.log_date && (
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        const offset = today.getTimezoneOffset();
                        const localToday = new Date(today.getTime() - (offset * 60 * 1000));
                        setSelectedLogDate(localToday.toISOString().split('T')[0]);
                        setShowDatePicker(true);
                      }}
                      className="text-xs text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer text-left w-fit p-0 border-none bg-transparent flex items-center gap-1 mt-0.5"
                    >
                      📅 Link this note to a trading day →
                    </button>
                  )}

                  {/* Dates created, updated & trash delete button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-1 text-[11px] text-zinc-500 font-mono">
                    <div className="flex items-center flex-wrap gap-2">
                      {!activeNote.is_deleted && (
                        <>
                          {activeNote.log_date ? (
                            <div className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-mono text-xs">
                              <span>📅 {formatLogDateLabel(activeNote.log_date)}</span>
                              <button
                                type="button"
                                onClick={handleRemoveTradeDate}
                                className="hover:text-red-400 font-bold ml-1 text-sm bg-transparent border-none p-0 cursor-pointer"
                                title="Remove date link"
                              >
                                &times;
                              </button>
                            </div>
                          ) : showDatePicker ? (
                            <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded border border-[var(--border)] animate-in fade-in zoom-in-95 duration-100">
                              <input
                                type="date"
                                value={selectedLogDate}
                                onChange={(e) => setSelectedLogDate(e.target.value)}
                                className="bg-zinc-800 border border-[var(--border)] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleConfirmTradeDate}
                                className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs transition-colors cursor-pointer"
                              >
                                Link to this day
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDatePicker(false)}
                                className="text-zinc-400 hover:text-white px-1 text-xs cursor-pointer bg-transparent border-none"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const offset = today.getTimezoneOffset();
                                const localToday = new Date(today.getTime() - (offset * 60 * 1000));
                                setSelectedLogDate(localToday.toISOString().split('T')[0]);
                                setShowDatePicker(true);
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-[var(--border)] text-xs transition-all cursor-pointer"
                            >
                              📅 Set trade date
                            </button>
                          )}
                          <span className="mx-2">•</span>
                        </>
                      )}
                      <span>Created: {formatDateTime(activeNote.created_at)}</span>
                      <span className="mx-2">•</span>
                      <span>Last updated: {formatDateTime(activeNote.updated_at)}</span>
                    </div>

                    {!activeNote.is_deleted && (
                      <button
                        id="notebook-btn-delete-active"
                        type="button"
                        onClick={handleDeleteNote}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors text-xs font-mono font-bold cursor-pointer bg-none border-none py-1 px-1.5 hover:bg-red-500/5 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        DELETE
                      </button>
                    )}
                  </div>
                </div>

                {/* TAGS BAR */}
                <div id="notebook-note-tags-row" className="flex flex-wrap items-center gap-2 py-1 shrink-0">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500">TAGS:</span>
                  
                  {activeNote.tags && activeNote.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bar)] text-zinc-300 inline-flex items-center gap-1 group border border-[var(--border)]"
                    >
                      <span>{tag}</span>
                      {!activeNote.is_deleted && (
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-400 p-0 text-xs shrink-0 line-height-none border-none bg-transparent cursor-pointer font-bold select-none text-zinc-500"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}

                  {!activeNote.is_deleted && (
                    <input
                      type="text"
                      placeholder="Type tag, press Enter..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-[var(--border)] text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 w-44 font-mono font-medium"
                    />
                  )}
                </div>

                {/* RECENTLY USED TEMPLATES ROW */}
                {!activeNote.is_deleted && (
                  <div id="notebook-templates-row" className="flex flex-col gap-1.5 py-1.5 shrink-0 border-t border-b border-[var(--border)]/30">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 uppercase">Recently used templates</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(`PRE-MARKET BIAS:<br/><br/><br/>KEY LEVELS TO WATCH:<br/><br/><br/>SETUPS I'M LOOKING FOR:<br/><br/><br/>RISK MANAGEMENT TODAY:<br/>- Max loss: <br/>- Max trades: <br/><br/><br/>SESSION NOTES:<br/>`)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--bar)] hover:bg-[var(--bar)]/80 text-zinc-350 border border-[var(--border)] transition-all cursor-pointer"
                      >
                        Daily Game Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(`SYMBOL: <br/>DIRECTION: <br/>SETUP: <br/><br/>WHAT I SAW:<br/><br/><br/>ENTRY REASONING:<br/><br/><br/>WHAT ACTUALLY HAPPENED:<br/><br/><br/>LESSON:<br/>`)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--bar)] hover:bg-[var(--bar)]/80 text-zinc-350 border border-[var(--border)] transition-all cursor-pointer"
                      >
                        Trade Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(`WEEK OF: <br/><br/>BEST TRADE THIS WEEK:<br/>WORST TRADE THIS WEEK:<br/>TOTAL P&L: <br/><br/>WHAT WORKED:<br/><br/><br/>WHAT DIDN'T WORK:<br/><br/><br/>FOCUS FOR NEXT WEEK:<br/>`)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-[var(--bar)] hover:bg-[var(--bar)]/80 text-zinc-350 border border-[var(--border)] transition-all cursor-pointer"
                      >
                        Weekly Recap
                      </button>
                      
                      {/* "+ Add Template" button */}
                      <button
                        id="notebook-btn-add-template-trigger"
                        type="button"
                        onClick={() => setIsAddTemplateModalOpen(true)}
                        className="text-zinc-500 hover:text-cyan-500 text-[11px] font-semibold ml-1 flex items-center gap-0.5 border border-dashed border-zinc-600 px-2.5 py-1 rounded-full cursor-pointer transition-all bg-transparent"
                      >
                        <Plus className="w-3 h-3" /> Add Template
                      </button>
                    </div>
                  </div>
                )}

                {/* TOOLBAR FOR CONTENTEDITABLE FORMATTING */}
                {!activeNote.is_deleted && (
                  <div
                    id="notebook-toolbar"
                    className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-[var(--border)] overflow-x-auto select-none shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => triggerFormat('bold')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFormat('italic')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFormat('underline')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-[1px] h-4 bg-zinc-800 dark:bg-zinc-700 mx-1 shrink-0" />
                    <button
                      type="button"
                      onClick={() => triggerFormat('insertUnorderedList')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Bullet List"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerFormat('insertOrderedList')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-[1px] h-4 bg-zinc-800 dark:bg-zinc-700 mx-1 shrink-0" />
                    <button
                      type="button"
                      onClick={triggerLinkFormat}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bar)] border border-transparent hover:border-[var(--border)] text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Insert Link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* CONTENTEDITABLE TEXT COMPONENT */}
                <div className="flex-1 w-full relative min-h-[400px]">
                  <div
                    id="notebook-content-editor"
                    ref={editorRef}
                    contentEditable={!activeNote.is_deleted}
                    {...({ placeholder: "Type something..." } as any)}
                    onInput={(e) => {
                      triggerContentSave(e.currentTarget.innerHTML);
                    }}
                    className="w-full h-full min-h-[400px] bg-transparent text-sm focus:outline-none focus:ring-0 leading-relaxed text-zinc-200 outline-none select-text"
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                  />
                </div>

              </div>
            )}
          </main>

        </div>
      </div>

      {/* ADD / RENAME FOLDER MODAL POPUP */}
      {isFolderModalOpen && (
        <div id="notebook-folder-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            id="notebook-folder-modal-card"
            className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 id="notebook-modal-title" className="text-sm font-bold font-mono text-white tracking-wider uppercase mb-5">
              {folderModalMode === 'create' ? 'ADD NEW FOLDER' : 'RENAME FOLDER'}
            </h3>

            <form onSubmit={handleSaveFolder} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">
                  Folder Name
                </label>
                <input
                  id="notebook-input-folder-name"
                  type="text"
                  required
                  placeholder="Enter folder name..."
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  className="w-full text-xs py-2.5 px-3 bg-zinc-900 border font-sans font-medium rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {/* Color swatch selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">
                  Select Accent Color
                </label>
                <div id="notebook-swatches-grid" className="flex flex-wrap gap-2 pt-1">
                  {SWATCHES.map((swColor) => {
                    const isSelected = folderColorInput.toLowerCase() === swColor.toLowerCase();
                    return (
                      <button
                        key={swColor}
                        type="button"
                        onClick={() => setFolderColorInput(swColor)}
                        className={`w-6 h-6 rounded-full transition-all flex items-center justify-center cursor-pointer border-none shrink-0 ${
                          isSelected ? 'ring-2 ring-offset-2 ring-cyan-500' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: swColor }}
                        title={swColor}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="notebook-btn-modal-cancel"
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white cursor-pointer rounded-lg bg-transparent hover:bg-[var(--bar)] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  id="notebook-btn-modal-save"
                  type="submit"
                  className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer transition-all shrink-0"
                >
                  SAVE FOLDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG DAY DIALOG/MODAL */}
      {isLogDayModalOpen && (
        <div id="notebook-log-day-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            id="notebook-log-day-modal-card"
            className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-bold font-mono text-white tracking-wider uppercase mb-5">
              LOG DAY
            </h3>

            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-400">
                  Select Date
                </label>
                <input
                  id="notebook-input-log-date"
                  type="date"
                  required
                  value={logDateInput}
                  onChange={(e) => setLogDateInput(e.target.value)}
                  className="w-full text-xs py-2.5 px-3 bg-zinc-900 border font-sans font-medium rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="notebook-btn-log-cancel"
                  type="button"
                  onClick={() => setIsLogDayModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white cursor-pointer rounded-lg bg-transparent hover:bg-[var(--bar)] transition-colors"
                >
                  CANCEL
                </button>
                <button
                  id="notebook-btn-log-create"
                  type="button"
                  disabled={isCreatingLog}
                  onClick={() => handleCreateLog(false)}
                  className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer transition-all shrink-0 disabled:opacity-50"
                >
                  {isCreatingLog ? 'CREATING...' : 'CREATE LOG'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG DAY ALREADY EXISTS CONFIRMATION MODAL */}
      {logDayConfirmData && (
        <div id="notebook-log-day-confirm-modal-overlay" className="fixed inset-0 bg-black/75 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div
            id="notebook-log-day-confirm-modal"
            className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200 bg-zinc-950 border-amber-500/30"
          >
            <div className="flex items-center gap-2 text-amber-500 mb-3 font-mono font-bold text-sm uppercase tracking-wider">
              <span>⚠️ Already Logged</span>
            </div>
            
            <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-6">
              A note is already linked to the trading day <strong className="text-white">{formatLogDateLabel(logDayConfirmData.date)}</strong>.<br/><br/>
              There {logDayConfirmData.count === 1 ? 'is' : 'are'} currently <strong className="text-cyan-400">{logDayConfirmData.count}</strong> note{logDayConfirmData.count === 1 ? '' : 's'} linked to this date. Do you want to create another anyway?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLogDayConfirmData(null)}
                className="px-4 py-2 text-xs font-mono font-bold text-zinc-400 hover:text-white cursor-pointer rounded-lg bg-transparent hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setLogDayConfirmData(null);
                  await handleCreateLog(true);
                }}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer transition-all shrink-0"
              >
                Create anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE AS TEMPLATE DIALOG/MODAL */}
      {isAddTemplateModalOpen && (
        <div id="notebook-coming-soon-modal-overlay" className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            id="notebook-coming-soon-modal-card"
            className="w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden p-6 animate-in scale-in duration-200"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-sm font-bold font-mono text-white tracking-wider uppercase mb-3">
              SAVE AS TEMPLATE
            </h3>
            <p className="text-xs text-zinc-400 font-sans mb-5 leading-normal">
              Coming soon — template saving will be available soon.
            </p>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsAddTemplateModalOpen(false)}
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inject custom placeholder styles for contenteditable */}
      <style>{`
        #notebook-content-editor:empty:before {
          content: attr(placeholder);
          color: var(--text-muted, #71717a);
          opacity: 0.55;
          pointer-events: none;
        }
        #notebook-content-editor {
          white-space: pre-wrap;
          word-break: break-word;
        }
        /* Custom formatting inner styles */
        #notebook-content-editor ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        #notebook-content-editor ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        #notebook-content-editor a {
          color: var(--accent, #06b6d4);
          text-decoration: underline;
        }
        /* Custom scrollbar for folders and list sides */
        #notebook-panel-folders::-webkit-scrollbar,
        #notebook-panel-notes::-webkit-scrollbar {
          width: 4px;
        }
        #notebook-panel-folders::-webkit-scrollbar-thumb,
        #notebook-panel-notes::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }
        #notebook-panel-folders::-webkit-scrollbar-track,
        #notebook-panel-notes::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

    </div>
  );
}
