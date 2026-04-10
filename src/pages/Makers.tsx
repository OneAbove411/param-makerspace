import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMakers } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Link } from 'react-router';
import { Search, ArrowRight, Star, ChevronDown, Users, Award } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '../lib/utils';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8.d Makers Directory — Phase-2 visual cleanup.
//
// Refactored to share design language with Projects + Dashboard:
//   • Page identity (eyebrow + big heading)
//   • Bento stat row up top (Total / Mentors / Domains)
//   • Card chrome: rounded-2xl, 6px red offset, hover lift -2/-2
//   • Featured maker (first mentor or first card) gets red border-2 +
//     10px red offset shadow, slightly larger.
//
// useMakers hook is unchanged. No router/RBAC changes.
// ─────────────────────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
    Electronics: '#C4291E',
    Robotics: '#111111',
    AI: '#2563EB',
    Design: '#D97706',
    Fabrication: '#059669',
    Bio: '#7C3AED',
    Interdisciplinary: '#6B7280',
};

const domainNames = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary'];
const FILTER_DOMAINS = ['All', 'Robotics', 'Woodworking', 'Bio-Hacking', 'Additive MFG', 'Circuit Design', 'Electronics', 'AI', 'Design', 'Fabrication', 'Interdisciplinary'];

function MakerSkeleton() {
    return (
        <Card className="overflow-hidden animate-pulse border-2 border-brutal-dark/10 shadow-[6px_6px_0_0_rgba(196,41,30,0.10)]">
            <div className="aspect-[4/3] bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-brutal-dark/8 rounded" />
                <div className="h-3 w-1/2 bg-brutal-dark/[0.05] rounded" />
                <div className="h-3 w-full bg-brutal-dark/[0.05] rounded" />
                <div className="h-3 w-2/3 bg-brutal-dark/[0.05] rounded" />
            </div>
        </Card>
    );
}

