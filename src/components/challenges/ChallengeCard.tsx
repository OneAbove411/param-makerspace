import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bookmark, Clock, CheckCircle2 } from 'lucide-react';
import { XpRewardBadge } from '../ui/XpRewardBadge';
import { cn } from '../../lib/utils';
import { XP_REWARDS } from '../../lib/constants';
import type { Challenge } from '../../lib/database.types';

// ─────────────────────────────────────────────────────────────
// Explorer Hub — ChallengeCard (X.company-inspired)
//
// At rest: full-bleed image + title at bottom.
// On hover: dark panel slides up covering the full card,
//           revealing title (large) + description + metadata.
// ─────────────────────────────────────────────────────────────

export type ChallengeListItem = Pick<
    Challenge,
    | 'id'
    | 'title'
    | 'tier'
    | 'domain'
    | 'time_estimate'
    | 'cover_image_url'
    | 'mystery'
    | 'status'
    | 'created_at'
>;

export type ChallengeCardVariant = 'medium' | 'spotlight' | 'quote';

export interface ChallengeCardProps {
    challenge: ChallengeListItem;
    variant?: ChallengeCardVariant;
    isBookmarked?: boolean;
    completionStatus?: string | null;
    onToggleBookmark?: (challengeId: string, currentlyBookmarked: boolean) => Promise<boolean>;
    className?: string;
}

function normalizeDomain(d: string): string {
    return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

/** Visual difficulty — three bars. */
function DifficultyBar({ tier }: { tier: string | null }) {
    const filled = tier === 'Tier 3' ? 3 : tier === 'Tier 2' ? 2 : tier === 'Tier 1' ? 1 : 0;
    if (filled === 0) return null;
    return (
        <div className="flex items-center gap-0.5" aria-label={`Difficulty: ${filled} out of 3`}>
            {[0, 1, 2].map((i) => (
                <span key={i} className={cn('h-1 w-3 rounded-full', i < filled ? 'bg-brutal-red' : 'bg-white/20')} />
            ))}
        </div>
    );
}

function CompletionPill({ status }: { status: string | null | undefined }) {
    if (!status) return null;
    const isVerified = status === 'verified' || status === 'complete' || status === 'completed';
    // "In review" state is intentionally hidden on the Explorer Hub — only show verified completions.
    if (!isVerified) return null;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-data uppercase tracking-wider',
            'bg-green-600/90 text-white',
        )}>
            <CheckCircle2 size={9} aria-hidden />
            Completed
        </span>
    );
}

