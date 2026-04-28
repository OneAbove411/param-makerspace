import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router';
import { Calendar as CalendarIcon, ArrowLeft, ExternalLink, Trash2, Copy } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { AdminPageShell } from '../../../components/admin';
import { useAuth } from '../../../lib/auth';
import type { Event, EventType } from '../../../lib/database.types';
import { visibleTabs, isValidTab, type ConsoleTabId } from './consoleTypes';
import { OverviewTab } from './OverviewTab';
import { RegistrationsTab } from './RegistrationsTab';
import { EditBasicsModal } from './EditBasicsModal';
import { PlaceholderTab } from './PlaceholderTab';
import { ShortlistTab } from './ShortlistTab';
import { SubmissionsTab } from './SubmissionsTab';
import { WinnersTab } from './WinnersTab';
import { MakerMeetupShortlistTab } from './MakerMeetupShortlistTab';
import { MakerMeetupSelectionTab } from './MakerMeetupSelectionTab';
import { RecapTab } from './RecapTab';
import { deleteEvent, deleteEventChildren } from '../../../lib/api/events';
import { EVENT_TYPE_LABELS } from '../event-wizard/wizardTypes';

/**
 * EventConsole — the ops console for a single event at /admin/events/:id.
 *
 * This is the replacement for the "edit event" inline form that used to
 * live on ManageEvents. It is a tabbed workspace that grows with the
 * event's lifecycle:
 *
 *   Overview · Registrations · Shortlist · Submissions · Winners · Recap
 *
 * Which tabs show up depends on the event type and whether the event has
 * already ended — the rules live in consoleTypes.ts so the tab bar and
 * the URL validator stay in sync.
 *
 * Tab selection is URL-driven via `?tab=<id>` so console state is
 * shareable and survives refresh. Editing basics is a modal overlay
 * mounted at `/admin/events/:id/edit` (a sibling route); when that
 * route is active we render the modal on top of the console.
 *
 * In this prompt we ship Overview + Registrations + Edit-basics. The
 * remaining tabs are intentional placeholders — Prompts 8/9/10/12
 * light them up.
 */

interface LoadState {
    status: 'loading' | 'ready' | 'error' | 'notfound';
    event: Event | null;
    error?: string;
}

interface EventConsoleProps {
    /** If true, EditBasicsModal is mounted on top of the console. */
    editing?: boolean;
}

