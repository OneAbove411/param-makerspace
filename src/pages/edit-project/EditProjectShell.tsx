import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useProject, useProjectMutations } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { uploadFile, deleteFile } from '../../lib/storage';
import { isValidVideoUrl } from '../../lib/videoUtils';
import { Button } from '../../components/ui/Button';
import { toast } from '../../lib/toast';
import { useUnsavedChanges } from '../../lib/useUnsavedChanges';
import { useAutosave, type AutosaveStatus } from '../../lib/useAutosave';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Check,
  AlertTriangle,
  Github,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  FileText,
  Video as VideoIcon,
  Search,
  X,
  Users,
} from 'lucide-react';
import { getYoutubeThumbnail } from '../../lib/videoUtils';
import type { Project } from '../../lib/database.types';
import { EditProjectContext } from './EditProjectContext';

// ─── Bento helpers — match Dashboard brutalism ─────────────────────────────
// All form controls now share the same warm bg, thicker border, and the
// hard-shadow brutalist treatment that Dashboard uses for its tiles.
const inputClass =
  'w-full bg-brutal-bg border-2 border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-[12px] text-brutal-dark placeholder:text-brutal-dark/35 focus:outline-none focus:border-brutal-dark focus:bg-white transition-colors';

const inputDarkClass =
  'w-full bg-brutal-dark/40 border-2 border-brutal-bg/15 px-3 py-2 rounded-xl font-data text-[12px] text-brutal-bg placeholder:text-brutal-bg/35 focus:outline-none focus:border-brutal-red focus:bg-brutal-dark/60 transition-colors';

