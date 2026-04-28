import React, { useEffect, useMemo, useState } from 'react';
import { Info, LogIn } from 'lucide-react';
import type { Event, EventApplication } from '../../../lib/database.types';
import { useAuth } from '../../../lib/auth';
import {
    fetchApplicationsWhereMemberOf,
    fetchMyApplicationForEvent,
} from '../../../lib/api/buildChallenge';
import { computeBuildChallengePhase, type BuildChallengePhase } from './phase';
import { ApplyForm } from './ApplyForm';
import { SubmitForm } from './SubmitForm';
import { PublicGallery } from './PublicGallery';
import { WinnersBanner } from './WinnersBanner';

interface BuildChallengeSectionProps {
    event: Event;
}

/**
 * BuildChallengeSection — phase router for the public event page.
 *
 * Decides what to show below the event banner/basics based on:
 *   - the lifecycle phase (from deadlines)
 *   - the viewer's relationship to the event (guest, applicant, shortlisted team member)
 *
 * Phases & views:
 *   - unconfigured         → soft explainer, nothing actionable
 *   - applications_open    → ApplyForm (if logged in) or login prompt
 *   - submissions_open     → SubmitForm (if shortlisted) + ApplicationStatus readout otherwise
 *   - submissions_locked   → "Submissions locked, winners soon" banner
 *   - winners_published    → WinnersBanner + PublicGallery (winners highlighted)
 */
export function BuildChallengeSection({ event }: BuildChallengeSectionProps) {
    const { user } = useAuth();
    const phase: BuildChallengePhase = useMemo(() => computeBuildChallengePhase(event), [event]);

    const [myApplication, setMyApplication] = useState<EventApplication | null>(null);
    const [memberApplications, setMemberApplications] = useState<EventApplication[]>([]);
    const [appsLoaded, setAppsLoaded] = useState(false);
    const [winnerIds, setWinnerIds] = useState<Set<string>>(new Set());

    // Load the viewer's application (captain or tagged member) once we
    // know phase requires it. Guests skip these queries entirely.
    useEffect(() => {
        if (!user) {
            setAppsLoaded(true);
            return;
        }
        let cancelled = false;
        (async () => {
            const [mineRes, memberRes] = await Promise.all([
                fetchMyApplicationForEvent(event.id, user.id),
                fetchApplicationsWhereMemberOf(event.id, user.id),
            ]);
            if (cancelled) return;
            setMyApplication((mineRes.data as EventApplication | null) ?? null);
            setMemberApplications((memberRes.data as EventApplication[] | null) ?? []);
            setAppsLoaded(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [event.id, user]);

    // An application the viewer is on: prefer the captain row, otherwise
    // take the first where they're listed as a member.
    const activeApplication: EventApplication | null = myApplication ?? memberApplications[0] ?? null;

    if (phase === 'unconfigured') {
        return (
            <section className="border-2 border-brutal-dark/30 bg-brutal-bg p-6 font-data text-sm text-brutal-dark/70 flex items-start gap-2">
                <Info className="w-5 h-5 text-brutal-dark/50 mt-0.5" />
                <div>
                    <p className="font-bold">Build Challenge details coming soon.</p>
                    <p className="text-xs mt-1">
                        The host hasn&apos;t set the shortlist or submission deadlines yet.
                        Check back — applications will open here.
                    </p>
                </div>
            </section>
        );
    }

    if (phase === 'winners_published') {
        return (
            <div className="space-y-6">
                <WinnersBanner eventId={event.id} onWinnerIdsLoaded={setWinnerIds} />
                <PublicGallery eventId={event.id} winnerSubmissionIds={winnerIds} />
            </div>
        );
    }

    if (phase === 'submissions_locked') {
        return (
            <div className="space-y-6">
                <section className="border-2 border-brutal-dark bg-brutal-bg p-6 font-data text-sm text-brutal-dark/80 text-center">
                    <p className="font-heading font-bold text-xl uppercase">Submissions locked</p>
                    <p className="mt-2">Judging is underway. Winners will be announced here.</p>
                </section>
                <PublicGallery eventId={event.id} />
            </div>
        );
    }

    if (!user) {
        return (
            <section className="border-2 border-brutal-dark bg-white p-6 flex items-start gap-3">
                <LogIn className="w-5 h-5 text-brutal-red mt-1" />
                <div className="flex-1">
                    <h3 className="font-heading font-bold text-lg uppercase">Log in to participate</h3>
                    <p className="font-data text-sm text-brutal-dark/70 mt-1">
                        You need an account to apply or submit for this Build Challenge.
                    </p>
                </div>
            </section>
        );
    }

    if (!appsLoaded) {
        return (
            <div className="p-6 font-data text-sm text-brutal-dark/50">Loading…</div>
        );
    }

    if (phase === 'applications_open') {
        return (
            <ApplyForm
                event={event}
                userId={user.id}
                teamSizeMax={event.team_size_max}
            />
        );
    }

    // phase === 'submissions_open' (shortlist decided; shortlisted teams submit)
    if (phase === 'submissions_open') {
        if (activeApplication && activeApplication.status === 'shortlisted') {
            return (
                <SubmitForm
                    event={event}
                    application={activeApplication}
                    userId={user.id}
                />
            );
        }
        if (activeApplication && activeApplication.status === 'rejected') {
            return (
                <section className="border-2 border-brutal-red bg-brutal-red/5 p-6 font-data text-sm text-brutal-red">
                    <p className="font-heading font-bold uppercase">Not shortlisted</p>
                    <p className="mt-1">Your application wasn&apos;t shortlisted this time. Thanks for applying!</p>
                </section>
            );
        }
        return (
            <section className="border-2 border-brutal-dark bg-brutal-bg p-6 font-data text-sm text-brutal-dark/80">
                <p className="font-heading font-bold uppercase">Applications closed</p>
                <p className="mt-1">
                    Shortlisted teams are building now. Winners will be revealed here after the submission deadline.
                </p>
            </section>
        );
    }

    return null;
}
