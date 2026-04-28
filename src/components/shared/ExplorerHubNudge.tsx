import React from 'react';
import { useSearchParams } from 'react-router';
import { Shuffle, Bookmark, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExplorerHubNudgeProps {
    /** Number of blueprints the current user has saved. */
    savedCount: number;
}

/**
 * Sidebar nudge card for the Explorer Hub.
 *
 * Replaces the generic "Post a Project" gamification card with two
 * Explorer-Hub-relevant actions:
 *   • Surprise me — apply the `shuffle` sort to randomly reorder the feed.
 *   • Open saved — switch the view to the user's bookmarked blueprints
 *     (only shown when the user has at least one save).
 *
 * Pure URL-state mutation, no new fetches.
 */
export function ExplorerHubNudge({ savedCount }: ExplorerHubNudgeProps) {
    const [searchParams, setSearchParams] = useSearchParams();

    const surpriseMe = () => {
        const p = new URLSearchParams(searchParams);
        p.set('sort', 'shuffle');
        p.delete('view');
        setSearchParams(p, { replace: true });
    };

    const openSaved = () => {
        const p = new URLSearchParams(searchParams);
        p.set('view', 'saved');
        setSearchParams(p, { replace: true });
    };

    return (
        <div
            className={cn(
                'rounded-xl border-2 border-brutal-dark p-4',
                'bg-brutal-dark text-brutal-bg',
                'shadow-[4px_4px_0_0_theme(colors.brutal.red)]',
            )}
        >
            <div className="flex items-center gap-2 mb-2">
                <Shuffle size={14} className="text-brutal-red" />
                <span className="font-heading text-sm font-bold uppercase tracking-wider">
                    Stuck Browsing?
                </span>
            </div>

            <p className="font-data text-xs text-brutal-bg/70 mb-3">
                Let the library pick. Or jump back into what you saved.
            </p>

            <button
                type="button"
                onClick={surpriseMe}
                className="flex items-center justify-center gap-2 w-full bg-brutal-red text-brutal-bg font-heading text-xs font-bold uppercase tracking-widest py-2.5 rounded-lg hover:brightness-110 transition-all mb-2"
            >
                <Shuffle size={12} /> Surprise me
            </button>

            {savedCount > 0 && (
                <button
                    type="button"
                    onClick={openSaved}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-brutal-bg/20 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-bg/80 hover:border-brutal-red/60 hover:text-brutal-bg transition-colors"
                >
                    <span className="inline-flex items-center gap-1.5">
                        <Bookmark size={11} fill="currentColor" aria-hidden />
                        {savedCount} saved
                    </span>
                    <ArrowRight size={11} />
                </button>
            )}
        </div>
    );
}
