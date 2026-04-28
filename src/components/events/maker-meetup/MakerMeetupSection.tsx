import React, { useEffect, useMemo, useState } from 'react';
import { Info, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Event, EventApplication } from '../../../lib/database.types';
import { useAuth } from '../../../lib/auth';
import { fetchMyApplicationForEvent } from '../../../lib/api/buildChallenge';
import { computeMakerMeetupPhase, type MakerMeetupPhase } from './phase';
import { ApplyForm } from './ApplyForm';
import { SlotBookingPanel } from './SlotBookingPanel';
import { JoiningConfirmation } from './JoiningConfirmation';

interface MakerMeetupSectionProps {
    event: Event;
}

/**
 * MakerMeetupSection — phase router for the public Maker Meetup flow
 * introduced in Prompt 9.
 *
 * This is layered ON TOP of the legacy showcase-slot (lightning talk) UI
 * in EventTypePages.MakerMeetupPreEvent. The two flows are independent:
 *   - If event.application_deadline is null, this component renders
 *     nothing (phase === 'unconfigured' → soft explainer optional) and
 *     the showcase flow below handles the event as before.
 *   - If the host has set an application_deadline, this component owns
 *     the apply → book → join pipeline, keyed on the applicant's
 *     event_application row.
 *
 * Phases & views:
 *   - unconfigured          → null (showcase flow is the default UI)
 *   - applications_open     → ApplyForm (if logged in) or login prompt
 *   - selection_pending     → status-dependent:
 *         shortlisted       → SlotBookingPanel
 *         rejected          → "Not shortlisted" notice
 *         pending/withdrawn → "Applications under review" notice
 *         no application    → "Applications closed" notice
 *   - selection_published   → status-dependent:
 *         selected          → JoiningConfirmation
 *         rejected/other    → "Not selected" notice
 *         no application    → null (didn't apply, nothing to show here)
 */
export function MakerMeetupSection({ event }: MakerMeetupSectionProps) {
    const { user } = useAuth();
    const phase: MakerMeetupPhase = useMemo(() => computeMakerMeetupPhase(event), [event]);

    const [myApplication, setMyApplication] = useState<EventApplication | null>(null);
    const [appLoaded, setAppLoaded] = useState(false);

    useEffect(() => {
        if (!user) {
            setAppLoaded(true);
            return;
        }
        let cancelled = false;
        (async () => {
            const { data } = await fetchMyApplicationForEvent(event.id, user.id);
            if (cancelled) return;
            setMyApplication((data as EventApplication | null) ?? null);
            setAppLoaded(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [event.id, user]);

    // Unconfigured → this event is using the legacy showcase-slot flow only.
    // Render nothing so MakerMeetupPreEvent's showcase UI is the whole story.
    if (phase === 'unconfigured') {
        return null;
    }

    if (!user) {
        return (
            <section className="border-2 border-brutal-dark bg-white p-6 flex items-start gap-3">
                <LogIn className="w-5 h-5 text-brutal-red mt-1" />
                <div className="flex-1">
                    <h3 className="font-heading font-bold text-lg uppercase">Log in to apply</h3>
                    <p className="font-data text-sm text-brutal-dark/70 mt-1">
                        You need an account to apply for this Maker Meetup.
                    </p>
                </div>
            </section>
        );
    }

    if (!appLoaded) {
        return (
            <div className="p-6 font-data text-sm text-brutal-dark/50">Loading…</div>
        );
    }

    if (phase === 'applications_open') {
        return (
            <ApplyForm
                event={event}
                userId={user.id}
                defaultDisplayName={user.name}
            />
        );
    }

    if (phase === 'selection_pending') {
        if (!myApplication) {
            return (
                <section className="border-2 border-brutal-dark bg-brutal-bg p-6 font-data text-sm text-brutal-dark/80">
                    <p className="font-heading font-bold uppercase">Applications closed</p>
                    <p className="mt-1">
                        The application window has closed. Shortlisted applicants will be
                        invited to book an interview slot here.
                    </p>
                </section>
            );
        }
        if (myApplication.status === 'shortlisted') {
            return <SlotBookingPanel event={event} application={myApplication} />;
        }
        if (myApplication.status === 'rejected') {
            return (
                <section className="border-2 border-brutal-red bg-brutal-red/5 p-6 font-data text-sm text-brutal-red">
                    <p className="font-heading font-bold uppercase flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" /> Not shortlisted
                    </p>
                    <p className="mt-1">
                        Your application wasn&apos;t shortlisted this time. Thanks for applying —
                        we hope to see you at a future meetup.
                    </p>
                </section>
            );
        }
        // pending / withdrawn / selected-before-publish → waiting state
        return (
            <section className="border-2 border-brutal-dark bg-brutal-bg p-6 font-data text-sm text-brutal-dark/80">
                <p className="font-heading font-bold uppercase">Applications under review</p>
                <p className="mt-1">
                    The host is reviewing applications. If shortlisted, you&apos;ll be
                    invited to book an interview slot here.
                </p>
            </section>
        );
    }

    // phase === 'selection_published'
    if (!myApplication) {
        // Viewer didn't apply — nothing to show in this slot; the main event
        // page still renders the normal event body.
        return null;
    }
    if (myApplication.status === 'selected') {
        return <JoiningConfirmation event={event} application={myApplication} />;
    }
    return (
        <section className="border-2 border-brutal-dark/30 bg-brutal-bg p-6 font-data text-sm text-brutal-dark/70 flex items-start gap-2">
            <Info className="w-5 h-5 text-brutal-dark/50 mt-0.5" />
            <div>
                <p className="font-heading font-bold uppercase flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brutal-dark/40" />
                    Selection announced
                </p>
                <p className="mt-1">
                    Your application wasn&apos;t selected for this meetup. Thanks for
                    applying — we&apos;d love to see you at a future event.
                </p>
            </div>
        </section>
    );
}
