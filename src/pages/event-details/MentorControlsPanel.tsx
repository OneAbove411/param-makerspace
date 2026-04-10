import React, { useState, useEffect } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useMyEventWebsite, useEventWebsiteMutations } from '../../lib/hooks';
import { WebsiteUploadPanel } from '../../components/event/WebsiteUploadPanel';

type MentorTab = 'page' | 'registrations' | 'slots';

const MentorControlsPanel = ({ eventId, user }: { eventId: string; user: any }) => {
    // ─── HOOKS — MUST be called unconditionally, in the same order every render ───
    const isMentorOrAdmin = !!user && (user.role === 'mentor' || user.role === 'admin');

    const [activeTab, setActiveTab] = useState<MentorTab>('page');
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [slots, setSlots] = useState<any[]>([]);
    const [loadingRegs, setLoadingRegs] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Pass undefined when not a mentor so the query no-ops, but the hook is still called.
    const { data: myWebsite, refetch: refetchMyWebsite } = useMyEventWebsite(isMentorOrAdmin ? eventId : undefined as any);
    const { submitWebsite, updateWebsite, deleteWebsite } = useEventWebsiteMutations();

    const fetchRegistrations = async () => {
        setLoadingRegs(true);
        const { data } = await supabase
            .from('event_registration')
            .select('id, user_id, registered_at, app_user:app_user!user_id(name, email)')
            .eq('event_id', eventId)
            .order('registered_at', { ascending: false });
        setRegistrations(data || []);
        setLoadingRegs(false);
    };

    const fetchSlots = async () => {
        setLoadingSlots(true);
        const { data } = await supabase
            .from('showcase_slot')
            .select('id, status, user_id, project:project!project_id(id, title), app_user:app_user!user_id(name)')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false });
        setSlots(data || []);
        setLoadingSlots(false);
    };

    // Fetch on tab change (only when data needed). Hook is always called.
    useEffect(() => {
        if (!isMentorOrAdmin) return;
        if (activeTab === 'registrations' && registrations.length === 0 && !loadingRegs) {
            fetchRegistrations();
        }
        if (activeTab === 'slots' && slots.length === 0 && !loadingSlots) {
            fetchSlots();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, isMentorOrAdmin]);

    // ─── Now we can early-return safely (all hooks have been called) ───
    if (!isMentorOrAdmin) return null;

    const handleSlotAction = async (slotId: string, newStatus: string) => {
        setActionLoading(slotId);
        await supabase.from('showcase_slot').update({ status: newStatus }).eq('id', slotId);
        setActionLoading(null);
        fetchSlots();
    };

    const handleWebsiteSubmit = async (data: { title: string; description: string; html_content: string | null; file_url: string | null; host_names: string[]; }) => {
        if (myWebsite) {
            const { error } = await updateWebsite(myWebsite.id, {
                title: data.title,
                description: data.description || undefined,
                html_content: data.html_content || undefined,
                file_url: data.file_url || undefined,
                host_names: data.host_names,
                status: 'approved', // mentors auto-publish their own page
            } as any);
            if (error) throw new Error(error);
        } else {
            const { data: created, error } = await submitWebsite({
                event_id: eventId,
                user_id: user.id,
                title: data.title,
                description: data.description || undefined,
                html_content: data.html_content || undefined,
                file_url: data.file_url || undefined,
                host_names: data.host_names,
            });
            if (error) throw new Error(error);
            // Auto-publish: flip status to approved right after insert
            if (created?.id) {
                const { error: updErr } = await updateWebsite(created.id, { status: 'approved' } as any);
                if (updErr) throw new Error(updErr);
            }
        }
        await refetchMyWebsite();
    };

    const handleWebsiteDelete = async () => {
        if (myWebsite && deleteWebsite) {
            await deleteWebsite(myWebsite.id);
            await refetchMyWebsite();
        }
    };

    const websiteStatusLabel = myWebsite
        ? (myWebsite.status === 'approved' ? 'Live' : myWebsite.status === 'pending' ? 'Draft' : 'Rejected')
        : 'Empty';

    const tabs: { key: MentorTab; label: string; count?: number | string }[] = [
        { key: 'page', label: 'Event Page', count: websiteStatusLabel },
        { key: 'registrations', label: 'Registrations', count: registrations.length },
        { key: 'slots', label: 'Showcase Slots', count: slots.length },
    ];

    const pendingSlots = slots.filter(s => s.status === 'pending');
    const totalPending = pendingSlots.length;

    return (
        <section className="ed-section">
            {/* Header bar — always visible, not collapsible */}
            <div className="flex items-center justify-between gap-3 mb-3 px-1">
                <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-brutal-red" />
                    <span className="font-heading font-bold text-sm uppercase tracking-wider text-brutal-dark">Mentor Workspace</span>
                    {totalPending > 0 && (
                        <span className="bg-brutal-red text-brutal-bg text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {totalPending} pending
                        </span>
                    )}
                </div>
                <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35">
                    Only you see this
                </span>
            </div>

            <div className="border-2 border-brutal-dark/10 rounded-2xl overflow-hidden bg-brutal-bg">
                {/* Tab bar */}
                <div className="flex border-b-2 border-brutal-dark/10 bg-brutal-dark/[0.03]">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-3 px-4 font-data text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                activeTab === tab.key
                                    ? 'bg-brutal-dark text-brutal-bg'
                                    : 'text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/10'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count !== '' && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.key ? 'bg-brutal-bg/20' : 'bg-brutal-dark/10'
                                }`}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="p-4 md:p-5">
                    {/* PAGE (WEBSITE) TAB */}
                    {activeTab === 'page' && (
                        <div>
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                                        {myWebsite ? 'Your Event Page' : 'Set up your event page'}
                                    </h4>
                                    <p className="font-data text-[11px] text-brutal-dark/55 mt-0.5">
                                        {myWebsite
                                            ? 'This is what everyone sees at the top of the event. Updates go live immediately.'
                                            : 'Upload an HTML file with your event details — it will render at the top of this page for all visitors.'}
                                    </p>
                                </div>
                            </div>
                            <WebsiteUploadPanel
                                eventId={eventId}
                                userId={user.id}
                                userName={user.full_name || user.name || user.email || 'Mentor'}
                                existingSubmission={myWebsite || null}
                                onSubmit={handleWebsiteSubmit}
                                onDelete={myWebsite ? handleWebsiteDelete : undefined}
                                isRegistered={true}
                                mentorMode={true}
                            />
                        </div>
                    )}

                    {/* REGISTRATIONS TAB */}
                    {activeTab === 'registrations' && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loadingRegs ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading registrations...</p>
                            ) : registrations.length === 0 ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No registrations yet.</p>
                            ) : (
                                registrations.map((reg, i) => (
                                    <div key={reg.id} className="flex items-center justify-between py-2 px-3 bg-brutal-dark/[0.03] rounded-lg border border-brutal-dark/5">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="font-data text-[10px] text-brutal-dark/30 w-6 flex-shrink-0">{i + 1}.</span>
                                            <div className="min-w-0">
                                                <span className="font-data text-xs font-bold block truncate">{reg.app_user?.name || 'Unknown'}</span>
                                                <span className="font-data text-[10px] text-brutal-dark/40 truncate">{reg.app_user?.email}</span>
                                            </div>
                                        </div>
                                        <span className="font-data text-[9px] text-brutal-dark/30 flex-shrink-0 ml-2">
                                            {new Date(reg.registered_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* SHOWCASE SLOTS TAB */}
                    {activeTab === 'slots' && (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {loadingSlots ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">Loading slots...</p>
                            ) : slots.length === 0 ? (
                                <p className="font-data text-xs text-brutal-dark/40 text-center py-8">No slot requests yet.</p>
                            ) : (
                                slots.map(slot => (
                                    <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-brutal-dark/[0.03] rounded-lg border border-brutal-dark/5">
                                        <div className="flex-1 min-w-0">
                                            <span className="font-data text-xs font-bold block">{slot.app_user?.name || 'Unknown'}</span>
                                            <span className="font-data text-[10px] text-brutal-dark/50 block truncate">
                                                {slot.project?.title || 'No project linked'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3 shrink-0">
                                            {slot.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleSlotAction(slot.id, 'approved')}
                                                        disabled={actionLoading === slot.id}
                                                        className="bg-green-500 text-white p-1.5 rounded-lg hover:bg-green-600 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSlotAction(slot.id, 'rejected')}
                                                        disabled={actionLoading === slot.id}
                                                        className="bg-brutal-red text-white p-1.5 rounded-lg hover:bg-red-700 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`font-data text-[9px] font-bold uppercase px-2 py-1 rounded-full ${
                                                    slot.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>{slot.status}</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default MentorControlsPanel;
