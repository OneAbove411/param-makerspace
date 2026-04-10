import React, { memo, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Bookmark, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { XpRewardBadge } from '../ui/XpRewardBadge';
import { cn } from '../../lib/utils';
import { XP_REWARDS } from '../../lib/constants';
import type { Challenge } from '../../lib/database.types';

// ─────────────────────────────────────────────────────────────
// Explorer Hub — ChallengeCard (step-2 of the overhaul)
//
// One component, three variants, so the inspiration feed can juxtapose
// different shapes inside a single CSS-multi-column masonry flow:
//
//   • 'medium'    — default. 192px cover, title, mystery snippet, chips.
//   • 'spotlight' — taller cover (340px), larger title, 3-line mystery.
//                   Used every ~7th card with a cover image, to break the
//                   rhythm and catch the eye. Pinterest's "big tile" move.
//   • 'quote'     — no image. Cream background, large display-serif pull
//                   quote from the challenge's `mystery`, small attribution.
//                   Used every ~11th card as a palate cleanser. Are.na move.
//
// All three share the same 2px border + 6px red offset-shadow chrome so
// they read as one family. A single `break-inside: avoid` wrapper is
// applied by the grid parent, not by the card itself, so this component
// stays layout-agnostic.
//
// Per-card data is passed in as props — NO per-card hooks. That keeps the
// feed to 3 total supabase queries (challenges + bookmarks + completions),
// not 3*N queries. Bookmark state is lifted to the parent and this card
// only does an optimistic flip against its local mirror.
// ─────────────────────────────────────────────────────────────

// Narrow shape — we only use the columns Explorer Hub actually fetches.
// This mirrors the select list in `useChallenges` so the type lines up.
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
    /** Whether the current user has this blueprint bookmarked. */
    isBookmarked?: boolean;
    /** Current user's completion status for this blueprint, if any. */
    completionStatus?: string | null;
    /**
     * Toggles the bookmark. Returns the *new* bookmarked state so the
     * card can reconcile its optimistic flip. If omitted, the heart is
     * hidden (logged-out browsing).
     */
    onToggleBookmark?: (challengeId: string, currentlyBookmarked: boolean) => Promise<boolean>;
    className?: string;
}

// ─── Domain color map (same as current Challenges.tsx so we don't regress) ───
const DOMAIN_COLORS: Record<string, string> = {
    electronics: 'bg-brutal-red text-brutal-bg',
    robotics: 'bg-blue-600 text-white',
    ai: 'bg-green-700 text-white',
    design: 'bg-purple-600 text-white',
    fabrication: 'bg-amber-600 text-white',
    bio: 'bg-teal-600 text-white',
    interdisciplinary: 'bg-brutal-dark text-brutal-bg',
};

function getDomainBadgeClass(domain: string | null | undefined): string {
    if (!domain) return 'bg-brutal-dark/10 text-brutal-dark/50';
    return DOMAIN_COLORS[domain.toLowerCase()] || 'bg-brutal-dark/10 text-brutal-dark/50';
}

function normalizeDomain(d: string): string {
    return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
}

/**
 * Visual difficulty indicator — three hash marks, N filled based on tier.
 * Scans faster than reading "Tier 2" for second-time visitors.
 */
function DifficultyBar({ tier, onDark = false }: { tier: string | null; onDark?: boolean }) {
    const filled = tier === 'Tier 3' ? 3 : tier === 'Tier 2' ? 2 : tier === 'Tier 1' ? 1 : 0;
    if (filled === 0) return null;
    const activeColor = onDark ? 'bg-brutal-red' : 'bg-brutal-red';
    const mutedColor = onDark ? 'bg-brutal-bg/20' : 'bg-brutal-dark/15';
    return (
        <div className="flex items-center gap-1" aria-label={`Difficulty: ${filled} out of 3`}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={cn('h-1 w-3.5 rounded-full', i < filled ? activeColor : mutedColor)}
                />
            ))}
        </div>
    );
}

/**
 * Status pill — rendered over the card image when the user has touched
 * this blueprint. Hidden for logged-out users and untouched blueprints.
 */