function BookmarkButton({
    challengeId, isBookmarked, onToggleBookmark,
}: {
    challengeId: string;
    isBookmarked: boolean;
    onToggleBookmark?: (id: string, currently: boolean) => Promise<boolean>;
}) {
    const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);
    useEffect(() => { setLocalBookmarked(isBookmarked); }, [isBookmarked]);

    if (!onToggleBookmark) return null;

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const wasBookmarked = localBookmarked;
        setLocalBookmarked(!wasBookmarked);
        const next = await onToggleBookmark(challengeId, wasBookmarked);
        setLocalBookmarked(next);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={localBookmarked ? 'Remove bookmark' : 'Save blueprint'}
            aria-pressed={localBookmarked}
            className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-full transition-colors duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                localBookmarked
                    ? 'bg-brutal-red text-white'
                    : 'bg-brutal-dark/30 backdrop-blur-md text-white border border-white/15 hover:bg-brutal-dark/50',
            )}
        >
            <Bookmark size={12} fill={localBookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────

function ChallengeCardImpl({
    challenge,
    variant = 'medium',
    isBookmarked = false,
    completionStatus = null,
    onToggleBookmark,
    className,
}: ChallengeCardProps) {
    const { id, title, tier, domain, time_estimate, cover_image_url, mystery } = challenge;

    /* ── QUOTE VARIANT ─────────────────────────────────────── */
    if (variant === 'quote') {
        const quoteText = mystery || title;
        return (
            <Link
                to={`/challenges/${id}`}
                className={cn(
                    'block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-lg',
                    className,
                )}
            >
                <div className={cn(
                    'relative p-6 flex flex-col gap-4 rounded-lg aspect-[3/4]',
                    'bg-[#faf8f5] border border-brutal-dark/8',
                    'transition-all duration-300 ease-out',
                    'hover:shadow-lg hover:shadow-brutal-dark/6 hover:-translate-y-1',
                )}>
                    <div className="flex items-center justify-between">
                        <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red/70">
                            From the archive
                        </span>
                        <BookmarkButton challengeId={id} isBookmarked={isBookmarked} onToggleBookmark={onToggleBookmark} />
                    </div>

                    <blockquote className="font-drama italic text-lg md:text-xl leading-[1.35] text-brutal-dark/80 flex-1 overflow-hidden">
                        <span className="text-brutal-red/40 mr-1" aria-hidden>"</span>
                        {quoteText}
                        <span className="text-brutal-red/40 ml-0.5" aria-hidden>"</span>
                    </blockquote>

                    <div className="mt-auto pt-3 border-t border-brutal-dark/6 flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="font-data text-[9px] uppercase tracking-wider text-brutal-dark/35">Blueprint</p>
                            <p className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark truncate">{title}</p>
                        </div>
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red inline-flex items-center gap-1 group-hover:gap-1.5 transition-all duration-200 flex-shrink-0 ml-3">
                            Open <ArrowRight size={11} />
                        </span>
                    </div>
                </div>
            </Link>
        );
    }

    /* ── XP reward ────────────────────────────────────────── */
    const xpAmount = tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
        : tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
        : tier === 'Tier 1' ? XP_REWARDS.tier1_challenge
        : null;

    const isSpotlight = variant === 'spotlight';

    return (
        <Link
            to={`/challenges/${id}`}
            className={cn(
                'block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-lg',
                className,
            )}
        >
            <div
                className={cn(
                    'relative overflow-hidden rounded-lg bg-brutal-dark',
                    isSpotlight ? 'aspect-[4/3]' : 'aspect-[3/4]',
                )}
            >
                {/* ── Image layer ── */}
                {cover_image_url ? (
                    <img
                        src={cover_image_url}
                        alt={title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                ) : (
                    <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}

                {/* ── Resting gradient ── */}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark/80 via-brutal-dark/20 to-transparent transition-opacity duration-500 group-hover:opacity-0" />

                {/* ── Top-left badges (fade on hover) ── */}
                <div className="absolute top-3 left-3 flex gap-1.5 z-20 transition-opacity duration-400 group-hover:opacity-0">
                    {tier && (
                        <span className="bg-brutal-dark/70 backdrop-blur-md text-white px-2 py-0.5 text-[10px] font-medium font-data rounded-full border border-white/20">
                            {tier}
                        </span>
                    )}
                    {domain && (
                        <span className={cn(
                            'px-2 py-0.5 text-[10px] font-medium font-data rounded-full backdrop-blur-md border border-white/20',
                            domain.toLowerCase() === 'electronics'
                                ? 'bg-brutal-red/80 text-white'
                                : 'bg-brutal-dark/70 text-white',
                        )}>
                            {normalizeDomain(domain)}
                        </span>
                    )}
                </div>

                {/* ── Bookmark top-right (fade in on hover) ── */}
                <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-400 delay-100">
                    <BookmarkButton challengeId={id} isBookmarked={isBookmarked} onToggleBookmark={onToggleBookmark} />
                </div>

                {/* ── Completion pill ── */}
                {completionStatus && (
                    <div className="absolute bottom-14 left-4 z-30 transition-opacity duration-400 group-hover:opacity-0">
                        <CompletionPill status={completionStatus} />
                    </div>
                )}

                {/* ── Resting state: title at bottom ── */}
                <div className="absolute inset-x-0 bottom-0 z-20 p-4 transition-opacity duration-400 group-hover:opacity-0">
                    <h3 className={cn(
                        'font-heading font-bold line-clamp-2 uppercase tracking-tight-heading text-white',
                        isSpotlight ? 'text-lg md:text-xl' : 'text-base',
                    )}>
                        {title}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                        <DifficultyBar tier={tier} />
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                            View <ArrowRight size={10} />
                        </span>
                    </div>
                </div>

                {/* ── Hover panel: crossfade over image ── */}
                <div className="absolute inset-0 z-20 bg-brutal-dark flex flex-col justify-end p-5 gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out">
                    {/* Domain + tier row */}
                    <div className="flex items-center gap-2">
                        {domain && (
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-red/80">
                                {normalizeDomain(domain)}
                            </span>
                        )}
                        {tier && (
                            <>
                                <span className="text-white/20 text-[9px]">·</span>
                                <DifficultyBar tier={tier} />
                            </>
                        )}
                        {time_estimate && (
                            <>
                                <span className="text-white/20 text-[9px]">·</span>
                                <span className="inline-flex items-center gap-1 font-data text-[9px] text-white/40">
                                    <Clock size={9} aria-hidden /> {time_estimate}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Title — large */}
                    <h3 className={cn(
                        'font-heading font-bold uppercase tracking-tight-heading leading-[1.05] text-white',
                        isSpotlight ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
                    )}>
                        {title}
                    </h3>

                    {/* Mystery / description */}
                    {mystery && (
                        <p className="font-data text-[12px] text-white/60 leading-relaxed line-clamp-4">
                            {mystery}
                        </p>
                    )}

                    {/* Completion status */}
                    {completionStatus && <CompletionPill status={completionStatus} />}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/8">
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red flex items-center gap-1">
                            View Blueprint <ArrowRight size={10} />
                        </span>
                        {xpAmount ? (
                            <XpRewardBadge amount={xpAmount} />
                        ) : isSpotlight ? (
                            <span className="font-data text-[9px] font-medium uppercase tracking-wider text-white/25">Spotlight</span>
                        ) : null}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export const ChallengeCard = memo(ChallengeCardImpl);
ChallengeCard.displayName = 'ChallengeCard';
