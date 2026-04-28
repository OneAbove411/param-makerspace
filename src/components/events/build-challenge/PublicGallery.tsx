import React, { useEffect, useState } from 'react';
import { ExternalLink, Images, Loader2 } from 'lucide-react';
import type { EventSubmission } from '../../../lib/database.types';
import { EventBody } from '../EventBody';
import { fetchSubmissionsForEvent } from '../../../lib/api/buildChallenge';

interface PublicGalleryProps {
    eventId: string;
    /** Set of submission IDs that are winners. Shown with a "Winner" badge. */
    winnerSubmissionIds?: Set<string>;
}

/**
 * PublicGallery — public-facing grid of locked submissions for an event.
 *
 * Visibility:
 *   - Only submissions with locked_at IS NOT NULL are returned by RLS
 *     for non-team viewers (see migration public_gallery policy).
 *   - We still filter client-side for defense-in-depth.
 *
 * Rendering:
 *   - Card grid (1 col mobile, 2 cols md, 3 cols lg).
 *   - Each card shows title, repo/demo links, and the description body.
 *   - Winners (if provided) get a small ribbon.
 */
export function PublicGallery({ eventId, winnerSubmissionIds }: PublicGalleryProps) {
    const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const { data, error: err } = await fetchSubmissionsForEvent(eventId);
            if (cancelled) return;
            if (err) {
                setError(err.message);
                setLoading(false);
                return;
            }
            const rows = (data as EventSubmission[] | null) ?? [];
            setSubmissions(rows.filter((r) => Boolean(r.locked_at)));
            setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [eventId]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-6 font-data text-sm text-brutal-dark/50">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading gallery…
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red bg-brutal-red/5 font-data text-sm text-brutal-red">
                Failed to load gallery: {error}
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="p-6 border-2 border-brutal-dark/30 bg-brutal-bg font-data text-sm text-brutal-dark/60 text-center">
                No submissions in the gallery yet.
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <header className="flex items-center gap-2">
                <Images className="w-6 h-6 text-brutal-red" />
                <h3 className="font-heading font-bold text-2xl uppercase">Project gallery</h3>
                <span className="font-data text-xs text-brutal-dark/50 ml-2">({submissions.length})</span>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((s) => (
                    <GalleryCard
                        key={s.id}
                        submission={s}
                        isWinner={winnerSubmissionIds?.has(s.id) ?? false}
                    />
                ))}
            </div>
        </section>
    );
}

interface GalleryCardProps {
    submission: EventSubmission;
    isWinner: boolean;
}

function GalleryCard({ submission, isWinner }: GalleryCardProps) {
    const [expanded, setExpanded] = useState(false);
    const blocks = Array.isArray(submission.description_blocks) ? submission.description_blocks : [];
    const hasBody = blocks.length > 0;

    return (
        <article
            className={
                'relative border-2 bg-white p-4 space-y-3 ' +
                (isWinner ? 'border-brutal-red shadow-[4px_4px_0_rgba(239,68,68,0.25)]' : 'border-brutal-dark')
            }
        >
            {isWinner && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 border-2 border-brutal-dark bg-brutal-red text-white font-heading font-bold text-xs uppercase tracking-wide">
                    Winner
                </span>
            )}
            <h4 className="font-heading font-bold text-lg uppercase leading-tight">
                {submission.title || '(untitled)'}
            </h4>

            <div className="flex flex-wrap gap-3">
                {submission.repo_url && (
                    <a
                        href={submission.repo_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 font-data text-xs text-brutal-red hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" /> Repo
                    </a>
                )}
                {submission.demo_url && (
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

            {hasBody && (
                <div>
                    <div
                        className={
                            'transition-all overflow-hidden ' +
                            (expanded ? 'max-h-[2000px]' : 'max-h-24 relative')
                        }
                    >
                        <EventBody
                            blocks={blocks}
                            className="space-y-2 font-data text-xs leading-relaxed text-brutal-dark/80"
                        />
                        {!expanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="mt-1 font-data text-xs font-bold uppercase text-brutal-red hover:underline"
                    >
                        {expanded ? 'Show less' : 'Show more'}
                    </button>
                </div>
            )}
        </article>
    );
}