function CompletionPill({ status }: { status: string | null | undefined }) {
    if (!status) return null;
    const isVerified = status === 'verified' || status === 'complete' || status === 'completed';
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-data uppercase tracking-wider',
                'backdrop-blur-sm border',
                isVerified
                    ? 'bg-green-700/90 text-white border-green-800/50'
                    : 'bg-amber-500/90 text-brutal-dark border-amber-600/50',
            )}
        >
            {isVerified ? <CheckCircle2 size={10} aria-hidden /> : <Loader2 size={10} aria-hidden />}
            {isVerified ? 'Completed' : 'In review'}
        </span>
    );
}

/**
 * Bookmark heart button. Optimistic flip with reconcile — mirrors the
 * pattern used in ProjectCard. Hidden entirely if no toggle handler is
 * provided (i.e. logged-out browsing).
 */
function BookmarkButton({
    challengeId,
    isBookmarked,
    onToggleBookmark,
    onDark,
}: {
    challengeId: string;
    isBookmarked: boolean;
    onToggleBookmark?: (id: string, currently: boolean) => Promise<boolean>;
    onDark: boolean;
}) {
    const [localBookmarked, setLocalBookmarked] = useState(isBookmarked);
    useEffect(() => {
        setLocalBookmarked(isBookmarked);
    }, [isBookmarked]);

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
                'inline-flex items-center justify-center h-8 w-8 rounded-full',
                'border backdrop-blur-sm transition-all duration-150',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                localBookmarked
                    ? 'bg-brutal-red text-brutal-bg border-brutal-red/80 hover:bg-brutal-red/90'
                    : onDark
                        ? 'bg-brutal-bg/15 text-brutal-bg border-brutal-bg/25 hover:bg-brutal-bg/25'
                        : 'bg-brutal-bg/90 text-brutal-dark/70 border-brutal-dark/15 hover:text-brutal-red hover:border-brutal-red/40',
            )}
        >
            <Bookmark size={14} fill={localBookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
        </button>
    );
}

