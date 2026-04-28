import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useAllEvents, useEventMutations, useSupabaseQuery, useEventHosts, useEventHostMutations } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link, useNavigate } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, X, Image as ImageIcon, UserPlus, UserMinus, Zap, Users as UsersIcon, Mic2, Zap as ZapIcon } from 'lucide-react';
import { EVENT_TYPE_LABELS, EVENT_TYPE_SLUGS, EVENT_TYPE_TAGLINES } from './event-wizard/wizardTypes';
import type { Event, EventType, Badge } from '../../lib/database.types';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';
import { fetchDefaultTTSeries } from '../../lib/api/eventSeries';

// ─── Showcase Slots Admin ───
const ShowcaseSlotsAdmin = ({ eventId }: { eventId: string }) => {
    const [slots, setSlots] = useState<any[]>([]);
    const fetchSlots = async () => {
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, app_user:app_user!user_id(name), project:project!project_id(title)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });
        setSlots(data || []);
    };
    useEffect(() => { fetchSlots(); }, [eventId]);

    const updateStatus = async (id: string, status: string) => {
        await supabase.from('showcase_slot').update({ status }).eq('id', id);
        fetchSlots();
    };

    if (!slots.length) return <div className="p-6 bg-brutal-dark/5 border border-dashed border-brutal-dark/20 text-brutal-dark/60 font-data rounded-xl text-center">No slot requests yet.</div>;

    return (
        <div className="space-y-4">
            {slots.map(slot => (
                <div key={slot.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 bg-white border border-brutal-dark/10 rounded-xl shadow-sm">
                    <div>
                        <div className="font-heading font-bold text-lg leading-tight mb-1">{slot.app_user?.name}</div>
                        {slot.project && <div className="font-data text-sm text-brutal-dark/60 font-bold uppercase tracking-tight">Project: {slot.project.title}</div>}
                        <div className={`mt-2 inline-block px-2 py-0.5 text-[10px] font-bold font-data rounded uppercase ${
                            slot.status === 'approved' ? 'bg-green-100 text-green-700' :
                            slot.status === 'rejected' ? 'bg-brutal-red/10 text-brutal-red' :
                            'bg-yellow-500/20 text-yellow-800'
                        }`}>{slot.status}</div>
                    </div>
                    <div className="flex gap-2">
                        {slot.status === 'pending' && (
                            <>
                                <Button size="sm" onClick={() => updateStatus(slot.id, 'approved')} className="bg-green-600 hover:bg-green-700 border-green-700 text-white">Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => updateStatus(slot.id, 'rejected')} className="border-brutal-red text-brutal-red hover:bg-brutal-red/5">Reject</Button>
                            </>
                        )}
                        {slot.status === 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(slot.id, 'rejected')} className="border-brutal-red text-brutal-red hover:bg-brutal-red/5">Revoke</Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Host Mentor Manager ───
const HostMentorManager = ({ eventId }: { eventId: string }) => {
    const { data: hosts, refetch } = useEventHosts(eventId);
    const { addHost, removeHost } = useEventHostMutations();
    const [mentors, setMentors] = useState<{ id: string; name: string }[]>([]);
    const [selectedMentorId, setSelectedMentorId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMentors = async () => {
            const { data } = await supabase
                .from('app_user')
                .select('id, name')
                .in('role', ['mentor', 'admin'])
                .order('name');
            setMentors(data || []);
        };
        fetchMentors();
    }, []);

    const handleAdd = async () => {
        if (!selectedMentorId || loading) return;
        // Prevent duplicates
        if (hosts?.some(h => h.user_id === selectedMentorId)) return;
        setLoading(true);
        await addHost(eventId, selectedMentorId);
        setSelectedMentorId('');
        await refetch();
        setLoading(false);
    };

    const handleRemove = async (hostId: string) => {
        setLoading(true);
        await removeHost(hostId);
        await refetch();
        setLoading(false);
    };

    // Filter out already-assigned mentors
    const availableMentors = mentors.filter(m => !hosts?.some(h => h.user_id === m.id));

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <select
                    className="flex-1 h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                    value={selectedMentorId}
                    onChange={e => setSelectedMentorId(e.target.value)}
                >
                    <option value="">Select a mentor to add...</option>
                    {availableMentors.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
                <Button size="sm" onClick={handleAdd} disabled={!selectedMentorId || loading}>
                    <UserPlus className="w-4 h-4 mr-1" /> Add
                </Button>
            </div>

            {hosts && hosts.length > 0 ? (
                <div className="space-y-2">
                    {hosts.map(host => (
                        <div key={host.id} className="flex items-center justify-between p-3 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                            <div className="flex items-center gap-3">
                                {host.avatar_url ? (
                                    <img src={host.avatar_url} alt={host.name} className="w-8 h-8 rounded-full object-cover border-2 border-brutal-dark/20" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-brutal-dark/10 flex items-center justify-center font-data text-xs font-bold">
                                        {host.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <span className="font-data text-sm font-bold">{host.name}</span>
                                    <span className="font-data text-[9px] text-brutal-dark/40 uppercase tracking-widest block">Mentor</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleRemove(host.id)}
                                disabled={loading}
                                className="p-1.5 text-brutal-red hover:bg-brutal-red/10 rounded-lg transition-colors"
                                title="Remove host"
                            >
                                <UserMinus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 bg-brutal-dark/5 border border-dashed border-brutal-dark/20 rounded-xl text-center">
                    <p className="font-data text-xs text-brutal-dark/50">No hosts assigned yet. Add mentors above.</p>
                </div>
            )}
        </div>
    );
};

// ─── Gallery Upload Manager ───
const GalleryManager = ({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) => {
    const [uploading, setUploading] = useState(false);
    const { user } = useAuth();

    const handleUpload = async (files: FileList | null) => {
        if (!files || !user) return;
        setUploading(true);
        const newUrls = [...urls];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const path = `${user.id}/gallery/${Date.now()}-${file.name}`;
            const { url } = await uploadFile('event-images', path, file);
            if (url) newUrls.push(url);
        }
        onChange(newUrls);
        setUploading(false);
    };

    const handleRemove = (index: number) => {
        onChange(urls.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {urls.map((url, i) => (
                        <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-brutal-dark/10 group">
                            <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                                onClick={() => handleRemove(i)}
                                className="absolute top-1 right-1 w-5 h-5 bg-brutal-red text-white rounded-full flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="relative border-2 border-dashed border-brutal-dark/20 bg-brutal-dark/5 p-4 rounded text-center hover:bg-brutal-dark/10 cursor-pointer transition-colors">
                <input
                    type="file" accept="image/*" multiple
                    onChange={e => handleUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                />
                <div className="flex flex-col items-center justify-center font-data text-sm text-brutal-dark/60 pointer-events-none">
                    <ImageIcon className="w-5 h-5 mb-1 text-brutal-dark/40" />
                    <span className="font-bold text-xs">{uploading ? 'Uploading...' : 'Add gallery images'}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Main ManageEvents ───
export function ManageEvents() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { data: events, loading, refetch } = useAllEvents();
    const { createEvent, updateEvent, deleteEvent } = useEventMutations();
    // P10 — "New Tech Tuesday" fast action: one click routes to the TT
    // wizard with ?series=<id> so Step 1 is prefilled from the default
    // series and the user lands on Step 2 (speaker/topic/Luma URL only).
    const [ttFastLoading, setTtFastLoading] = useState(false);
    const handleNewTechTuesday = async () => {
        if (ttFastLoading) return;
        setTtFastLoading(true);
        const series = await fetchDefaultTTSeries();
        setTtFastLoading(false);
        if (!series) {
            const go = window.confirm(
                'No Tech Tuesday series exists yet. Create one first?',
            );
            if (go) navigate('/admin/series');
            return;
        }
        navigate(`/admin/events/new/tech-tuesday?series=${series.id}`);
    };

    const { data: badges } = useSupabaseQuery<Partial<Badge>[]>(async () => {
        return supabase.from('badge').select('id, name').order('name');
    }, []);

    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const formRef = useRef<HTMLDivElement>(null);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

    useEffect(() => {
        if (isEditing && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isEditing]);

    // Form state
    const [form, setForm] = useState<Partial<Event>>({
        title: '', event_type: 'maker_meetup', date: new Date().toISOString().slice(0, 16),
        description: '', location: '', capacity: 0, registration_status: 'open', auto_badge_id: null,
        tagline: '', gallery_urls: [], results_summary: '', prizes_info: '', learnings: ''
    });
    const [aboutText, setAboutText] = useState('');
    const [recapText, setRecapText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied</div>;
    }

    const startEdit = (event?: Event) => {
        if (event) {
            setForm({
                ...event,
                date: event.date.slice(0, 16),
                end_date: event.end_date ? event.end_date.slice(0, 16) : undefined,
                gallery_urls: event.gallery_urls || [],
            });
            const [about, recap] = event.description?.includes('---RECAP---')
                ? event.description.split('---RECAP---')
                : [event.description || '', ''];
            setAboutText(about.trim());
            setRecapText(recap?.trim() || '');
            setIsEditing(event.id);
        } else {
            setForm({
                title: '', event_type: 'maker_meetup', date: new Date().toISOString().slice(0, 16),
                capacity: 0, registration_status: 'open', auto_badge_id: null,
                tagline: '', gallery_urls: [], results_summary: '', prizes_info: '', learnings: ''
            });
            setAboutText('');
            setRecapText('');
            setIsEditing('new');
        }
        setImageFile(null);
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setForm({});
        setAboutText('');
        setRecapText('');
        setImageFile(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Inline validation
        const errors: Record<string, string> = {};
        if (!form.title?.trim()) errors.title = 'Event title is required.';
        if (!form.date) errors.date = 'Start date is required.';
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }
        setFieldErrors({});
        setActionLoading(true);

        try {
            let coverUrl = form.cover_image_url;

            if (imageFile && user) {
                const path = `${user.id}/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('event-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const combinedDescription = aboutText.trim() + (recapText.trim() ? '\n---RECAP---\n' + recapText.trim() : '');

            const payload = {
                ...form,
                description: combinedDescription,
                cover_image_url: coverUrl,
                created_by: user?.id,
            } as any;

            if (isEditing === 'new') {
                const { error } = await createEvent(payload);
                if (error) throw new Error(error);
            } else if (isEditing) {
                const { error } = await updateEvent(isEditing, payload);
                if (error) throw new Error(error);
            }

            await refetch();
            cancelEdit();
        } catch (err: any) {
            setFieldErrors({ _form: err.message || 'Failed to save event' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setActionLoading(true);
        await deleteEvent(id);
        await refetch();
        setActionLoading(false);
        setDeleteTarget(null);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading events...</div>;

    const eventTypes: EventType[] = ['build_challenge', 'maker_meetup', 'tech_tuesday'];
    const isPastEvent = form.date ? new Date(form.date) < new Date() : false;

    const eventTypeColors: Record<string, string> = {
        build_challenge: 'bg-brutal-red/10 text-brutal-red border border-brutal-red/30',
        maker_meetup: 'bg-brutal-dark/10 text-brutal-dark border border-brutal-dark/20',
        tech_tuesday: 'bg-blue-100 text-blue-700 border border-blue-300',
    };

    const eventTypeLabels: Record<string, string> = {
        build_challenge: 'Build Challenge',
        maker_meetup: 'Maker Meetup',
        tech_tuesday: 'Tech Tuesday',
    };

    return (
        <AdminPageShell
            role={role}
            title="Event Management"
            subtitle="Schedule and format new lab events, workshops, and inductions."
            icon={CalendarIcon}
            headerAction={undefined}
        >
            {/* ── Delete confirmation card ────────────────────────── */}
            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.title}
                    message="This deletes all event registrations, hosts, and check-ins."
                    cascadeItems={[
                        { label: 'registrations', count: 1 },
                        { label: 'host assignments', count: 1 },
                        { label: 'check-in records', count: 1 },
                    ]}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={actionLoading}
                />
            )}

            {isEditing ? (
                <Card ref={formRef} className="p-5 md:p-6 border-2 border-brutal-dark border-t-[6px] border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)] scroll-mt-32">
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight">
                            {isEditing === 'new' ? 'Schedule New Event' : 'Edit Event'}
                        </h2>
                        <button onClick={cancelEdit} className="p-1.5 hover:bg-brutal-dark/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Input
                                    label="Event Title"
                                    required
                                    value={form.title || ''}
                                    onChange={e => { setForm({...form, title: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.title; return n; }); }}
                                />
                                {fieldErrors.title && <p className="font-data text-[10px] text-brutal-red mt-1">{fieldErrors.title}</p>}
                            </div>
                            <Input
                                label="Tagline (short description)"
                                placeholder="e.g. Build the future of AI at the edge"
                                value={form.tagline || ''}
                                onChange={e => setForm({...form, tagline: e.target.value})}
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Type</label>
                                <select
                                    className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                    value={form.event_type || 'maker_meetup'}
                                    onChange={e => setForm({...form, event_type: e.target.value as EventType})}
                                >
                                    {eventTypes.map(t => (
                                        <option key={t} value={t}>
                                            {t === 'build_challenge' ? 'Build Challenge' : t === 'maker_meetup' ? 'Maker Meetup' : 'Tech Tuesday'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Start Date & Time <span className="text-brutal-red ml-0.5">*</span></label>
                                <input
                                    type="datetime-local" required
                                    className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                    value={form.date || ''}
                                    onChange={e => { setForm({...form, date: e.target.value}); setFieldErrors(prev => { const n = {...prev}; delete n.date; return n; }); }}
                                />
                                {fieldErrors.date && <p className="font-data text-[10px] text-brutal-red mt-1">{fieldErrors.date}</p>}
                            </div>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">End Date & Time (Optional)</label>
                                <input
                                    type="datetime-local"
                                    className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                    value={form.end_date || ''}
                                    onChange={e => setForm({...form, end_date: e.target.value})}
                                />
                            </div>
                            <div>
                                <Input
                                    label="Location (e.g. Main Lab Room A)"
                                    value={form.location?.startsWith('rsvp:') ? '' : (form.location || '')}
                                    onChange={e => setForm({...form, location: e.target.value})}
                                />
                                <div className="mt-4">
                                    <Input
                                      label="External RSVP URL (overrides platform tracking)"
                                      placeholder="https://lu.ma/your-event"
                                      value={form.location?.startsWith('rsvp:') ? form.location.replace('rsvp:', '') : ''}
                                      onChange={e => setForm({...form, location: e.target.value ? `rsvp:${e.target.value}` : ''})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 border-2 border-brutal-dark/10 p-2 rounded-lg bg-brutal-dark/5">
                                <Input
                                    type="number" label="Cap (0 = unlmt)"
                                    value={form.capacity?.toString() || '0'}
                                    onChange={e => setForm({...form, capacity: parseInt(e.target.value) || 0})}
                                />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Reg Status</label>
                                    <select
                                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-2 font-data text-sm focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.registration_status || 'open'}
                                        onChange={e => setForm({...form, registration_status: e.target.value})}
                                    >
                                        <option value="open">Open</option>
                                        <option value="closed">Closed</option>
                                        <option value="waitlist">Waitlist</option>
                                        <option value="invite_only">Invite Only</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Auto-Award Badge on Join (Optional)</label>
                                    <select
                                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-2 font-data text-sm focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.auto_badge_id || ''}
                                        onChange={e => setForm({...form, auto_badge_id: e.target.value || null})}
                                    >
                                        <option value="">None</option>
                                        {badges?.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Cover Image */}
                        <div>
                            <label className="font-data text-sm font-bold text-brutal-dark mb-1 block">Cover Image</label>
                            <div className="flex items-center gap-4">
                                {form.cover_image_url && !imageFile && (
                                    <div className="w-20 h-20 border-2 border-brutal-dark/20 rounded object-cover overflow-hidden">
                                        <img src={form.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className="flex-1 relative border-2 border-dashed border-brutal-dark/20 bg-brutal-dark/5 p-4 rounded text-center hover:bg-brutal-dark/10 cursor-pointer transition-colors">
                                    <input
                                        type="file" accept="image/*"
                                        onChange={e => setImageFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center font-data text-sm text-brutal-dark/60 pointer-events-none">
                                        <ImageIcon className="w-6 h-6 mb-2 text-brutal-dark/40" />
                                        <span className="font-bold">{imageFile ? imageFile.name : 'Select new cover image'}</span>
                                        <span className="text-xs mt-1">PNG, JPG, WEBP</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">About this Event</label>
                                <textarea
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[90px] focus:border-brutal-red focus:outline-none"
                                    value={aboutText}
                                    placeholder="What will makers do in this event?"
                                    onChange={e => setAboutText(e.target.value)}
                                />
                            </div>
                            {(form.event_type === 'tech_tuesday' || isPastEvent) && (
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-red block mb-1">Post-Event Recap (Visible after event)</label>
                                    <textarea
                                        className="w-full bg-brutal-red/5 border-2 border-brutal-red/20 p-3 rounded font-data min-h-[70px] focus:border-brutal-red focus:outline-none"
                                        value={recapText}
                                        placeholder="Summarize what happened, output, winners, etc."
                                        onChange={e => setRecapText(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Post-Event Fields */}
                        <details className="border-2 border-brutal-dark/10 rounded-xl bg-brutal-dark/[0.02] group" open={isPastEvent}>
                            <summary className="cursor-pointer list-none p-4 flex items-center gap-2 select-none">
                                <span className="bg-brutal-red/10 text-brutal-red text-[9px] font-data font-bold px-2 py-0.5 rounded uppercase">Post-Event</span>
                                <h3 className="font-heading font-bold text-sm md:text-base uppercase tracking-tight">
                                    Results, Prizes & Learnings
                                </h3>
                                <span className="ml-auto font-data text-[10px] text-brutal-dark/40 group-open:hidden">Click to expand</span>
                                <span className="ml-auto font-data text-[10px] text-brutal-dark/40 hidden group-open:inline">Click to collapse</span>
                            </summary>
                            <div className="px-4 pb-4 space-y-4">
                                <p className="font-data text-[10px] text-brutal-dark/40">These fields are displayed after the event concludes. Fill them in when ready.</p>

                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Results Summary</label>
                                <textarea
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[70px] focus:border-brutal-red focus:outline-none"
                                    value={form.results_summary || ''}
                                    placeholder="Who won? What were the outcomes?"
                                    onChange={e => setForm({...form, results_summary: e.target.value})}
                                />
                            </div>

                            {form.event_type === 'build_challenge' && (
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Prizes & Recognition</label>
                                    <textarea
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[70px] focus:border-brutal-red focus:outline-none"
                                        value={form.prizes_info || ''}
                                        placeholder="Describe prizes, awards, and recognitions given."
                                        onChange={e => setForm({...form, prizes_info: e.target.value})}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Key Learnings</label>
                                <textarea
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[70px] focus:border-brutal-red focus:outline-none"
                                    value={form.learnings || ''}
                                    placeholder="What did participants learn? What insights emerged?"
                                    onChange={e => setForm({...form, learnings: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Event Gallery</label>
                                <GalleryManager
                                    urls={form.gallery_urls || []}
                                    onChange={(urls) => setForm({...form, gallery_urls: urls})}
                                />
                            </div>
                            </div>
                        </details>

                        {fieldErrors._form && (
                            <div className="flex items-center gap-2 p-3 bg-brutal-red/10 border border-brutal-red/30 rounded-lg">
                                <p className="font-data text-xs text-brutal-red font-bold">{fieldErrors._form}</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-5 border-t-2 border-brutal-dark/10">
                            <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                            <Button type="submit" disabled={actionLoading}>
                                {actionLoading ? 'Saving...' : 'Save Event'}
                            </Button>
                        </div>
                    </form>

                    {/*
                      Secondary panels (Hosted By, Showcase Slots) — collapsed into
                      <details> disclosures so the primary form isn't crowded. They
                      only render when editing an existing event (need an event ID).
                    */}
                    {isEditing !== 'new' && (
                        <div className="mt-8 space-y-3">
                            <details className="border-2 border-brutal-dark/10 rounded-xl bg-brutal-dark/[0.02] group">
                                <summary className="cursor-pointer list-none p-4 flex items-center gap-2 select-none">
                                    <span className="bg-brutal-dark/10 text-brutal-dark/70 text-[9px] font-data font-bold px-2 py-0.5 rounded uppercase">Hosts</span>
                                    <h3 className="font-heading font-bold text-sm md:text-base uppercase tracking-tight">Hosted By</h3>
                                    <span className="ml-auto font-data text-[10px] text-brutal-dark/40 group-open:hidden">Click to expand</span>
                                    <span className="ml-auto font-data text-[10px] text-brutal-dark/40 hidden group-open:inline">Click to collapse</span>
                                </summary>
                                <div className="px-4 pb-4">
                                    <p className="font-data text-[11px] text-brutal-dark/50 mb-4">Assign mentors who host this event. Their names and avatars appear on the event page.</p>
                                    <HostMentorManager eventId={isEditing as string} />
                                </div>
                            </details>

                            {(form.event_type === 'maker_meetup' || form.event_type === 'tech_tuesday') && (
                                <details className="border-2 border-brutal-dark/10 rounded-xl bg-brutal-dark/[0.02] group">
                                    <summary className="cursor-pointer list-none p-4 flex items-center gap-2 select-none">
                                        <span className="bg-brutal-dark/10 text-brutal-dark/70 text-[9px] font-data font-bold px-2 py-0.5 rounded uppercase">Slots</span>
                                        <h3 className="font-heading font-bold text-sm md:text-base uppercase tracking-tight">Showcase Slot Requests</h3>
                                        <span className="ml-auto font-data text-[10px] text-brutal-dark/40 group-open:hidden">Click to expand</span>
                                        <span className="ml-auto font-data text-[10px] text-brutal-dark/40 hidden group-open:inline">Click to collapse</span>
                                    </summary>
                                    <div className="px-4 pb-4">
                                        <ShowcaseSlotsAdmin eventId={isEditing as string} />
                                    </div>
                                </details>
                            )}
                        </div>
                    )}
                </Card>
            ) : (
                <>
                {/*
                  ── Fast action: "New Tech Tuesday" (P10) ───────────
                  Single-click path for the weekly cadence. Pulls the
                  default event_series, routes to the TT wizard with
                  ?series=<id> so Step 1 is prefilled (title template,
                  location, cover, duration) and the user lands on
                  Step 2 to enter speaker / topic / Luma URL.
                */}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Button
                        onClick={handleNewTechTuesday}
                        disabled={ttFastLoading}
                        className="bg-blue-600 hover:bg-blue-700 border-blue-700 text-white"
                    >
                        <ZapIcon className="w-4 h-4 mr-2" />
                        {ttFastLoading ? 'Loading…' : 'New Tech Tuesday (90-second publish)'}
                    </Button>
                    <Link
                        to="/admin/series"
                        className="font-data text-xs text-brutal-dark/60 underline hover:text-brutal-dark"
                    >
                        Manage series →
                    </Link>
                    <Link
                        to="/admin/speakers"
                        className="font-data text-xs text-brutal-dark/60 underline hover:text-brutal-dark"
                    >
                        Speaker pitches →
                    </Link>
                </div>

                {/*
                  ── Create new event: three type-cards ──────────────
                  Replaces the single "New Event" button. Each card routes
                  to its own wizard at /admin/events/new/<slug>, which
                  keeps the creation flow focused on exactly the fields
                  that type needs (no more 20-field omnibus form for a
                  Tech Tuesday). See src/pages/admin/event-wizard/.
                */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <NewEventCard
                        type="build_challenge"
                        icon={Zap}
                        accentClass="text-brutal-red border-brutal-red/30 hover:border-brutal-red"
                    />
                    <NewEventCard
                        type="maker_meetup"
                        icon={UsersIcon}
                        accentClass="text-brutal-dark border-brutal-dark/30 hover:border-brutal-dark"
                    />
                    <NewEventCard
                        type="tech_tuesday"
                        icon={Mic2}
                        accentClass="text-blue-700 border-blue-300 hover:border-blue-500"
                    />
                </div>

                {/* ── Event list ───────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4">
                    {events?.map(event => {
                        const isPast = new Date(event.date) < new Date();
                        return (
                            <div
                                key={event.id}
                                className={`border-2 border-brutal-dark bg-brutal-bg shadow-[6px_6px_0_0_rgba(17,17,17,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_rgba(17,17,17,1)] transition-all duration-200 ease-magnetic p-4 flex items-center justify-between group ${isPast ? 'opacity-70' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-brutal-dark/10 overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                        {event.cover_image_url ? (
                                            <img src={event.cover_image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brutal-dark/20">
                                                <CalendarIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-heading font-bold text-xl uppercase">{event.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 font-data text-xs font-bold text-brutal-dark/60 flex-wrap">
                                            <span className={`px-2 py-0.5 uppercase ${eventTypeColors[event.event_type] || 'bg-brutal-dark/5 text-brutal-dark/60'}`}>
                                                {eventTypeLabels[event.event_type] || event.event_type}
                                            </span>
                                            <span>• {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <span className={`px-2 py-0.5 uppercase ${
                                                isPast ? 'bg-brutal-dark/10 text-brutal-dark/40 border border-brutal-dark/20' :
                                                event.registration_status === 'open' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
                                            }`}>
                                                {isPast ? 'Past' : event.registration_status}
                                            </span>
                                            {event.capacity ? <span>• Cap: {event.capacity}</span> : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {/* P7 — clicking Edit opens the ops console at /admin/events/:id.
                                        The legacy inline-edit form remains in this file for any stray
                                        code paths (e.g. keyboard shortcuts), but the primary host
                                        workflow now goes through the tabbed console. */}
                                    <Link
                                        to={`/admin/events/${event.id}`}
                                        className="p-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white transition-colors inline-flex items-center"
                                        title="Open console"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => setDeleteTarget(event)}
                                        className="p-2 border-2 border-brutal-red/20 text-brutal-red hover:bg-brutal-red hover:text-white transition-colors"
                                        title="Delete" disabled={actionLoading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {events?.length === 0 && (
                        <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                            No events found. Create one above.
                        </div>
                    )}
                </div>
                </>
            )}
        </AdminPageShell>
    );
}

// ─── "Create <type>" card ─────────────────────────────────────────
// Each card routes to its own wizard. The three wizards share a common
// shell (src/pages/admin/event-wizard/WizardShell.tsx) but are scoped
// to a single event type at the URL level so the creation flow is
// uncluttered by fields that don't apply to that type.

function NewEventCard({
    type,
    icon: Icon,
    accentClass,
}: {
    type: keyof typeof EVENT_TYPE_LABELS;
    icon: React.ComponentType<{ className?: string }>;
    accentClass: string;
}) {
    return (
        <Link
            to={`/admin/events/new/${EVENT_TYPE_SLUGS[type]}`}
            className={`border-2 bg-white rounded-xl p-5 flex flex-col gap-2 transition-all ${accentClass} shadow-[4px_4px_0_0_rgba(17,17,17,0.08)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_rgba(17,17,17,0.12)]`}
        >
            <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                <h3 className="font-heading font-bold text-base uppercase tracking-tight">
                    New {EVENT_TYPE_LABELS[type]}
                </h3>
            </div>
            <p className="font-data text-xs text-brutal-dark/60 leading-relaxed">
                {EVENT_TYPE_TAGLINES[type]}
            </p>
            <span className="mt-auto pt-2 font-data text-[11px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Start
            </span>
        </Link>
    );
}