function FieldRow({
  label,
  required,
  hint,
  dark,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`font-data text-[10px] font-bold uppercase tracking-widest block mb-1.5 ${dark ? 'text-brutal-bg/60' : 'text-brutal-dark/55'}`}>
        {label}
        {required && <span className="text-brutal-red ml-0.5">*</span>}
        {hint && (
          <span className={`ml-2 normal-case tracking-normal italic font-normal ${dark ? 'text-brutal-bg/35' : 'text-brutal-dark/35'}`}>
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/**
 * Light bento card — matches Dashboard's BentoStat / Recent XP card.
 * Hard offset red shadow + 2px dark border + warm bg + corner peel hover.
 */
function BentoCard({
  eyebrow,
  title,
  rightSlot,
  className = '',
  children,
}: {
  eyebrow: string;
  title: string;
  rightSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`relative flex flex-col bg-brutal-bg border-2 border-brutal-dark/15 rounded-2xl p-5 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-brutal-dark/10 flex-shrink-0">
        <div className="min-w-0">
          <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45 leading-none">
            {eyebrow}
          </div>
          <h2 className="font-drama italic text-2xl text-brutal-dark leading-tight mt-1">
            {title}
          </h2>
        </div>
        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
      </header>
      {children}
    </section>
  );
}

/**
 * Dark hero card — the centerpiece. Matches Dashboard's ContinueBuilding
 * "Finish your draft" block: bg-brutal-dark, brutal-bg text, red shadow.
 */
function HeroCard({
  eyebrow,
  title,
  rightSlot,
  className = '',
  children,
}: {
  eyebrow: string;
  title: string;
  rightSlot?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`relative flex flex-col bg-brutal-dark text-brutal-bg border-2 border-brutal-dark rounded-2xl p-6 shadow-[8px_8px_0_0_rgba(196,41,30,0.55)] overflow-hidden ${className}`}
    >
      {/* red top stripe */}
      <div aria-hidden className="absolute top-0 left-0 right-0 h-1 bg-brutal-red" />
      <header className="flex items-center justify-between gap-3 mb-5 pb-4 border-b-2 border-brutal-bg/15 flex-shrink-0">
        <div className="min-w-0">
          <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red leading-none">
            {eyebrow}
          </div>
          <h2 className="font-drama italic text-3xl text-brutal-bg leading-tight mt-1">
            {title}
          </h2>
        </div>
        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
      </header>
      {children}
    </section>
  );
}

function AutosaveStatusChip({
  status,
  lastSavedAt,
}: {
  status: AutosaveStatus;
  lastSavedAt: Date | null;
}) {
  const base =
    'font-data text-[10px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5';
  if (status === 'saving') {
    return (
      <span className={`${base} text-brutal-dark/50`} aria-live="polite">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    const time = lastSavedAt
      ? lastSavedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <span className={`${base} text-green-700`} aria-live="polite">
        <Check size={12} aria-hidden="true" />
        Saved{time ? ` · ${time}` : ''}
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className={`${base} text-brutal-red`} aria-live="polite">
        <AlertTriangle size={12} aria-hidden="true" />
        Save failed
      </span>
    );
  }
  return null;
}

export function EditProjectShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: project, loading, refetch } = useProject(id);
  const { updateProject } = useProjectMutations();

  // ── Form & state ──
  const [form, setForm] = useState<Partial<Project>>({});
  const [formDirty, setFormDirty] = useState(false);
  useUnsavedChanges(formDirty);

  const autosaveEnabled = !!id && project?.status !== 'pending_review';
  const {
    status: autosaveStatus,
    lastSavedAt,
    saveNow,
  } = useAutosave<Partial<Project>>({
    value: form,
    enabled: autosaveEnabled,
    delayMs: 1200,
    hydrationKey: project?.id,
    onSave: async (snapshot) => {
      if (!id) return;
      const { error } = await updateProject(id, snapshot);
      if (error) return { error };
      setFormDirty(false);
    },
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState<any[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
  const milestoneListRef = useRef<HTMLOListElement>(null);

  // Videos
  const [videos, setVideos] = useState<any[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [videoUrlError, setVideoUrlError] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const newVideoUrlRef = useRef<HTMLInputElement>(null);

  // Members
  const [members, setMembers] = useState<any[]>([]);
  const [addingRole, setAddingRole] = useState<'collaborator' | 'mentor'>('collaborator');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Media tab
  const [mediaTab, setMediaTab] = useState<'gallery' | 'videos' | 'files'>('gallery');

  // Populate from project
  const projectId = project?.id;
  useEffect(() => {
    if (!project) return;
    setForm({
      title: project.title,
      summary: project.summary,
      description: project.description,
      domain: project.domain,
      tier: project.tier,
      github_url: project.github_url,
      duration: project.duration,
    });
    setVideos(project.videos || []);
    setMilestones(project.milestones || []);
    setMembers(project.members || []);
    setFormDirty(false);
  }, [projectId]);

  // Search debounce
  useEffect(() => {
    let cancelled = false;
    const bounce = setTimeout(async () => {
      if (searchQuery.length < 2) {
        if (!cancelled) setSearchResults([]);
        return;
      }
      if (!cancelled) setIsSearching(true);
      const { data } = await supabase
        .from('app_user')
        .select('id, name, email')
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(5);
      if (!cancelled) {
        setSearchResults(data || []);
        setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(bounce);
    };
  }, [searchQuery]);

  // ── Handlers ──
  const updateField = <K extends keyof Project>(key: K, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    await saveNow();
    await refetch();
    setActionLoading(false);
  };

  const handleSubmitForReview = async () => {
    if (!id) return;
    if (!window.confirm('Submit for mentor review? Editing core details will be locked while pending.')) return;
    setActionLoading(true);
    const { error } = await updateProject(id, { status: 'pending_review' });
    if (error) {
      toast.error(typeof error === 'string' ? error : 'Couldn\'t submit for review.');
    } else {
      setFormDirty(false);
      toast.success('Project submitted for review.');
      navigate('/dashboard');
    }
    setActionLoading(false);
  };

  // Milestone handlers
  const fetchMilestones = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('project_milestone')
      .select('id, title, description, is_complete, display_order')
      .eq('project_id', id)
      .order('display_order');
    setMilestones(data || []);
  };

  const handleAddMilestone = async () => {
    if (!id || !newMilestoneTitle.trim()) return;
    const order = milestones.length > 0 ? Math.max(...milestones.map((m) => m.display_order)) + 1 : 1;
    const title = newMilestoneTitle.trim();
    const desc = newMilestoneDesc.trim() || null;
    const tempId = 'temp-' + Date.now();
    setMilestones(prev => [...prev, { id: tempId, title, description: desc, is_complete: false, display_order: order }]);
    setNewMilestoneTitle('');
    setNewMilestoneDesc('');
    setTimeout(() => {
      milestoneListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    const { error } = await supabase.from('project_milestone').insert({ project_id: id, title, description: desc, display_order: order });
    if (error) {
      setMilestones(prev => prev.filter(m => m.id !== tempId));
      toast.error('Couldn\'t add milestone — try again.');
      return;
    }
    fetchMilestones();
  };

  const handleToggleMilestone = async (milestoneId: string, currentVal: boolean) => {
    const prev = milestones;
    setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, is_complete: !currentVal } : m));
    const { error } = await supabase.from('project_milestone').update({ is_complete: !currentVal }).eq('id', milestoneId);
    if (error) {
      setMilestones(prev);
      toast.error('Couldn\'t update milestone.');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    const prev = milestones;
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
    const { error } = await supabase.from('project_milestone').delete().eq('id', milestoneId);
    if (error) {
      setMilestones(prev);
      toast.error('Couldn\'t delete milestone.');
    }
  };

  const handleReorderMilestone = async (milestoneId: string, direction: 'up' | 'down') => {
    const sorted = [...milestones].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex(m => m.id === milestoneId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];
    const snapshot = milestones;
    const next = sorted.map((m) => {
      if (m.id === a.id) return { ...m, display_order: b.display_order };
      if (m.id === b.id) return { ...m, display_order: a.display_order };
      return m;
    });
    setMilestones(next);

    const [resA, resB] = await Promise.all([
      supabase.from('project_milestone').update({ display_order: b.display_order }).eq('id', a.id),
      supabase.from('project_milestone').update({ display_order: a.display_order }).eq('id', b.id),
    ]);
    if (resA.error || resB.error) {
      setMilestones(snapshot);
      toast.error('Couldn\'t reorder — try again.');
      return;
    }
    fetchMilestones();
  };

  // Video handlers
  const fetchVideos = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('project_video')
      .select('id, title, video_url, display_order')
      .eq('project_id', id)
      .order('display_order');
    setVideos(data || []);
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoUrlError('');
    const trimmed = newVideoUrl.trim();
    if (!trimmed) return;
    if (!isValidVideoUrl(trimmed)) {
      setVideoUrlError('Enter a valid YouTube or Vimeo URL.');
      newVideoUrlRef.current?.focus();
      return;
    }
    if (!id) return;
    setAddingVideo(true);
    const title = newVideoTitle.trim() || 'Project Video';
    const tempId = 'temp-' + Date.now();
    setVideos(prev => [...prev, { id: tempId, title, video_url: trimmed, display_order: videos.length + 1 }]);
    setNewVideoUrl('');
    setNewVideoTitle('');
    const { error } = await supabase.from('project_video').insert({
      project_id: id, title, video_url: trimmed, display_order: videos.length + 1,
    });
    setAddingVideo(false);
    if (error) {
      setVideos(prev => prev.filter(v => v.id !== tempId));
      toast.error('Couldn\'t add video — try again.');
      return;
    }
    fetchVideos();
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Remove this video?')) return;
    const prev = videos;
    setVideos(prev => prev.filter(v => v.id !== videoId));
    const { error } = await supabase.from('project_video').delete().eq('id', videoId);
    if (error) {
      setVideos(prev);
      toast.error('Couldn\'t remove video — try again.');
      return;
    }
    fetchVideos();
  };

  // Image handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setUploadingImage(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { url, error } = await uploadFile('project-images', path, file);
    if (error) {
      toast.error(typeof error === 'string' ? error : 'Couldn\'t upload image.');
    } else if (url) {
      const { error: dbError } = await supabase.from('project_image').insert({
        project_id: id,
        image_url: url,
        display_order: (project?.images?.length || 0) + 1,
      });
      if (dbError) toast.error(dbError.message);
      else {
        await refetch();
        toast.success('Image uploaded.');
      }
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId: string, url: string) => {
    if (!window.confirm('Delete this image?')) return;
    setActionLoading(true);
    const pathMatch = url.match(/project-images\/(.+)$/);
    if (pathMatch) await deleteFile('project-images', pathMatch[1]);
    const { error } = await supabase.from('project_image').delete().eq('id', imageId);
    if (error) toast.error('Couldn\'t delete image.');
    else toast.success('Image deleted.');
    await refetch();
    setActionLoading(false);
  };

  // File handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setUploadingFile(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { url, error } = await uploadFile('project-files', path, file);
    if (error) {
      toast.error(typeof error === 'string' ? error : 'Couldn\'t upload file.');
    } else if (url) {
      const { error: dbError } = await supabase.from('project_file').insert({
        project_id: id,
        file_url: url,
        file_name: file.name,
        file_size: file.size,
      });
      if (dbError) toast.error(dbError.message);
      else {
        await refetch();
        toast.success('File attached.');
      }
    }
    setUploadingFile(false);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId: string, url: string) => {
    if (!window.confirm('Delete this attached file?')) return;
    setActionLoading(true);
    const pathMatch = url.match(/project-files\/(.+)$/);
    if (pathMatch) await deleteFile('project-files', pathMatch[1]);
    const { error } = await supabase.from('project_file').delete().eq('id', fileId);
    if (error) toast.error('Couldn\'t delete file.');
    else toast.success('File removed.');
    await refetch();
    setActionLoading(false);
  };

  // Member handlers
  const fetchMembers = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('project_member')
      .select('id, user_id, role, joined_at, app_user:app_user!user_id(name, email)')
      .eq('project_id', id);
    setMembers(data || []);
  };

  const handleAddMember = async (selectedUser: any) => {
    if (!id) return;
    const existingMemberIds = new Set(members.map((m) => m.user_id));
    if (existingMemberIds.has(selectedUser.id)) {
      toast.error('That person is already on the team.');
      setSearchQuery('');
      return;
    }
    const tempId = 'temp-' + Date.now();
    setMembers(prev => [...prev, { id: tempId, user_id: selectedUser.id, role: addingRole, name: selectedUser.name, app_user: { name: selectedUser.name, email: selectedUser.email } }]);
    setSearchQuery('');
    setSearchResults([]);
    const { error } = await supabase.from('project_member').insert({
      project_id: id,
      user_id: selectedUser.id,
      role: addingRole,
    });
    if (error) {
      setMembers(prev => prev.filter(m => m.id !== tempId));
      toast.error('Couldn\'t add that teammate — try again.');
      return;
    }
    toast.success(`${selectedUser.name} added as ${addingRole}.`);
    fetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member?')) return;
    const prev = members;
    setMembers(prev => prev.filter(m => m.id !== memberId));
    const { error } = await supabase.from('project_member').delete().eq('id', memberId);
    if (error) {
      setMembers(prev);
      toast.error('Couldn\'t remove that teammate.');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    const prev = members;
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    const { error } = await supabase.from('project_member').update({ role: newRole }).eq('id', memberId);
    if (error) {
      setMembers(prev);
      toast.error('Couldn\'t update that role.');
    }
  };

  // Early returns
  if (loading)
    return (
      <div className="flex-1 w-full bg-brutal-bg min-h-screen animate-pulse">
        <div className="pt-20 md:pt-24">
          <div className="h-[180px] md:h-[260px] bg-brutal-dark/5" />
          <div className="max-w-6xl mx-auto px-6 md:px-12 -mt-16 md:-mt-20 relative z-10">
            <div className="bg-brutal-bg rounded-2xl p-8 border border-brutal-dark/10 space-y-4">
              <div className="h-4 w-24 bg-brutal-dark/8 rounded" />
              <div className="h-12 w-2/3 bg-brutal-dark/8 rounded" />
              <div className="h-4 w-1/2 bg-brutal-dark/5 rounded" />
            </div>
          </div>
        </div>
      </div>
    );

  if (!project)
    return (
      <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
        <div className="max-w-2xl mx-auto text-center py-32">
          <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">
            Project Not Found
          </h1>
          <p className="font-data text-sm text-brutal-dark/40 mt-4">
            This project may have been removed or does not exist.
          </p>
          <Link to="/projects" className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm uppercase text-brutal-dark hover:text-brutal-red transition-colors">
            <ArrowLeft size={16} /> Back to Archive
          </Link>
        </div>
      </div>
    );

  if (project.owner_id !== user?.id && (user as any)?.role !== 'admin') {
    return (
      <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
        <div className="max-w-2xl mx-auto text-center py-32">
          <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-red/40">
            Access Denied
          </h1>
          <p className="font-data text-sm text-brutal-dark/40 mt-4">
            Only the project owner or an admin can edit this project.
          </p>
          <Link to="/projects" className="inline-flex items-center gap-2 mt-8 font-heading font-bold text-sm uppercase text-brutal-dark hover:text-brutal-red transition-colors">
            <ArrowLeft size={16} /> Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  const coverImage = project.images?.find((_, i) => i === 0)?.image_url;
  const completedMilestones = milestones.filter((m: any) => m.is_complete).length;
  const totalMilestones = milestones.length;
  const milestonePercent = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  const contextValue = {
    project,
    user,
    form,
    setForm,
    formDirty,
    setFormDirty,
    autosaveStatus,
    lastSavedAt,
    saveNow,
    actionLoading,
    setActionLoading,
    uploadingImage,
    uploadingFile,
    milestones,
    setMilestones,
    newMilestoneTitle,
    setNewMilestoneTitle,
    newMilestoneDesc,
    setNewMilestoneDesc,
    videos,
    setVideos,
    newVideoUrl,
    setNewVideoUrl,
    newVideoTitle,
    setNewVideoTitle,
    videoUrlError,
    setVideoUrlError,
    addingVideo,
    setAddingVideo,
    members,
    setMembers,
    addingRole,
    setAddingRole,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    mediaTab,
    setMediaTab,
    updateField,
    refetch,
    fetchMilestones,
    handleAddMilestone,
    handleToggleMilestone,
    handleDeleteMilestone,
    handleReorderMilestone,
    fetchVideos,
    handleAddVideo,
    handleDeleteVideo,
    handleImageUpload,
    handleDeleteImage,
    handleFileUpload,
    handleDeleteFile,
    fetchMembers,
    handleAddMember,
    handleRemoveMember,
    handleUpdateMemberRole,
    milestoneListRef,
    newVideoUrlRef,
    handleSave,
    handleSubmitForReview,
  };

  // ─────────────────────────────────────────────────────────────────────
  // §10 Edit Cockpit — single-screen bento (v2: brutalist hierarchy).
  //
  // The v1 layout treated every pane equally and used thin borders → looked
  // like a control-panel grid. v2 leans on Dashboard.tsx's visual vocabulary:
  //
  //   • Core is a DARK HERO BLOCK (bg-brutal-dark, red top stripe, hard
  //     8px red drop shadow) — the unmistakable centerpiece.
  //   • Milestones is a tall light bento card on the right.
  //   • Team is a compact light card under Milestones.
  //   • Cover, Videos, Files share ONE light card with internal tabs at
  //     the bottom — they're all "drop and forget", they don't deserve
  //     three big slots.
  //
  // All cards use the brutalist border-2 + 6px red shadow + warm bg pattern
  // exactly as Dashboard does. Spacing is tighter, hierarchy is clearer.
  // ─────────────────────────────────────────────────────────────────────
  const isLocked = project.status === 'pending_review';

  return (
    <EditProjectContext.Provider value={contextValue}>
      <div className="flex-1 w-full bg-brutal-bg min-h-screen">
        {/* Remix attribution banner */}
        {project?.remixed_from_id && project?.remix_origin_title && (
          <div className="bg-brutal-dark/[0.04] border-b border-brutal-dark/10 px-6 md:px-10 py-2">
            <div className="max-w-[1480px] mx-auto flex items-center justify-between gap-4">
              <div className="font-data text-[10px] uppercase tracking-wider text-brutal-dark/60">
                <span className="font-bold">⑂ Remixed from</span> @{project.remix_origin_owner} · {project.remix_origin_title}
              </div>
              <Link
                to={`/projects/${project.remixed_from_id}`}
                className="text-brutal-dark/60 hover:text-brutal-dark text-[10px] font-bold uppercase tracking-wider underline transition"
              >
                View original →
              </Link>
            </div>
          </div>
        )}

        <div className="pt-24 md:pt-24 px-4 md:px-8 lg:px-12 pb-12">
          <div className="max-w-[1480px] mx-auto">
            {/* ── Header strip ──────────────────────────────────────── */}
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/projects/${id}`}
                  state={{ from: (location.state as any)?.from }}
                  className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/45 hover:text-brutal-red transition-colors mb-3"
                >
                  <ArrowLeft size={11} aria-hidden="true" /> Back to Project
                </Link>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-data text-[10px] text-brutal-red font-bold uppercase tracking-[0.22em]">
                    Editing
                  </span>
                  <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark truncate">
                    {project.title || 'Untitled Project'}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <span className={`px-2.5 py-1 font-data text-[9px] font-bold rounded-full uppercase tracking-widest border-2
                    ${project.status === 'draft' ? 'bg-brutal-bg border-brutal-dark/20 text-brutal-dark/60' :
                      project.status === 'pending_review' ? 'bg-yellow-50 border-yellow-500/60 text-yellow-700' :
                        project.status === 'active' ? 'bg-green-50 border-green-600/50 text-green-700' :
                          'bg-brutal-red/10 border-brutal-red/40 text-brutal-red'
                    }`}>
                    {project.status.replace('_', ' ')}
                  </span>
                  {project.domain && (
                    <span className="border-2 border-brutal-dark/15 px-2.5 py-1 font-data text-[9px] font-bold rounded-full uppercase tracking-widest text-brutal-dark/60">
                      {project.domain}
                    </span>
                  )}
                  {project.tier && (
                    <span className="border-2 border-brutal-dark/15 px-2.5 py-1 font-data text-[9px] font-bold rounded-full uppercase tracking-widest text-brutal-dark/60">
                      {project.tier}
                    </span>
                  )}
                  <span className="font-data text-[10px] text-brutal-dark/45 uppercase tracking-widest">
                    — <span className="text-brutal-dark font-bold tabular-nums">{totalMilestones > 0 ? `${completedMilestones}/${totalMilestones}` : '0'}</span> Mile
                    · <span className="text-brutal-dark font-bold tabular-nums">{videos.length}</span> Vid
                    · <span className="text-brutal-dark font-bold tabular-nums">{project.images?.length || 0}</span> Img
                    · <span className="text-brutal-dark font-bold tabular-nums">{members.length + 1}</span> Team
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-brutal-dark/50">
                {autosaveStatus !== 'idle' ? (
                  <AutosaveStatusChip status={autosaveStatus} lastSavedAt={lastSavedAt} />
                ) : formDirty ? (
                  <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red inline-flex items-center gap-1.5" aria-live="polite">
                    <span className="w-1.5 h-1.5 rounded-full bg-brutal-red animate-pulse" aria-hidden="true" />
                    Unsaved
                  </span>
                ) : null}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                     className="font-data text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 hover:text-brutal-red transition-colors">
                    <Github size={12} aria-hidden="true" /> Repo
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e: any) => handleSave(e)}
                  disabled={actionLoading || isLocked}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-brutal-dark/30 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark hover:bg-brutal-dark hover:text-brutal-bg hover:border-brutal-dark transition-colors disabled:opacity-40"
                >
                  <Save size={12} /> Save Now
                </button>
                {project.status === 'draft' && (
                  <button
                    type="button"
                    onClick={handleSubmitForReview}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brutal-red text-brutal-bg border-2 border-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0_0_rgba(20,20,20,0.9)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(20,20,20,1)] transition-all disabled:opacity-40"
                  >
                    <Send size={12} /> Submit for Review
                  </button>
                )}
              </div>
            </div>

            {/* Status banner — slim brutalist strip */}
            <div className={`mb-6 px-4 py-2 rounded-xl border-2 font-data text-[10px] font-bold uppercase tracking-widest text-center ${
              project.status === 'pending_review' ? 'bg-yellow-50 border-yellow-500/60 text-yellow-800 shadow-[4px_4px_0_0_rgba(234,179,8,0.18)]' :
              project.status === 'active' ? 'bg-green-50 border-green-600/40 text-green-800 shadow-[4px_4px_0_0_rgba(22,163,74,0.18)]' :
              'bg-brutal-bg border-brutal-dark/15 text-brutal-dark/55 shadow-[4px_4px_0_0_rgba(196,41,30,0.10)]'
            }`}>
              {project.status === 'pending_review' ? 'Under Review — core fields locked' :
               project.status === 'active' ? 'Live — edits publish on save' :
               'Drafting — only you can see this'}
            </div>

            {/* ── Bento grid ────────────────────────────────────────── */}
            {/* Two-row layout:
                  Row 1 (lg): CORE hero (cols 1-8) | MILESTONES (cols 9-12, spans 2 rows visually via row-span)
                  Row 2 (lg): MEDIA tabs (cols 1-5)  | TEAM (cols 6-8) | (Milestones spans down)
                Mobile: stacks naturally.
            */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
              {/* ─── CORE — DARK HERO ─────────────────────────────── */}
              <div className="lg:col-span-8 lg:row-start-1">
                <HeroCard
                  eyebrow="01 · Identity"
                  title="Core"
                  className="min-h-[460px]"
                  rightSlot={
                    <div className="hidden md:flex items-center gap-2 font-data text-[9px] font-bold uppercase tracking-widest text-brutal-bg/40">
                      <span>The story of your build</span>
                    </div>
                  }
                >
                  {isLocked && (
                    <div className="absolute inset-0 bg-brutal-dark/85 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                      <div className="bg-yellow-50 px-6 py-4 border-2 border-yellow-500 text-center rounded-xl shadow-[6px_6px_0_0_rgba(234,179,8,0.4)] max-w-[80%]">
                        <h3 className="font-heading font-bold text-base text-yellow-700 uppercase">Locked</h3>
                        <p className="font-data text-[11px] text-yellow-800 mt-1">Core details are locked while under review.</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4 overflow-y-auto pr-2 -mr-2 flex-1 scrollbar-thin">
                    <FieldRow label="Project Title" required dark>
                      <input
                        required
                        placeholder="Give your build a memorable name…"
                        className={inputDarkClass}
                        value={form.title || ''}
                        onChange={(e) => updateField('title', e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="One-Line Summary" required dark hint="The hook">
                      <input
                        required
                        placeholder="What does it do, in eight words or fewer?"
                        className={inputDarkClass}
                        value={form.summary || ''}
                        onChange={(e) => updateField('summary', e.target.value)}
                      />
                    </FieldRow>
                    <FieldRow label="Description" required dark hint="Goals, approach, story">
                      <textarea
                        required
                        placeholder="Why are you building this? How does it work? What did you learn?"
                        className={`${inputDarkClass} min-h-[140px] resize-y`}
                        value={form.description || ''}
                        onChange={(e) => updateField('description', e.target.value)}
                      />
                    </FieldRow>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Domain" dark>
                        <input
                          placeholder="Robotics"
                          className={inputDarkClass}
                          value={form.domain || ''}
                          onChange={(e) => updateField('domain', e.target.value)}
                        />
                      </FieldRow>
                      <FieldRow label="Tier" dark>
                        <input
                          placeholder="Tier 2"
                          className={inputDarkClass}
                          value={form.tier || ''}
                          onChange={(e) => updateField('tier', e.target.value)}
                        />
                      </FieldRow>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldRow label="Duration" dark>
                        <input
                          placeholder="2 weeks"
                          className={inputDarkClass}
                          value={form.duration || ''}
                          onChange={(e) => updateField('duration', e.target.value)}
                        />
                      </FieldRow>
                      <FieldRow label="GitHub URL" dark>
                        <input
                          placeholder="https://github.com/…"
                          className={inputDarkClass}
                          value={form.github_url || ''}
                          onChange={(e) => updateField('github_url', e.target.value)}
                        />
                      </FieldRow>
                    </div>
                  </div>
                </HeroCard>
              </div>

              {/* ─── MILESTONES — tall right column ─────────────────── */}
              <div className="lg:col-span-4 lg:row-start-1 lg:row-span-2">
                <BentoCard
                  eyebrow="02 · Build Progress"
                  title="Milestones"
                  className="h-full min-h-[460px]"
                  rightSlot={
                    totalMilestones > 0 ? (
                      <span className="font-data text-[11px] font-bold tabular-nums text-brutal-dark border-2 border-brutal-dark/15 rounded-full px-2.5 py-0.5 bg-brutal-bg">
                        {completedMilestones}/{totalMilestones}
                      </span>
                    ) : (
                      <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35">Empty</span>
                    )
                  }
                >
                  {totalMilestones > 0 && (
                    <div
                      className="w-full h-1.5 bg-brutal-dark/8 rounded-full mb-4 overflow-hidden flex-shrink-0 border border-brutal-dark/10"
                      role="progressbar"
                      aria-valuenow={Math.round(milestonePercent)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full bg-brutal-red rounded-full origin-left transition-all duration-700"
                        style={{ width: `${milestonePercent}%` }}
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 mb-4 p-3 rounded-xl bg-brutal-dark/[0.03] border-2 border-dashed border-brutal-dark/15 flex-shrink-0">
                    <input
                      type="text"
                      placeholder="New milestone…"
                      className={inputClass}
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description (optional)"
                        className={`${inputClass} flex-1`}
                        value={newMilestoneDesc}
                        onChange={(e) => setNewMilestoneDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                      />
                      <button
                        type="button"
                        onClick={handleAddMilestone}
                        disabled={actionLoading || !newMilestoneTitle.trim()}
                        className="bg-brutal-dark text-brutal-bg px-3 rounded-xl border-2 border-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest shadow-[3px_3px_0_0_rgba(196,41,30,0.6)] hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:opacity-30 disabled:shadow-none transition-all flex items-center gap-1"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                  <ol ref={milestoneListRef} className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 list-none p-0 scrollbar-thin">
                    {[...milestones]
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((m: any, i: number, arr: any[]) => (
                        <li
                          key={m.id}
                          className={`group flex items-start gap-2.5 p-2.5 rounded-xl border-2 transition-all ${
                            m.is_complete
                              ? 'bg-brutal-dark/[0.02] border-brutal-dark/8 opacity-60'
                              : 'bg-brutal-bg border-brutal-dark/12 hover:border-brutal-red/40 hover:shadow-[3px_3px_0_0_rgba(196,41,30,0.15)]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleMilestone(m.id, m.is_complete)}
                            aria-pressed={!!m.is_complete}
                            className={`mt-0.5 flex-shrink-0 transition-colors ${
                              m.is_complete ? 'text-green-600' : 'text-brutal-dark/30 hover:text-brutal-red'
                            }`}
                          >
                            {m.is_complete ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`font-heading font-bold text-[12px] uppercase tracking-tight-heading leading-snug ${
                              m.is_complete ? 'line-through text-brutal-dark/40' : 'text-brutal-dark'
                            }`}>
                              <span className="font-data text-brutal-red mr-1.5 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                              {m.title}
                            </div>
                            {m.description && (
                              <p className="font-data text-[10px] text-brutal-dark/50 leading-snug mt-1">
                                {m.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleReorderMilestone(m.id, 'up')}
                              disabled={i === 0}
                              aria-label="Move up"
                              className="p-1 rounded text-brutal-dark/45 hover:text-brutal-dark hover:bg-brutal-dark/5 disabled:opacity-20"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderMilestone(m.id, 'down')}
                              disabled={i === arr.length - 1}
                              aria-label="Move down"
                              className="p-1 rounded text-brutal-dark/45 hover:text-brutal-dark hover:bg-brutal-dark/5 disabled:opacity-20"
                            >
                              <ArrowDown size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(m.id)}
                              aria-label="Delete"
                              className="p-1 rounded text-brutal-red hover:bg-brutal-red/10"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </li>
                      ))}
                    {milestones.length === 0 && (
                      <p className="font-data text-[11px] text-brutal-dark/40 italic text-center py-8">
                        No milestones yet — break the build into trackable steps above.
                      </p>
                    )}
                  </ol>
                </BentoCard>
              </div>

              {/* ─── MEDIA — single tabbed card (cols 1-5, row 2) ───── */}
              <div className="lg:col-span-5 lg:row-start-2">
                <BentoCard
                  eyebrow="03 · Showcase"
                  title="Media"
                  className="min-h-[320px]"
                  rightSlot={
                    <div className="flex gap-1 bg-brutal-dark/[0.04] p-1 rounded-lg border-2 border-brutal-dark/10">
                      {([
                        { id: 'gallery', label: 'Cover', icon: ImageIcon, count: project.images?.length || 0 },
                        { id: 'videos', label: 'Videos', icon: VideoIcon, count: videos.length },
                        { id: 'files', label: 'Files', icon: FileText, count: project.files?.length || 0 },
                      ] as const).map((t) => {
                        const Icon = t.icon;
                        const active = mediaTab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setMediaTab(t.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md font-data text-[9px] font-bold uppercase tracking-widest transition-colors ${
                              active
                                ? 'bg-brutal-dark text-brutal-bg shadow-[2px_2px_0_0_rgba(196,41,30,0.6)]'
                                : 'text-brutal-dark/55 hover:bg-brutal-dark/5'
                            }`}
                          >
                            <Icon size={10} />
                            {t.label}
                            <span className={`tabular-nums ${active ? 'text-brutal-red' : 'text-brutal-dark/40'}`}>{t.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  }
                >
                  {/* GALLERY */}
                  {mediaTab === 'gallery' && (
                    <div className="flex flex-col flex-1">
                      <label className="block w-full mb-3 flex-shrink-0">
                        <span className={`flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-brutal-dark/25 rounded-xl font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/60 hover:bg-brutal-dark hover:text-brutal-bg hover:border-brutal-dark cursor-pointer transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingImage ? (
                            <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                          ) : (
                            <><ImageIcon size={12} /> Upload Image — first one becomes cover</>
                          )}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                      </label>
                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 grid grid-cols-3 gap-2 scrollbar-thin">
                        {project.images && project.images.length > 0 ? (
                          project.images.map((img, i) => (
                            <div key={img.id} className="relative group rounded-xl overflow-hidden border-2 border-brutal-dark/12 bg-brutal-dark/5 aspect-[4/3] shadow-[3px_3px_0_0_rgba(196,41,30,0.12)]">
                              <img src={img.image_url} alt={img.caption || `Image ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                              {i === 0 && (
                                <div className="absolute top-1 left-1 bg-brutal-dark text-brutal-bg text-[8px] font-bold px-1.5 py-0.5 rounded font-data uppercase tracking-wider">
                                  Cover
                                </div>
                              )}
                              <button
                                onClick={() => handleDeleteImage(img.id, img.image_url)}
                                aria-label="Delete image"
                                className="absolute top-1 right-1 bg-brutal-red text-brutal-bg p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow"
                                disabled={actionLoading}
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-8 font-data text-[11px] text-brutal-dark/35 italic">
                            First upload becomes the cover.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* VIDEOS */}
                  {mediaTab === 'videos' && (
                    <div className="flex flex-col flex-1">
                      <form onSubmit={handleAddVideo} className="space-y-2 mb-3 flex-shrink-0">
                        <input
                          type="text"
                          placeholder="Video title (optional)"
                          className={inputClass}
                          value={newVideoTitle}
                          onChange={(e) => setNewVideoTitle(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <input
                            ref={newVideoUrlRef}
                            type="url"
                            placeholder="https://youtu.be/…"
                            className={`${inputClass} flex-1 ${videoUrlError ? '!border-brutal-red' : ''}`}
                            value={newVideoUrl}
                            onChange={(e) => { setNewVideoUrl(e.target.value); setVideoUrlError(''); }}
                          />
                          <button
                            type="submit"
                            disabled={addingVideo || !newVideoUrl.trim() || !!videoUrlError}
                            className="bg-brutal-dark text-brutal-bg px-3 rounded-xl border-2 border-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest shadow-[3px_3px_0_0_rgba(196,41,30,0.6)] hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:opacity-30 disabled:shadow-none transition-all flex items-center gap-1"
                          >
                            {addingVideo ? <Loader2 size={11} className="animate-spin" /> : <><Plus size={11} /> Add</>}
                          </button>
                        </div>
                        {videoUrlError && (
                          <p className="font-data text-[10px] text-brutal-red">{videoUrlError}</p>
                        )}
                      </form>
                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 scrollbar-thin">
                        {videos.length > 0 ? (
                          videos.map((vid) => {
                            const thumb = getYoutubeThumbnail(vid.video_url);
                            return (
                              <div key={vid.id} className="flex items-center gap-2 p-2 bg-brutal-bg border-2 border-brutal-dark/12 rounded-xl group shadow-[2px_2px_0_0_rgba(196,41,30,0.10)]">
                                {thumb ? (
                                  <img src={thumb} alt="" loading="lazy" className="w-14 h-9 rounded object-cover flex-shrink-0 border border-brutal-dark/15" />
                                ) : (
                                  <div className="w-14 h-9 rounded bg-brutal-dark/10 flex items-center justify-center flex-shrink-0">
                                    <VideoIcon size={12} className="text-brutal-dark/40" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-data text-[11px] font-bold truncate text-brutal-dark">{vid.title}</div>
                                  <div className="font-data text-[9px] text-brutal-dark/40 truncate">{vid.video_url}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVideo(vid.id)}
                                  aria-label="Remove"
                                  className="text-brutal-red p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 font-data text-[11px] text-brutal-dark/35 italic">
                            Drop a YouTube or Vimeo link to embed.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FILES */}
                  {mediaTab === 'files' && (
                    <div className="flex flex-col flex-1">
                      <label className="block w-full mb-3 flex-shrink-0">
                        <span className={`flex items-center justify-center gap-2 w-full px-3 py-2 bg-brutal-dark text-brutal-bg rounded-xl border-2 border-brutal-dark font-data text-[10px] font-bold uppercase tracking-widest shadow-[3px_3px_0_0_rgba(196,41,30,0.6)] hover:shadow-[4px_4px_0_0_rgba(196,41,30,0.8)] hover:translate-x-[-1px] hover:translate-y-[-1px] cursor-pointer transition-all ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingFile ? (
                            <><Loader2 size={12} className="animate-spin" /> Uploading…</>
                          ) : (
                            <><FileText size={12} /> Attach File</>
                          )}
                        </span>
                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                      </label>
                      <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 scrollbar-thin">
                        {project.files && project.files.length > 0 ? (
                          project.files.map((file) => (
                            <div key={file.id} className="flex items-center gap-2 p-2 bg-brutal-bg border-2 border-brutal-dark/12 rounded-xl group shadow-[2px_2px_0_0_rgba(196,41,30,0.10)]">
                              <div className="w-8 h-8 rounded-lg bg-brutal-dark/5 border border-brutal-dark/10 flex items-center justify-center flex-shrink-0">
                                <FileText size={13} className="text-brutal-dark/55" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-data text-[11px] font-bold truncate text-brutal-dark" title={file.file_name}>{file.file_name}</div>
                                <div className="font-data text-[9px] text-brutal-dark/40">
                                  {file.file_size ? (file.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file.id, file.file_url)}
                                aria-label="Delete file"
                                className="text-brutal-red p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                disabled={actionLoading}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 font-data text-[11px] text-brutal-dark/35 italic">
                            Attach 3D models, code zips, BOM CSVs, PDFs.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </BentoCard>
              </div>

              {/* ─── TEAM — compact card (cols 6-8, row 2) ──────────── */}
              <div className="lg:col-span-3 lg:row-start-2">
                <BentoCard
                  eyebrow="04 · Collaboration"
                  title="Team"
                  className="min-h-[320px]"
                  rightSlot={
                    <span className="font-data text-[11px] font-bold tabular-nums text-brutal-dark border-2 border-brutal-dark/15 rounded-full px-2.5 py-0.5 bg-brutal-bg">
                      {members.length + 1}
                    </span>
                  }
                >
                  <div className="flex gap-1 mb-3 bg-brutal-dark/[0.04] p-1 rounded-lg border-2 border-brutal-dark/10 flex-shrink-0">
                    {(['collaborator', 'mentor'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAddingRole(r)}
                        className={`flex-1 py-1.5 rounded-md font-data text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          addingRole === r
                            ? 'bg-brutal-dark text-brutal-bg shadow-[2px_2px_0_0_rgba(196,41,30,0.6)]'
                            : 'text-brutal-dark/55 hover:bg-brutal-dark/5'
                        }`}
                      >
                        {r === 'collaborator' ? 'Maker' : 'Mentor'}
                      </button>
                    ))}
                  </div>
                  <div className="relative mb-3 flex-shrink-0">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search name or email…"
                      className={`${inputClass} pl-8`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {isSearching && (
                      <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-dark/60 animate-spin" />
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-brutal-bg border-2 border-brutal-dark/20 rounded-xl shadow-[6px_6px_0_0_rgba(196,41,30,0.25)] z-30 max-h-44 overflow-y-auto">
                        {searchResults.map((res) => (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() => handleAddMember(res)}
                            className="w-full text-left p-2.5 hover:bg-brutal-dark/5 border-b border-brutal-dark/8 last:border-0 transition-colors"
                          >
                            <div className="font-data text-[11px] font-bold truncate text-brutal-dark">{res.name}</div>
                            <div className="font-data text-[9px] text-brutal-dark/50 truncate">{res.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2 scrollbar-thin">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-brutal-dark/15 bg-brutal-bg shadow-[2px_2px_0_0_rgba(196,41,30,0.12)]">
                      <div className="w-8 h-8 rounded-full bg-brutal-dark text-brutal-bg font-heading font-bold flex items-center justify-center text-[11px] flex-shrink-0 border-2 border-brutal-dark">
                        {(project as any).ownerName?.charAt(0)?.toUpperCase() || 'O'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-data text-[11px] font-bold truncate text-brutal-dark">{(project as any).ownerName || 'Owner'}</div>
                        <div className="font-data text-[9px] font-bold text-brutal-red uppercase tracking-widest">Owner</div>
                      </div>
                    </div>
                    {members
                      .filter((m: any) => m.user_id !== project.owner_id)
                      .map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-brutal-dark/12 bg-brutal-bg group hover:border-brutal-dark/25 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-brutal-dark/10 text-brutal-dark font-heading font-bold flex items-center justify-center text-[11px] flex-shrink-0 border-2 border-brutal-dark/20">
                            {m.app_user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-data text-[11px] font-bold truncate text-brutal-dark">{m.app_user?.name}</div>
                            <select
                              aria-label={`Role for ${m.app_user?.name || 'member'}`}
                              className="font-data text-[9px] font-bold uppercase tracking-widest bg-transparent text-brutal-dark/55 border-none p-0 focus:ring-0 cursor-pointer"
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                              disabled={project.owner_id !== user?.id}
                            >
                              <option value="collaborator">Collaborator</option>
                              <option value="co-lead">Co-Lead</option>
                              <option value="mentor">Mentor</option>
                            </select>
                          </div>
                          {project.owner_id === user?.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.id)}
                              aria-label="Remove"
                              className="text-brutal-red p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    {members.length === 0 && (
                      <div className="font-data text-[10px] text-brutal-dark/35 italic text-center py-3">
                        Solo build — invite teammates above.
                      </div>
                    )}
                  </div>
                </BentoCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </EditProjectContext.Provider>
  );
}
