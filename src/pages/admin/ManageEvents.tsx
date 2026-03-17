import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useAllEvents, useEventMutations, useSupabaseQuery } from '../../lib/hooks';
import { uploadFile } from '../../lib/storage';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, X, Image as ImageIcon } from 'lucide-react';
import type { Event, EventType, Badge } from '../../lib/database.types';

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

export function ManageEvents() {
    const { user, role } = useAuth();
    const { data: events, loading, refetch } = useAllEvents();
    const { createEvent, updateEvent, deleteEvent } = useEventMutations();
    
    // Fetch badges for the auto-award dropdown
    const { data: badges } = useSupabaseQuery<Partial<Badge>[]>(async () => {
        return supabase.from('badge').select('id, name').order('name');
    }, []);
    
    const [isEditing, setIsEditing] = useState<string | 'new' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Form state
    const [form, setForm] = useState<Partial<Event>>({
        title: '', event_type: 'maker_meetup', date: new Date().toISOString().slice(0, 16), 
        description: '', location: '', capacity: 0, registration_status: 'open', auto_badge_id: null
    });
    const [aboutText, setAboutText] = useState('');
    const [recapText, setRecapText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);

    // Both Admin and Mentor can manage events
    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied</div>;
    }

    const startEdit = (event?: Event) => {
        if (event) {
            setForm({
                ...event,
                date: event.date.slice(0, 16), // Format for datetime-local input
                end_date: event.end_date ? event.end_date.slice(0, 16) : undefined
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
                capacity: 0, registration_status: 'open', auto_badge_id: null 
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
            alert(err.message || 'Failed to save event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure? This deletes all event registrations and check-ins.")) return;
        setActionLoading(true);
        await deleteEvent(id);
        await refetch();
        setActionLoading(false);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading events...</div>;

    const eventTypes = ['build_challenge', 'maker_meetup', 'tech_tuesday'];

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        {role === 'admin' ? 'Admin Panel' : 'Mentor Tools'}
                    </span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                            <CalendarIcon className="w-10 h-10 text-brutal-red" />
                            Event Management
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            Schedule and format new lab events, workshops, and inductions.
                        </p>
                    </div>
                    {!isEditing && (
                        <Button onClick={() => startEdit()}>
                            <Plus className="w-5 h-5 mr-2" /> New Event
                        </Button>
                    )}
                </div>

                {isEditing ? (
                    <Card className="p-8 border-2 border-brutal-dark/20 border-t-8 border-t-brutal-red shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-heading font-bold text-3xl uppercase">
                                {isEditing === 'new' ? 'Schedule New Event' : 'Edit Event'}
                            </h2>
                            <button onClick={cancelEdit} className="p-2 hover:bg-brutal-dark/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input 
                                    label="Event Title" 
                                    required 
                                    value={form.title || ''} 
                                    onChange={e => setForm({...form, title: e.target.value})} 
                                />
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Type</label>
                                    <select 
                                        className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.event_type || 'maker_meetup'}
                                        onChange={e => setForm({...form, event_type: e.target.value as EventType})}
                                    >
                                        {eventTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Start Date & Time</label>
                                    <input 
                                        type="datetime-local" required
                                        className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
                                        value={form.date || ''}
                                        onChange={e => setForm({...form, date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">End Date & Time (Optional)</label>
                                    <input 
                                        type="datetime-local" 
                                        className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-4 font-data focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
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
                                            className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-2 font-data text-sm focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
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
                                            className="w-full h-12 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-2 font-data text-sm focus:border-brutal-red focus:ring-1 focus:ring-brutal-red outline-none"
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

                            <div className="space-y-4">
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
                                                type="file" 
                                                accept="image/*"
                                                onChange={e => setImageFile(e.target.files?.[0] || null)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center justify-center font-data text-sm text-brutal-dark/60 pointer-events-none">
                                                <ImageIcon className="w-6 h-6 mb-2 text-brutal-dark/40" />
                                                <span className="font-bold">{imageFile ? imageFile.name : 'Select new cover image'}</span>
                                                <span className="text-xs mt-1">PNG, JPG, WEBP • Max 5MB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="font-data text-sm font-bold text-brutal-dark block mb-1">About this Event</label>
                                        <textarea 
                                            className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[120px] focus:border-brutal-red focus:outline-none" 
                                            value={aboutText} 
                                            placeholder="What will makers do in this event?"
                                            onChange={e => setAboutText(e.target.value)} 
                                        />
                                    </div>
                                    {(form.event_type === 'tech_tuesday' || (form.date && new Date(form.date) < new Date())) && (
                                        <div>
                                            <label className="font-data text-sm font-bold text-brutal-red block mb-1">Post-Event Recap (Visible after event)</label>
                                            <textarea 
                                                className="w-full bg-brutal-red/5 border-2 border-brutal-red/20 p-3 rounded font-data min-h-[120px] focus:border-brutal-red focus:outline-none" 
                                                value={recapText} 
                                                placeholder="Summarize what happened, output, winners, etc."
                                                onChange={e => setRecapText(e.target.value)} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-6 border-t-2 border-brutal-dark/10">
                                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={actionLoading}>Cancel</Button>
                                <Button type="submit" disabled={actionLoading}>
                                    {actionLoading ? 'Saving...' : 'Save Event'}
                                </Button>
                            </div>
                        </form>

                        {isEditing !== 'new' && form.event_type === 'maker_meetup' && (
                            <div className="mt-12 pt-8 border-t-4 border-brutal-dark/10">
                                <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">Showcase Slots Management</h3>
                                <ShowcaseSlotsAdmin eventId={isEditing as string} />
                            </div>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {events?.map(event => (
                            <Card key={event.id} className="p-4 border-2 flex items-center justify-between group hover:border-brutal-red/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-brutal-dark/10 rounded object-cover overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                        {event.cover_image_url ? (
                                            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brutal-dark/20">
                                                <CalendarIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-heading font-bold text-xl uppercase">{event.title}</h3>
                                        <div className="flex items-center gap-2 mt-1 font-data text-xs font-bold text-brutal-dark/60">
                                            <span className="px-2 py-0.5 rounded bg-brutal-dark/10 text-brutal-dark uppercase">
                                                {event.event_type}
                                            </span>
                                            <span>• {new Date(event.date).toLocaleDateString()}</span>
                                            <span className={`px-2 py-0.5 rounded uppercase ${
                                                event.registration_status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {event.registration_status}
                                            </span>
                                            {event.capacity ? <span>• Cap: {event.capacity}</span> : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => startEdit(event)}
                                        className="p-2 border-2 border-brutal-dark/20 rounded hover:bg-brutal-dark hover:text-white transition-colors"
                                        title="Edit"
                                        disabled={actionLoading}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(event.id)}
                                        className="p-2 border-2 border-brutal-red/20 text-brutal-red rounded hover:bg-brutal-red hover:text-white transition-colors"
                                        title="Delete"
                                        disabled={actionLoading}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                        {events?.length === 0 && (
                            <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                                No events found. Create one above.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