export function Makers() {
    const [roleFilter, setRoleFilter] = useState('All');
    const [domainFilter, setDomainFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(8);
    const roles = ['All', 'Makers', 'Mentors'];

    const { data: makers, loading } = useMakers(
        domainFilter !== 'All' ? domainFilter : undefined,
        roleFilter === 'Mentors' ? 'mentor' : roleFilter === 'Makers' ? 'maker' : undefined
    );

    const pageRef = useRef<HTMLDivElement>(null);

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(8);
    }, [roleFilter, domainFilter, searchQuery]);

    // GSAP scroll-triggered animations only (non-hero elements)
    const hasAnimatedCards = useRef(false);
    useEffect(() => {
        if (loading || !makers?.length || !pageRef.current || hasAnimatedCards.current) return;
        hasAnimatedCards.current = true;
        const cards = pageRef.current.querySelectorAll('.mk-card');
        if (cards.length) {
            gsap.fromTo(cards,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: 'power3.out',
                  scrollTrigger: { trigger: '.mk-grid', start: 'top 85%' } }
            );
        }
    }, [loading, makers?.length]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo('.mk-hero-text',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' }
            );
            gsap.fromTo('.mk-bento-tile',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.1 }
            );
        }, pageRef);
        return () => ctx.revert();
    }, []);

    // Filter by search
    const filtered = useMemo(() => (makers || []).filter(m => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return m.display_name.toLowerCase().includes(q) ||
               m.bio?.toLowerCase().includes(q) ||
               m.tags.some(t => t.toLowerCase().includes(q)) ||
               m.skills.some(s => s.toLowerCase().includes(q));
    }), [makers, searchQuery]);

    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    const mentorCount = (makers || []).filter((m: any) => m.userRole === 'mentor').length;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* PAGE IDENTITY */}
                <div className="flex items-end justify-between mb-6 md:mb-8">
                    <div>
                        <p className="mk-hero-text font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/50 mb-2">
                            Makers Directory
                        </p>
                        <h1 className="mk-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                            {filtered.length} maker{filtered.length === 1 ? '' : 's'}
                            <span className="text-brutal-dark/30"> · find, follow, collaborate</span>
                        </h1>
                    </div>
                </div>

                {/* BENTO STATS ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6 mb-10">
                    <BentoStat
                        icon={Users}
                        label="Registry Volume"
                        value={loading ? null : (makers || []).length}
                        sub="Verified creators"
                        dark
                        className="mk-bento-tile"
                    />
                    <BentoStat
                        icon={Star}
                        label="Active Mentors"
                        value={loading ? null : mentorCount}
                        sub="Resident guides"
                        className="mk-bento-tile"
                    />
                    <BentoStat
                        icon={Award}
                        label="Domains"
                        value={domainNames.length}
                        sub="Cross-disciplinary"
                        className="mk-bento-tile"
                    />
                </div>

                {/* FILTER BAR */}
                <Card className="mb-10 border-2 border-brutal-dark/15 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <FilterDropdown label="Domain" value={domainFilter} options={FILTER_DOMAINS} onChange={setDomainFilter} />
                            <FilterDropdown label="Role" value={roleFilter} options={roles} onChange={setRoleFilter} />
                        </div>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, skill, or domain..."
                                className="w-full md:w-72 bg-brutal-bg border-2 border-brutal-dark/15 rounded-full pl-9 pr-4 py-2 font-data text-xs text-brutal-dark placeholder:text-brutal-dark/30 focus:outline-none focus:border-brutal-dark transition-colors"
                            />
                        </div>
                    </div>
                </Card>

                {/* GRID */}
                <div className="pb-32">
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                            {[...Array(8)].map((_, i) => <MakerSkeleton key={i} />)}
                        </div>
                    ) : (
                        <>
                            <div className="mk-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                                {visible.map((maker, idx) => {
                                    const isMentor = (maker as any).userRole === 'mentor';
                                    const domainTags = maker.tags.filter(t => domainNames.includes(t));
                                    const rank = (maker as any).userRank || 'Curious';
                                    const isFeatured = idx === 0 && isMentor;

                                    return (
                                        <Link
                                            key={maker.id}
                                            to={`/makers/${maker.id}`}
                                            className="mk-card block group focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brutal-red rounded-2xl"
                                        >
                                            <Card
                                                className={cn(
                                                    'h-full flex flex-col overflow-hidden',
                                                    'border-2',
                                                    'transition-all duration-200 ease-out',
                                                    'motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 motion-reduce:transition-none',
                                                    isFeatured
                                                        ? 'border-brutal-red/40 shadow-[10px_10px_0_0_rgba(196,41,30,0.22)] hover:shadow-[12px_12px_0_0_rgba(196,41,30,0.32)] hover:border-brutal-red/60'
                                                        : 'border-brutal-dark/15 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.28)] hover:border-brutal-red/40',
                                                )}
                                            >
                                                {/* Image */}
                                                <div className="aspect-[4/3] w-full overflow-hidden bg-brutal-dark relative">
                                                    {maker.avatar_url ? (
                                                        <img src={maker.avatar_url} alt={maker.display_name} loading="lazy"
                                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-heading font-bold text-5xl text-brutal-bg/20" style={{
                                                            backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.08) 1px, transparent 1px)',
                                                            backgroundSize: '24px 24px',
                                                        }}>
                                                            {maker.display_name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brutal-dark/50 to-transparent pointer-events-none" />

                                                    {/* Mentor star */}
                                                    {isMentor && (
                                                        <div className="absolute top-3 right-3 w-7 h-7 bg-brutal-red rounded-full flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] border-2 border-brutal-bg z-10">
                                                            <Star size={12} className="text-brutal-bg fill-brutal-bg" />
                                                        </div>
                                                    )}
                                                    {/* Rank badge overlay */}
                                                    <div className="absolute bottom-3 left-3 z-10">
                                                        <span className={cn(
                                                            'px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-wider rounded-full border',
                                                            rank === 'Lab Pro' || rank === 'Innovator'
                                                                ? 'bg-brutal-red text-brutal-bg border-brutal-red shadow-[2px_2px_0_0_rgba(0,0,0,0.18)]'
                                                                : rank === 'Maker' || rank === 'Builder'
                                                                ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[2px_2px_0_0_rgba(196,41,30,0.5)]'
                                                                : 'bg-brutal-bg/95 text-brutal-dark border-brutal-dark/20 backdrop-blur-sm',
                                                        )}>
                                                            {rank}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-5 flex-1 flex flex-col">
                                                    {/* Eyebrow */}
                                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red mb-2">
                                                        {isMentor
                                                            ? '#Mentor'
                                                            : domainTags.length > 0
                                                            ? `#${domainTags[0]}`
                                                            : '#Maker'}
                                                    </span>

                                                    <h3 className="font-heading font-bold text-lg mb-1 leading-tight uppercase tracking-tight-heading group-hover:text-brutal-red transition-colors">
                                                        {maker.display_name}
                                                    </h3>
                                                    {isMentor && (
                                                        <span className="font-data text-[9px] font-bold text-brutal-dark/40 uppercase tracking-[0.15em] mb-2">
                                                            Resident Mentor
                                                        </span>
                                                    )}

                                                    <p className="font-data text-xs text-brutal-dark/55 line-clamp-3 mb-4 flex-1 leading-relaxed">
                                                        {maker.bio || 'No bio yet.'}
                                                    </p>

                                                    {/* Footer: domain dots + CTA */}
                                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-brutal-dark/10">
                                                        <div className="flex gap-1.5" aria-label="Domain affinity">
                                                            {domainTags.slice(0, 3).map(t => (
                                                                <span key={t} className="w-3 h-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[t] || '#6B7280' }} title={t} />
                                                            ))}
                                                            {domainTags.length === 0 && (
                                                                <span className="w-3 h-3 rounded-full bg-brutal-dark/10" />
                                                            )}
                                                        </div>
                                                        <span className="font-data text-[10px] font-bold text-brutal-dark/40 uppercase tracking-widest group-hover:text-brutal-red transition-colors flex items-center gap-1 group-hover:gap-2">
                                                            View Logs <ArrowRight size={10} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Link>
                                    );
                                })}
                            </div>

                            {filtered.length === 0 && !loading && (
                                <div className="py-24 text-center space-y-4">
                                    <div className="font-heading font-bold text-5xl text-brutal-dark/10 uppercase tracking-tight-heading">
                                        No Makers Found
                                    </div>
                                    <p className="font-data text-sm text-brutal-dark/40 max-w-md mx-auto">
                                        No makers match the current filters. Try clearing them.
                                    </p>
                                </div>
                            )}

                            {/* Load More */}
                            {hasMore && (
                                <div className="flex justify-center mt-12">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 8)}
                                        className="flex items-center gap-3 px-8 py-3.5 bg-brutal-dark text-brutal-bg font-data text-xs font-bold uppercase tracking-widest rounded-full hover:bg-brutal-red transition-colors duration-300 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.55)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.7)]"
                                    >
                                        Load More Makers
                                        <ArrowRight size={14} className="opacity-60" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Internal: BentoStat clone ────────────────────────────────