// ─────────────────────────────────────────────────────────────
// Main component
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

    // ── QUOTE VARIANT ─────────────────────────────────────
    // No image. Big display-serif pull from `mystery`. Cream card with
    // a subtle warm accent band at the top so it reads as a deliberate
    // typographic object, not a broken card.
    if (variant === 'quote') {
        const quoteText = mystery || title;
        return (
            <Link
                to={`/challenges/${id}`}
                className={cn(
                    'block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-2xl',
                    className,
                )}
            >
                <Card
                    className={cn(
                        'relative p-6 md:p-7 flex flex-col gap-5 min-h-[260px]',
                        'border-2 border-brutal-dark/15 bg-brutal-paper',
                        'shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                        'transition-all duration-200 ease-out',
                        'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                        'hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)]',
                        'hover:border-brutal-red/40',
                        'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                    )}
                >
                    {/* Top band — warm accent to signal "this is different" */}
                    <div className="flex items-center justify-between">
                        <span className="font-data text-[9px] font-bold uppercase tracking-[0.25em] text-brutal-red">
                            From the archive
                        </span>
                        <BookmarkButton
                            challengeId={id}
                            isBookmarked={isBookmarked}
                            onToggleBookmark={onToggleBookmark}
                            onDark={false}
                        />
                    </div>

                    {/* The quote itself */}
                    <blockquote className="font-drama italic text-2xl md:text-[28px] leading-[1.15] text-brutal-dark">
                        <span className="text-brutal-red mr-1" aria-hidden>“</span>
                        {quoteText}
                        <span className="text-brutal-red ml-1" aria-hidden>”</span>
                    </blockquote>

                    {/* Attribution + CTA */}
                    <div className="mt-auto pt-4 border-t border-brutal-dark/10 flex items-center justify-between">
                        <div className="min-w-0">
                            <p className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40 truncate">
                                From blueprint
                            </p>
                            <p className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark truncate">
                                {title}
                            </p>
                        </div>
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-red inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all flex-shrink-0 ml-3">
                            Open <ArrowRight size={12} />
                        </span>
                    </div>
                </Card>
            </Link>
        );
    }

    // ── XP reward for this tier ─────────────────────────────
    const xpAmount = tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
        : tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
        : tier === 'Tier 1' ? XP_REWARDS.tier1_challenge
        : null;

    // ── IMAGE VARIANTS (medium + spotlight) ───────────────
    const isSpotlight = variant === 'spotlight';
    const imgHeight = isSpotlight ? 'h-[340px] md:h-[380px]' : 'h-48';
    const titleSize = isSpotlight
        ? 'text-2xl md:text-[26px] leading-[1.1]'
        : 'text-lg leading-tight';
    const mysteryLines = isSpotlight ? 'line-clamp-3' : 'line-clamp-2';

    return (
        <Link
            to={`/challenges/${id}`}
            className={cn(
                'block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-2xl',
                className,
            )}
        >
            <Card
                className={cn(
                    'h-full flex flex-col overflow-hidden',
                    'border-2 border-brutal-dark/15',
                    'shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                    'transition-all duration-200 ease-out',
                    'hover:translate-x-[-2px] hover:translate-y-[-2px]',
                    'hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)]',
                    'hover:border-brutal-red/40',
                    'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                )}
            >
                {/* ── Image ── */}
                <div className={cn('w-full overflow-hidden bg-brutal-dark relative', imgHeight)}>
                    {cover_image_url ? (
                        <img
                            src={cover_image_url}
                            alt={title}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                backgroundImage:
                                    'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                            }}
                        />
                    )}
                    {/* Top gradient so overlay badges are legible */}
                    <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brutal-dark/65 to-transparent pointer-events-none" />
                    {/* Bottom gradient for the completion pill */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brutal-dark/55 to-transparent pointer-events-none" />

                    {/* Top-left badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                        {tier && (
                            <span className="bg-brutal-bg/90 text-brutal-dark px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-wider backdrop-blur-sm border border-brutal-dark/15">
                                {tier}
                            </span>
                        )}
                        {domain && (
                            <span
                                className={cn(
                                    'px-2 py-0.5 text-[9px] font-bold font-data rounded uppercase tracking-wider',
                                    getDomainBadgeClass(domain),
                                )}
                            >
                                {normalizeDomain(domain)}
                            </span>
                        )}
                    </div>

                    {/* Top-right: bookmark */}
                    <div className="absolute top-3 right-3 z-10">
                        <BookmarkButton
                            challengeId={id}
                            isBookmarked={isBookmarked}
                            onToggleBookmark={onToggleBookmark}
                            onDark
                        />
                    </div>

                    {/* Bottom-left: completion pill (only if the user has touched it) */}
                    {completionStatus && (
                        <div className="absolute bottom-3 left-3 z-10">
                            <CompletionPill status={completionStatus} />
                        </div>
                    )}

                    {/* Bottom-right: time estimate (if any) */}
                    {time_estimate && (
                        <div className="absolute bottom-3 right-3 z-10">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold font-data uppercase tracking-wider bg-brutal-bg/90 text-brutal-dark border border-brutal-dark/15 backdrop-blur-sm">
                                <Clock size={10} aria-hidden />
                                {time_estimate}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                <div className={cn('flex flex-col flex-1', isSpotlight ? 'p-6' : 'p-5')}>
                    {/* Domain eyebrow + difficulty bar side by side */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                        {domain ? (
                            <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">
                                #{normalizeDomain(domain)}
                            </span>
                        ) : (
                            <span />
                        )}
                        <DifficultyBar tier={tier} />
                    </div>

                    <h3
                        className={cn(
                            'font-heading font-bold line-clamp-2 group-hover:text-brutal-red transition-colors mb-2 uppercase tracking-tight-heading text-brutal-dark',
                            titleSize,
                        )}
                    >
                        {title}
                    </h3>

                    {mystery && (
                        <p
                            className={cn(
                                'font-data text-xs text-brutal-dark/60 leading-relaxed mb-4',
                                mysteryLines,
                            )}
                        >
                            {mystery}
                        </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-brutal-dark/10">
                        <span className="font-data text-[10px] font-bold text-brutal-red uppercase tracking-wider flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                            View Blueprint <ArrowRight size={12} />
                        </span>
                        {xpAmount ? (
                            <XpRewardBadge amount={xpAmount} />
                        ) : isSpotlight ? (
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30">
                                Spotlight
                            </span>
                        ) : null}
                    </div>
                </div>
            </Card>
        </Link>
    );
}

export const ChallengeCard = memo(ChallengeCardImpl);
ChallengeCard.displayName = 'ChallengeCard';
