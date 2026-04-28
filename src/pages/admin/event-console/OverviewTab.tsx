import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Users, Gauge, Clock, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Event, EventType, EventBlock } from '../../../lib/database.types';
import { computeHealth, type HealthSummary } from '../event-wizard/healthCheck';
import { blankTypeFields, blankAdvancedFields, type WizardFormState } from '../event-wizard/wizardTypes';

/**
 * OverviewTab — the landing tab of the ops console.
 *
 * Shows at-a-glance stats: registration count, capacity used, days to
 * start, and the same health checklist used in the wizard (so the host
 * can see at a glance whether the public page is ready). Edits are
 * routed to the "Edit basics" modal via the sibling /edit route.
 */

interface OverviewTabProps {
    event: Event;
}

interface Counts {
    regs: number;
    checkins: number;
}

export function OverviewTab({ event }: OverviewTabProps) {
    const [counts, setCounts] = useState<Counts | null>(null);
    const [countsError, setCountsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [regsRes, checkinsRes] = await Promise.all([
                supabase
                    .from('event_registration')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', event.id),
                supabase
                    .from('event_checkin')
                    .select('id', { count: 'exact', head: true })
                    .eq('event_id', event.id),
            ]);
            if (cancelled) return;
            if (regsRes.error) {
                setCountsError(regsRes.error.message);
                return;
            }
            if (checkinsRes.error) {
                setCountsError(checkinsRes.error.message);
                return;
            }
            setCounts({
                regs: regsRes.count ?? 0,
                checkins: checkinsRes.count ?? 0,
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [event.id]);

    // ─── Derived stats ────────────────────────────────────────
    const startMs = Date.parse(event.date);
    const daysToStart =
        Number.isFinite(startMs) ? Math.ceil((startMs - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    const capacityPct =
        event.capacity && event.capacity > 0 && counts
            ? Math.min(100, Math.round((counts.regs / event.capacity) * 100))
            : null;

    // ─── Health check ─────────────────────────────────────────
    // We reuse the wizard's computeHealth by synthesizing a WizardFormState
    // from the persisted event row. Type-specific fields aren't on the
    // event row yet (they land in Prompts 8/9/10), so we pass blank
    // type-fields of the same kind — the common checks still run and
    // give the host a useful readiness signal.
    const health: HealthSummary = computeHealth(eventToWizardState(event));

    return (
        <div className="space-y-8">
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={Users}
                    label="Registrations"
                    value={counts ? String(counts.regs) : '—'}
                    sub={counts ? `${counts.checkins} checked in` : countsError ? 'Failed to load' : 'Loading…'}
                />
                <StatCard
                    icon={Gauge}
                    label="Capacity used"
                    value={capacityPct !== null ? `${capacityPct}%` : '—'}
                    sub={event.capacity ? `${counts?.regs ?? 0} / ${event.capacity}` : 'No cap set'}
                />
                <StatCard
                    icon={Clock}
                    label={daysToStart !== null && daysToStart < 0 ? 'Days since start' : 'Days to start'}
                    value={daysToStart !== null ? String(Math.abs(daysToStart)) : '—'}
                    sub={startMs ? new Date(startMs).toLocaleDateString() : ''}
                />
            </div>

            {/* Basics summary + edit link */}
            <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h2 className="font-heading font-bold text-2xl uppercase">Basics</h2>
                        <p className="font-data text-sm text-brutal-dark/60 mt-1">
                            Public-page essentials. Click Edit to change title, cover, date, location or body.
                        </p>
                    </div>
                    <Link
                        to={`/admin/events/${event.id}/edit`}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm font-bold transition-colors flex-shrink-0"
                    >
                        <Pencil className="w-4 h-4" /> Edit basics
                    </Link>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 font-data text-sm">
                    <FactRow term="Title" detail={event.title} />
                    <FactRow term="Tagline" detail={event.tagline || '—'} />
                    <FactRow
                        term="Date"
                        detail={startMs ? new Date(startMs).toLocaleString() : '—'}
                    />
                    <FactRow
                        term="Ends"
                        detail={event.end_date ? new Date(event.end_date).toLocaleString() : '—'}
                    />
                    <FactRow term="Location" detail={event.location || '—'} />
                    <FactRow term="Capacity" detail={event.capacity ? String(event.capacity) : 'No cap'} />
                    <FactRow term="Registration" detail={event.registration_status} />
                    <FactRow
                        term="Body blocks"
                        detail={`${event.description_blocks?.length ?? 0} block(s)`}
                    />
                </dl>
            </section>

            {/* Health checklist */}
            <section className="border-2 border-brutal-dark bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-heading font-bold text-2xl uppercase">Event health</h2>
                    <span
                        className={
                            'px-2 py-1 text-xs font-bold font-data rounded uppercase ' +
                            (health.allPassing ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-yellow-100 text-yellow-800 border border-yellow-300')
                        }
                    >
                        {health.allPassing ? 'All good' : `${health.items.filter((i) => i.status === 'fail').length} issue(s)`}
                    </span>
                </div>
                <ul className="space-y-1">
                    {health.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 font-data text-sm">
                            {item.status === 'ok' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                            ) : (
                                <XCircle className="w-4 h-4 text-brutal-red flex-shrink-0" />
                            )}
                            <span className={item.status === 'fail' ? 'text-brutal-dark' : 'text-brutal-dark/70'}>
                                {item.label}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="font-data text-xs text-brutal-dark/50">
                    Note: type-specific columns (prizes, RSVP link, etc.) are captured in the wizard but not yet persisted on the event row — those lanes land in later prompts. The common checks above are the public-page readiness signal.
                </p>
            </section>
        </div>
    );
}

// ─── Small components ─────────────────────────────────────────

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub: string;
}

function StatCard({ icon: Icon, label, value, sub }: StatCardProps) {
    return (
        <div className="border-2 border-brutal-dark bg-white p-4">
            <div className="flex items-center gap-2 text-brutal-dark/60">
                <Icon className="w-4 h-4" />
                <span className="font-data text-xs font-bold uppercase tracking-wide">{label}</span>
            </div>
            <div className="font-heading font-bold text-3xl mt-2">{value}</div>
            <div className="font-data text-xs text-brutal-dark/50 mt-1">{sub}</div>
        </div>
    );
}

interface FactRowProps {
    term: string;
    detail: string;
}
function FactRow({ term, detail }: FactRowProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-brutal-dark/50 uppercase text-xs tracking-wide sm:w-32 sm:flex-shrink-0">{term}</dt>
            <dd className="text-brutal-dark break-words">{detail}</dd>
        </div>
    );
}

// ─── Wizard-state adapter (for healthCheck) ──────────────────
// Type-specific fields aren't yet persisted on the event row (they are
// added in Prompts 8/9/10). For now we pass blank type-fields so the
// 6 common checks run and the host gets a readiness signal.
function eventToWizardState(event: Event): WizardFormState {
    const type = event.event_type as EventType;
    return {
        step: 1,
        title: event.title ?? '',
        tagline: event.tagline ?? '',
        cover_image_url: event.cover_image_url ?? '',
        start_date: event.date ?? '',
        end_date: event.end_date ?? '',
        location: event.location ?? '',
        description_blocks: (event.description_blocks ?? []) as EventBlock[],
        typeFields: blankTypeFields(type),
        advanced: blankAdvancedFields(),
        advancedOpen: false,
        prefillSourceTitle: null,
        // P10 — stub so the wizard-state shape matches. The console's
        // health check doesn't read series_id.
        series_id: (event as unknown as { series_id?: string | null }).series_id ?? null,
    };
}
