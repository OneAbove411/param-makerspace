import React, { useEffect, useState } from 'react';
import { Presentation, CheckCircle, XCircle, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface Props {
    eventId: string;
    eventType: string;
}

interface Project {
    id: string;
    title: string;
}

interface SlotWithUser {
    id: string;
    event_id: string;
    user_id: string;
    project_id: string | null;
    topic?: string | null;
    status: string;
    created_at: string;
    user: { name: string; email: string } | null;
    project: { title: string } | null;
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'approved':
            return 'bg-green-500/15 text-green-700 border-green-500/30';
        case 'rejected':
            return 'bg-brutal-red/15 text-brutal-red border-brutal-red/30';
        case 'pending':
        default:
            return 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30';
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'approved':
            return <CheckCircle className="w-4 h-4" />;
        case 'rejected':
            return <XCircle className="w-4 h-4" />;
        case 'pending':
        default:
            return <Presentation className="w-4 h-4" />;
    }
}

function getStatusText(status: string): string {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'pending':
        default:
            return 'Pending';
    }
}

export function ShowcaseSlotBooking({ eventId, eventType }: Props) {
    // Only render for maker_meetup events
    if (eventType !== 'maker_meetup') {
        return null;
    }

    const { user, role } = useAuth();
    const isAdmin = role === 'admin' || role === 'mentor';

    const [slots, setSlots] = useState<SlotWithUser[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [expandForm, setExpandForm] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [topic, setTopic] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [processingSlot, setProcessingSlot] = useState<string | null>(null);

    // Fetch slots for this event
    useEffect(() => {
        const fetchSlots = async () => {
            setLoadingSlots(true);
            try {
                const { data, error } = await supabase
                    .from('showcase_slot')
                    .select(
                        'id, event_id, user_id, project_id, topic, status, created_at'
                    )
                    .eq('event_id', eventId);

                if (error) throw error;

                // Enrich with user and project info
                const enriched: SlotWithUser[] = [];
                for (const slot of (data || []) as any[]) {
                    const { data: userData } = await supabase.from('app_user').select('name, email').eq('id', slot.user_id).single();
                    const projectData = slot.project_id
                        ? (await supabase.from('project').select('title').eq('id', slot.project_id).single()).data
                        : null;
                    enriched.push({
                        ...slot,
                        user: userData || { name: 'Unknown', email: '' },
                        project: projectData || null,
                    });
                }
                setSlots(enriched);
            } catch (err) {
                console.error('Failed to fetch showcase slots:', err);
                setSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [eventId]);

    // Fetch user's projects when form expands
    useEffect(() => {
        if (!expandForm || !user) return;

        const fetchProjects = async () => {
            setLoadingProjects(true);
            try {
                const { data, error } = await supabase
                    .from('project')
                    .select('id, title')
                    .eq('owner_id', user.id);

                if (error) throw error;
                setProjects((data || []) as Project[]);
            } catch (err) {
                console.error('Failed to fetch projects:', err);
                setProjects([]);
            } finally {
                setLoadingProjects(false);
            }
        };

        fetchProjects();
    }, [expandForm, user]);

    const userSlot = user ? slots.find((s) => s.user_id === user.id) : null;

    const handleSubmitSlot = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.from('showcase_slot').insert({
                event_id: eventId,
                user_id: user.id,
                project_id: selectedProjectId || null,
                topic: topic || null,
            });

            if (error) throw error;

            // Refetch slots (re-enrich)
            const { data: rawSlots, error: fetchError } = await supabase
                .from('showcase_slot')
                .select('id, event_id, user_id, project_id, topic, status, created_at')
                .eq('event_id', eventId);

            if (fetchError) throw fetchError;
            const enriched: SlotWithUser[] = [];
            for (const slot of (rawSlots || []) as any[]) {
                const { data: userData } = await supabase.from('app_user').select('name, email').eq('id', slot.user_id).single();
                const projectData = slot.project_id
                    ? (await supabase.from('project').select('title').eq('id', slot.project_id).single()).data
                    : null;
                enriched.push({ ...slot, user: userData || { name: 'Unknown', email: '' }, project: projectData || null });
            }
            setSlots(enriched);
            setExpandForm(false);
            setSelectedProjectId('');
            setTopic('');
        } catch (err) {
            console.error('Failed to submit showcase slot:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveSlot = async (slotId: string) => {
        setProcessingSlot(slotId);
        try {
            const { error } = await supabase
                .from('showcase_slot')
                .update({ status: 'approved' })
                .eq('id', slotId);

            if (error) throw error;

            // Update local state
            setSlots((prev) =>
                prev.map((s) => (s.id === slotId ? { ...s, status: 'approved' } : s))
            );
        } catch (err) {
            console.error('Failed to approve slot:', err);
        } finally {
            setProcessingSlot(null);
        }
    };

    const handleRejectSlot = async (slotId: string) => {
        setProcessingSlot(slotId);
        try {
            const { error } = await supabase
                .from('showcase_slot')
                .update({ status: 'rejected' })
                .eq('id', slotId);

            if (error) throw error;

            // Update local state
            setSlots((prev) =>
                prev.map((s) => (s.id === slotId ? { ...s, status: 'rejected' } : s))
            );
        } catch (err) {
            console.error('Failed to reject slot:', err);
        } finally {
            setProcessingSlot(null);
        }
    };

    // ─── ADMIN VIEW ───
    if (isAdmin) {
        return (
            <section className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Presentation className="w-5 h-5 text-brutal-dark" />
                        <h2 className="font-heading font-bold text-brutal-dark uppercase tracking-tight text-lg">
                            Showcase Slots
                        </h2>
                    </div>
                    <div className="inline-flex items-center justify-center bg-brutal-dark/10 px-3 py-1 rounded-full">
                        <span className="font-data text-xs font-bold text-brutal-dark/60 uppercase tracking-wide">
                            {slots.length}
                        </span>
                    </div>
                </div>

                {loadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 text-brutal-dark/40 animate-spin" />
                    </div>
                ) : slots.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Presentation className="w-10 h-10 text-brutal-dark/20 mx-auto mb-3" />
                        <p className="font-data text-sm text-brutal-dark/60 font-bold uppercase">
                            No slot requests yet
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {slots.map((slot) => (
                            <Card key={slot.id} className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <p className="font-heading font-bold text-brutal-dark text-sm uppercase tracking-tight">
                                            {slot.user?.name || 'Unknown'}
                                        </p>
                                        <p className="font-data text-xs text-brutal-dark/60">
                                            {slot.project?.title || slot.topic || 'No project selected'}
                                        </p>
                                        <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wide">
                                            {new Date(slot.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-data text-xs font-bold uppercase tracking-wide',
                                                getStatusColor(slot.status)
                                            )}
                                        >
                                            {getStatusIcon(slot.status)}
                                            {getStatusText(slot.status)}
                                        </div>

                                        {slot.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="primary"
                                                    loading={processingSlot === slot.id}
                                                    onClick={() => handleApproveSlot(slot.id)}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    loading={processingSlot === slot.id}
                                                    onClick={() => handleRejectSlot(slot.id)}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        );
    }

    // ─── USER VIEW ───
    return (
        <section className="space-y-4">
            <div className="flex items-center gap-2">
                <Presentation className="w-5 h-5 text-brutal-dark" />
                <h2 className="font-heading font-bold text-brutal-dark uppercase tracking-tight text-lg">
                    Showcase Slots
                </h2>
            </div>

            {userSlot ? (
                <Card className="p-6 border-2 border-brutal-dark/20">
                    <div className="flex items-start gap-4">
                        <div
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border font-data text-xs font-bold uppercase tracking-wide flex-shrink-0',
                                getStatusColor(userSlot.status)
                            )}
                        >
                            {getStatusIcon(userSlot.status)}
                            {getStatusText(userSlot.status)}
                        </div>
                        <div className="flex-1">
                            <p className="font-heading font-bold text-brutal-dark text-sm uppercase tracking-tight mb-1">
                                {userSlot.status === 'approved'
                                    ? 'Your showcase slot is confirmed'
                                    : userSlot.status === 'rejected'
                                      ? 'Your slot request was not approved'
                                      : 'Your slot request is pending'}
                            </p>
                            {userSlot.project?.title || userSlot.topic ? (
                                <p className="font-data text-sm text-brutal-dark/60">
                                    {userSlot.project?.title || userSlot.topic}
                                </p>
                            ) : null}
                            {userSlot.status === 'rejected' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => setExpandForm(true)}
                                >
                                    <Plus className="w-4 h-4" />
                                    Submit Again
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className={cn('p-6 border-2', expandForm ? 'border-brutal-dark/20' : 'border-brutal-dark/10')}>
                    {!expandForm ? (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => setExpandForm(true)}
                            className="w-full"
                        >
                            <Plus className="w-4 h-4" />
                            Request a Showcase Slot
                        </Button>
                    ) : (
                        <form onSubmit={handleSubmitSlot} className="space-y-4">
                            <div>
                                <label className="block font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70 mb-2">
                                    Project
                                </label>
                                {loadingProjects ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-4 h-4 text-brutal-dark/40 animate-spin" />
                                    </div>
                                ) : (
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border-2 border-brutal-dark/15 focus:border-brutal-red focus:outline-none font-data text-sm"
                                    >
                                        <option value="">-- Select a project (optional) --</option>
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block font-data text-xs font-bold uppercase tracking-wide text-brutal-dark/70 mb-2">
                                    Topic (optional)
                                </label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Robotics, Web Dev, AI"
                                    className="w-full px-3 py-2 rounded-lg border-2 border-brutal-dark/15 focus:border-brutal-red focus:outline-none font-data text-sm"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    loading={submitting}
                                    className="flex-1"
                                >
                                    Submit Request
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="md"
                                    onClick={() => {
                                        setExpandForm(false);
                                        setSelectedProjectId('');
                                        setTopic('');
                                    }}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    )}
                </Card>
            )}
        </section>
    );
}