interface BentoStatProps {
    icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    label: string;
    value: number | null;
    sub: string;
    dark?: boolean;
    className?: string;
}

function BentoStat({ icon: Icon, label, value, sub, dark, className }: BentoStatProps) {
    return (
        <div
            className={cn(
                'group relative rounded-2xl p-5 min-h-[140px] overflow-hidden border-2',
                'flex flex-col justify-between',
                dark
                    ? 'bg-brutal-dark text-brutal-bg border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.9)]'
                    : 'bg-brutal-bg border-brutal-dark/20 shadow-[6px_6px_0_0_rgba(196,41,30,0.18)]',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3 relative">
                <Icon className={cn('w-5 h-5 flex-shrink-0', dark ? 'text-brutal-bg/70' : 'text-brutal-red')} aria-hidden />
                {value === null ? (
                    <div className={cn('h-9 w-12 rounded motion-safe:animate-pulse', dark ? 'bg-brutal-bg/15' : 'bg-brutal-dark/10')} />
                ) : (
                    <div className={cn('text-4xl font-heading font-bold tabular-nums leading-none', dark ? 'text-brutal-bg' : 'text-brutal-dark')}>
                        {value.toLocaleString()}
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between gap-2">
                <div>
                    <div className={cn('font-data text-[11px] font-bold uppercase tracking-widest leading-snug', dark ? 'text-brutal-bg/65' : 'text-brutal-dark/60')}>
                        {label}
                    </div>
                    <div className={cn('font-data text-[10px] mt-1', dark ? 'text-brutal-bg/40' : 'text-brutal-dark/40')}>
                        {sub}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Internal: filter dropdown ────────────────────────────────

interface FilterDropdownProps {
    label: string;
    value: string;
    options: string[];
    onChange: (next: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
    return (
        <div className="flex items-center gap-3">
            <span className="font-data text-[10px] font-bold uppercase text-brutal-dark/40 tracking-widest">
                {label}:
            </span>
            <div className="relative w-full sm:w-auto">
                <select
                    className="appearance-none bg-brutal-bg border-2 border-brutal-dark/15 rounded-full
                               w-full sm:w-auto px-5 py-2 pr-9 font-data text-xs font-bold uppercase tracking-wider
                               focus:outline-none focus:border-brutal-dark transition-colors cursor-pointer"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    {options.map(o => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-dark/40 pointer-events-none" />
            </div>
        </div>
    );
}