export function EventConsole({ editing = false }: EventConsoleProps) {
    const { id: eventId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { role } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const [loadState, setLoadState] = useState<LoadState>({ status: 'loading', event: null });
    const [deleting, setDeleting] = useState(false);

    // ─── Load ───────────────────────────────────────────────────
    const loadEvent = useCallback(async () => {
        if (!eventId) {
            setLoadState({ status: 'notfound', event: null });
            return;
        }
        setLoadState((s) => ({ ...s, status: 'loading' }));
        const { data, error } = await supabase
            .from('event')
            .select('*')
            .eq('id', eventId)
            .maybeSingle();
        if (error) {
            setLoadState({ status: 'error', event: null, error: error.message });
            return;
        }
        if (!data) {
            setLoadState({ status: 'notfound', event: null });
            return;
        }
        setLoadState({ status: 'ready', event: data as unknown as Event });
    }, [eventId]);

    useEffect(() => {
        void loadEvent();
    }, [loadEvent]);

    // ─── Derived: end date, visible tabs, active tab ────────────
    const event = loadState.event;
    const endDateMs = useMemo<number | null>(() => {
        if (!event) return null;
        const candidate = event.end_date ?? event.date;
        const t = Date.parse(candidate);
        return Number.isFinite(t) ? t : null;
    }, [event]);

    const tabs = useMemo(() => {
        if (!event) return [];
        return visibleTabs(event.event_type as EventType, endDateMs);
    }, [event, endDateMs]);

    const activeTab: ConsoleTabId = useMemo(() => {
        if (!event) return 'overview';
        const raw = searchParams.get('tab');
        if (raw && isValidTab(event.event_type as EventType, endDateMs, raw)) {
            return raw;
        }
        return 'overview';
    }, [event, endDateMs, searchParams]);

    const setActiveTab = useCallback(
        (id: ConsoleTabId) => {
            const next = new URLSearchParams(searchParams);
            if (id === 'overview') next.delete('tab');
            else next.set('tab', id);
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams],
    );

    // ─── Delete ────────────────────────────────────────────────
    const handleDelete = useCallback(async () => {
        if (!eventId || !event) return;
        const ok = window.confirm(
            `Delete "${event.title}"? This also removes all registrations, check-ins, submissions, hosts and teams. This cannot be undone.`,
        );
        if (!ok) return;
        setDeleting(true);
        try {
            await deleteEventChildren(eventId);
            const { error } = await deleteEvent(eventId);
            if (error) {
                window.alert(`Delete failed: ${error.message}`);
                setDeleting(false);
                return;
            }
            navigate('/admin/events', { replace: true });
        } catch (e) {
            window.alert(`Delete failed: ${e instanceof Error ? e.message : 'unknown error'}`);
            setDeleting(false);
        }
    }, [event, eventId, navigate]);

    // ─── Render states ─────────────────────────────────────────
    if (loadState.status === 'loading') {
        return (
            <AdminPageShell role={role ?? 'admin'} title="Event" subtitle="Loading…" icon={CalendarIcon}>
                <div className="p-12 text-center font-data text-brutal-dark/50">Loading event…</div>
            </AdminPageShell>
        );
    }

    if (loadState.status === 'notfound') {
        return (
            <AdminPageShell role={role ?? 'admin'} title="Event not found" subtitle="This event doesn't exist or was deleted." icon={CalendarIcon}>
                <Link to="/admin/events" className="inline-flex items-center gap-2 font-data text-sm underline">
                    <ArrowLeft className="w-4 h-4" /> Back to events
                </Link>
            </AdminPageShell>
        );
    }

    if (loadState.status === 'error' || !event) {
        return (
            <AdminPageShell role={role ?? 'admin'} title="Event" subtitle="Failed to load." icon={CalendarIcon}>
                <div className="p-6 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                    {loadState.error || 'Unknown error'}
                </div>
            </AdminPageShell>
        );
    }

    const typeLabel = EVENT_TYPE_LABELS[event.event_type as EventType];
    const isPast = endDateMs !== null && endDateMs < Date.now();

    return (
        <>
            <AdminPageShell
                role={role ?? 'admin'}
                title={event.title}
                subtitle={`${typeLabel}${isPast ? ' · Past' : ''}`}
                icon={CalendarIcon}
                headerAction={
                    <div className="flex gap-2 flex-wrap">
                        <Link
                            to="/admin/events"
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> All events
                        </Link>
                        <Link
                            to={`/events/${event.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" /> View public page
                        </Link>
                        {/*
                          P10 — "Duplicate last Tuesday" shortcut.
                          Only surfaces on past Tech Tuesdays — the flow
                          that actually benefits from weekly cloning.
                        */}
                        {event.event_type === 'tech_tuesday' && isPast && (
                            <Link
                                to={`/admin/events/new/tech-tuesday?duplicate=${event.id}`}
                                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-blue-500 text-blue-700 hover:bg-blue-600 hover:text-white font-data text-sm transition-colors"
                            >
                                <Copy className="w-4 h-4" /> Duplicate for next Tuesday
                            </Link>
                        )}
                        {role === 'admin' && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white font-data text-sm transition-colors disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                        )}
                    </div>
                }
            >
                {/* Tab bar */}
                <div className="flex flex-wrap gap-0 border-b-2 border-brutal-dark/20" role="tablist" aria-label="Event console sections">
                    {tabs.map((t) => {
                        const active = t.id === activeTab;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setActiveTab(t.id)}
                                className={
                                    'px-4 py-3 font-data text-sm font-bold uppercase tracking-wide border-b-4 -mb-[2px] transition-colors ' +
                                    (active
                                        ? 'border-brutal-red text-brutal-dark'
                                        : 'border-transparent text-brutal-dark/50 hover:text-brutal-dark')
                                }
                            >
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Active tab content */}
                <div className="pt-6">
                    {activeTab === 'overview' && <OverviewTab event={event} />}
                    {activeTab === 'registrations' && <RegistrationsTab event={event} />}
                    {activeTab === 'shortlist' && (
                        event.event_type === 'build_challenge'
                            ? <ShortlistTab event={event} />
                            : event.event_type === 'maker_meetup'
                                ? <MakerMeetupShortlistTab event={event} />
                                : <PlaceholderTab title="Shortlist" description="Shortlist tools are category-specific." />
                    )}
                    {activeTab === 'submissions' && <SubmissionsTab event={event} />}
                    {activeTab === 'winners' && <WinnersTab event={event} onEventChanged={() => void loadEvent()} />}
                    {activeTab === 'selection' && (
                        event.event_type === 'maker_meetup'
                            ? <MakerMeetupSelectionTab event={event} onEventChanged={() => void loadEvent()} />
                            : <PlaceholderTab title="Selection" description="Selection tools are Maker-Meetup specific." />
                    )}
                    {activeTab === 'recap' && (
                        <RecapTab event={event} onEventChanged={() => void loadEvent()} />
                    )}
                </div>
            </AdminPageShell>

            {editing && (
                <EditBasicsModal
                    event={event}
                    onClose={() => navigate(`/admin/events/${event.id}${activeTab === 'overview' ? '' : `?tab=${activeTab}`}`)}
                    onSaved={() => void loadEvent()}
                />
            )}
        </>
    );
}

export default EventConsole;
