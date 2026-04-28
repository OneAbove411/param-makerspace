import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star, ExternalLink, Loader2 } from 'lucide-react';
import type { EventSubmission, EventWinner } from '../../../lib/database.types';
import { fetchSubmissionsForEvent, fetchWinnersForEvent } from '../../../lib/api/buildChallenge';

interface WinnersBannerProps {
    eventId: string;
    /** Optional: notify parent of winner submission IDs so the gallery can highlight them. */
    onWinnerIdsLoaded?: (ids: Set<string>) => void;
}

interface WinnerWithSubmission {
    winner: EventWinner;
    submission: EventSubmission | null;
}

/**
 * WinnersBanner — public winners reveal, shown only when the admin has
 * set event.winners_published_at. The RLS public_select policy on
 * event_winner already gates the fetch; this is defense-in-depth.
 *
 * Rendering:
 *   - Positive ranks (1, 2, 3, …) are podium slots, rendered in order.
 *   - Negative ranks (-1, -2, …) are honorable mentions, rendered after.
 */
export function WinnersBanner({ eventId, onWinnerIdsLoaded }: WinnersBannerProps) {
    const [winners, setWinners] = useState<WinnerWithSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const [winnersRes, submissionsRes] = await Promise.all([
                fetchWinnersForEvent(eventId),
                fetchSubmissionsForEvent(eventId),
            ]);
            if (cancelled) return;
            if (winnersRes.error) {
                setError(winnersRes.error.message);
                setLoading(false);
                return;
            }
            const winnerRows = (winnersRes.data as EventWinner[] | null) ?? [];
            const subRows = (submissionsRes.data as EventSubmission[] | null) ?? [];
            const subById = new Map(subRows.map((s) => [s.id, s]));
            const merged: WinnerWithSubmission[] = winnerRows.map((w) => ({
                winner: w,
                submission: subById.get(w.submission_id) ?? null,
            }));
            setWinners(merged);
            onWinnerIdsLoaded?.(new Set(winnerRows.map((w) => w.submission_id)));
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [eventId, onWinnerIdsLoaded]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-6 font-data text-sm text-brutal-dark/50">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading winners…
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red bg-brutal-red/5 font-data text-sm text-brutal-red">
                Failed to load winners: {error}
            </div>
        );
    }

    if (winners.length === 0) return null;

    const podium = winners.filter((w) => w.winner.rank > 0).sort((a, b) => a.winner.rank - b.winner.rank);
    const honorables = winners.filter((w) => w.winner.rank < 0).sort((a, b) => b.winner.rank - a.winner.rank);

    return (
        <section className="border-2 border-brutal-dark bg-white p-6 space-y-6">
            <header className="flex items-center gap-2">
                <Trophy className="w-7 h-7 text-brutal-red" />
                <h3 className="font-heading font-bold text-3xl uppercase">Winners</h3>
            </header>

            {podium.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {podium.map((w) => (
                        <PodiumCard key={w.winner.id} item={w} />
                    ))}
                </div>
            )}

            {honorables.length > 0 && (
                <div className="space-y-2">
                    <h4 className="font-heading font-bold text-sm uppercase text-brutal-dark/60 flex items-center gap-1">
                        <Star className="w-4 h-4" /> Honorable mentions
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {honorables.map((w) => (
                            <li
                                key={w.winner.id}
                                className="border-2 border-brutal-dark/30 bg-brutal-bg p-3 font-data text-sm"
                            >
                                <div className="font-bold">{w.submission?.title || '(untitled)'}</div>
                                {w.winner.prize_label && (
                                    <div className="text-xs text-brutal-red uppercase tracking-wide font-bold mt-0.5">
                                        {w.winner.prize_label}
                                    </div>
                                )}
                                {w.winner.citation && (
                                    <p className="text-xs text-brutal-dark/70 mt-1">{w.winner.citation}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}

function PodiumCard({ item }: { item: WinnerWithSubmission }) {
    const { winner, submission } = item;
    const isFirst = winner.rank === 1;
    const isSecond = winner.rank === 2;
    const Icon = isFirst ? Trophy : Medal;

    return (
        <div
            className={
                'border-2 p-4 space-y-2 ' +
                (isFirst
                    ? 'border-brutal-red bg-brutal-red/5 shadow-[4px_4px_0_rgba(239,68,68,0.3)]'
                    : isSecond
                        ? 'border-brutal-dark bg-white shadow-[3px_3px_0_rgba(0,0,0,0.2)]'
                        : 'border-brutal-dark/70 bg-white shadow-[2px_2px_0_rgba(0,0,0,0.15)]')
            }
        >
            <div className="flex items-center gap-2">
                <Icon className={'w-5 h-5 ' + (isFirst ? 'text-brutal-red' : 'text-brutal-dark')} />
                <span className="font-heading font-bold text-xs uppercase tracking-wide">
                    Rank {winner.rank}
                    {winner.prize_label ? ` · ${winner.prize_label}` : ''}
                </span>
            </div>
            <h4 className="font-heading font-bold text-xl uppercase leading-tight">
                {submission?.title || '(untitled)'}
            </h4>
            {winner.citation && (
                <p className="font-data text-sm text-brutal-dark/80">{winner.citation}</p>
            )}
            <div className="flex flex-wrap gap-3 pt-1">
                {submission?.repo_url && (
                    <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-data text-xs text-brutal-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Repo
                    </a>
                )}
                {submission?.demo_url && (
                    <a
                        href={submission.demo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-data text-xs text-brutal-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Demo
                    </a>
                )}
            </div>
        </div>
    );
}
