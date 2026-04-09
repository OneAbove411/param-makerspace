import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * ProjectHeroCard — shared shell for ProjectDetails & EditProject hero regions.
 *
 * Phase-2 rewrite: the cover now has a fixed desktop/mobile height (260/180 by
 * default), starts BELOW the fixed nav (pt-20 md:pt-24 on the outer wrapper),
 * and the info card floats by overlapping the cover's bottom edge rather than
 * eating into its top. This eliminates the clipped-title issue seen when the
 * old 38vh cover extended behind the fixed nav.
 *
 * Owns: outer top spacing, the cover region, gradient overlay, back link slot,
 * and the floating info card. Page-specific content (badges row, title, meta,
 * action buttons, at-a-glance strip) is passed in as `children`.
 *
 * The GSAP stagger class hooks used by ProjectDetails (`.pd-hero-text`) and
 * EditProject (`.ep-hero-text`) are attached by the caller on children — the
 * shell just provides the structure.
 */
export interface ProjectHeroCardProps {
    /** Cover image URL. If falsy, renders the dotted fallback. */
    coverUrl?: string | null;
    /** Alt text for the cover image (usually the project title). */
    coverAlt?: string;
    /**
     * Tailwind height classes for the cover region.
     * Default is 180px mobile / 260px desktop per the locked Phase-2 spec.
     */
    coverHeightClass?: string;
    /** Negative top-margin classes for the info card's overlap with the cover. */
    overlapClass?: string;
    /**
     * Back link slot. Callers pass an already-styled element (commonly a
     * `<ProjectHeroBackLink />`) so they can attach their own GSAP stagger
     * class (`pd-hero-text`, `ep-hero-text`) directly on the focusable element.
     */
    backSlot?: ReactNode;
    /** Extra class on the outer wrapper. */
    className?: string;
    /** Override padding / class on the floating info card itself. */
    bodyClassName?: string;
    /** Info-card contents: badges, title, meta, actions, stats, etc. */
    children: ReactNode;
}

export function ProjectHeroCard({
    coverUrl,
    coverAlt = 'Project cover',
    coverHeightClass = 'h-[180px] md:h-[260px]',
    overlapClass = '-mt-16 md:-mt-20',
    backSlot,
    className,
    bodyClassName,
    children,
}: ProjectHeroCardProps) {
    return (
        <div className="pt-20 md:pt-24">
            {/* ─── Cover ─── */}
            <div className={cn('relative w-full overflow-hidden', coverHeightClass)}>
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt={coverAlt}
                        // eager + high priority: the cover is LCP on both
                        // ProjectDetails and EditProject, so we want the browser
                        // to start fetching it immediately.
                        loading="eager"
                        // @ts-ignore -- fetchpriority is valid HTML but not
                        // in React's DOM lib types yet.
                        fetchpriority="high"
                        decoding="async"
                        width={1600}
                        height={520}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full bg-brutal-dark"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, rgba(245,243,238,0.05) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                )}

                {/* Subtle bottom fade so the floating card reads against the image */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brutal-bg/80 to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-brutal-dark/15 to-transparent pointer-events-none" />
            </div>

            {/* ─── Info card wrapper overlapping the cover's bottom edge ─── */}
            <div
                className={cn(
                    'max-w-6xl mx-auto px-6 md:px-12 relative z-10',
                    overlapClass,
                    className,
                )}
            >
                {backSlot && <div className="mb-4">{backSlot}</div>}

                <div
                    className={cn(
                        'bg-brutal-bg border border-brutal-dark/10 rounded-2xl p-6 md:p-8',
                        'shadow-[0_12px_48px_rgba(0,0,0,0.06)]',
                        bodyClassName,
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * Convenience preset: a standard smart-back link matching the original
 * ProjectDetails/EditProject styling. Pass via `backSlot`.
 */
export interface ProjectHeroBackLinkProps {
    /** Click handler (for Details' smart-back). */
    onClick?: () => void;
    /** Static href (for EditProject's `Link to /projects/:id`). Rendered
     * via the `as` prop so the caller can pass react-router's `Link`. */
    as?: React.ElementType;
    href?: string;
    ariaLabel?: string;
    /** Extra classes (e.g. GSAP stagger hook like `pd-hero-text`). */
    className?: string;
    children: ReactNode;
}

export function ProjectHeroBackLink({
    onClick,
    as: Component,
    href,
    ariaLabel,
    className,
    children,
}: ProjectHeroBackLinkProps) {
    const base =
        'inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-widest ' +
        'hover:text-brutal-red transition-colors text-brutal-dark/60 interactive-lift ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red rounded';

    if (Component && href) {
        const AnyComponent = Component as any;
        return (
            <AnyComponent to={href} className={cn(base, className)} aria-label={ariaLabel}>
                <ArrowLeft size={12} aria-hidden="true" /> {children}
            </AnyComponent>
        );
    }
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(base, className)}
            aria-label={ariaLabel}
        >
            <ArrowLeft size={12} aria-hidden="true" /> {children}
        </button>
    );
}
