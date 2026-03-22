import React, { useState, useEffect, useRef } from 'react';
import { useMakers } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { MagneticCard } from '../components/ui/MagneticCard';
import { Link } from 'react-router-dom';
import { RankBadge } from '../components/ui/RankBadge';
import { Search, ArrowRight, Star } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
const FILTER_DOMAINS = ['Robotics', 'Woodworking', 'Bio-Hacking', 'Additive MFG', 'Circuit Design'];

function MakerSkeleton() {
    return (
        <div className="rounded-2xl border border-brutal-dark/8 overflow-hidden animate-pulse bg-white">
            <div className="aspect-[4/3] bg-brutal-dark/5" />
            <div className="p-5 space-y-3">
                <div className="h-5 w-3/4 bg-brutal-dark/5 rounded" />
                <div className="h-3 w-1/2 bg-brutal-dark/[0.03] rounded" />
                <div className="h-3 w-full bg-brutal-dark/[0.03] rounded" />
                <div className="h-3 w-2/3 bg-brutal-dark/[0.03] rounded" />
            </div>
        </div>
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

    // Filter by search
    const filtered = (makers || []).filter(m => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return m.display_name.toLowerCase().includes(q) ||
               m.bio?.toLowerCase().includes(q) ||
               m.tags.some(t => t.toLowerCase().includes(q)) ||
               m.skills.some(s => s.toLowerCase().includes(q));
    });

    const visible = filtered.slice(0, visibleCount);
    const hasMore = filtered.length > visibleCount;

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* Hero */}
            <section className="pt-36 pb-6 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto animate-[fadeInUp_0.6s_ease-out_both]">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading leading-[0.9] mb-5">
                    Makers Directory
                </h1>
                <div className="w-16 h-1 bg-brutal-red mb-10" />
            </section>

            {/* Filter Bar */}
            <section className="border-y border-brutal-dark/10 bg-brutal-paper/30 animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
                <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-4">
                        {/* Role filters */}
                        <div>
                            <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-[0.2em] block mb-2">Filter by Designation</span>
                            <div className="flex gap-2">
                                {roles.map(r => (
                                    <button key={r} onClick={() => setRoleFilter(r)}
                                        className={`px-4 py-1.5 font-data text-[10px] font-bold rounded-sm transition-all duration-200 uppercase tracking-wider
                                            ${roleFilter === r
                                                ? 'bg-brutal-red text-brutal-bg'
                                                : 'border border-brutal-dark/15 text-brutal-dark/50 hover:border-brutal-dark/40'}`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div>
                            <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-[0.2em] block mb-2">Search Registry</span>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/25" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, skill, or domain..."
                                    className="w-full md:w-80 bg-white border border-brutal-dark/15 pl-9 pr-4 py-2 font-data text-xs text-brutal-dark placeholder:text-brutal-dark/30 focus:outline-none focus:border-brutal-dark/40 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Domain pills */}
                    <div className="flex flex-wrap gap-2">
                        {FILTER_DOMAINS.map(d => (
                            <button key={d} onClick={() => setDomainFilter(domainFilter === d ? 'All' : d)}
                                className={`px-3 py-1 font-data text-[9px] font-bold uppercase tracking-wider transition-all duration-200
                                    ${domainFilter === d
                                        ? 'bg-brutal-dark text-brutal-bg'
                                        : 'border border-brutal-dark/12 text-brutal-dark/40 hover:border-brutal-dark/30 hover:text-brutal-dark/60'}`}>
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Grid */}
            <div className="px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-12">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <MakerSkeleton key={i} />)}
                    </div>
                ) : (
                    <>
                        <div className="mk-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {visible.map(maker => {
                                const isMentor = (maker as any).userRole === 'mentor';
                                const domainTags = maker.tags.filter(t => domainNames.includes(t));
                                const rank = (maker as any).userRank || 'Curious';

                                return (
                                    <MagneticCard key={maker.id} className="mk-card" glowOnHover intensity={5}>
                                        <Link to={`/makers/${maker.id}`} className="block h-full group">
                                            <Card className="h-full flex flex-col overflow-hidden hover:border-brutal-dark/20 transition-colors duration-300 bg-white">
                                                {/* Image */}
                                                <div className="aspect-[4/3] w-full overflow-hidden bg-brutal-dark relative">
                                                    {maker.avatar_url ? (
                                                        <img src={maker.avatar_url} alt={maker.display_name}
                                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-heading text-5xl text-brutal-bg/20">
                                                            {maker.display_name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    {/* Mentor star */}
                                                    {isMentor && (
                                                        <div className="absolute top-3 right-3 w-7 h-7 bg-yellow-400/90 rounded-full flex items-center justify-center shadow-md">
                                                            <Star size={14} className="text-white fill-white" />
                                                        </div>
                                                    )}
                                                    {/* Rank badge overlay */}
                                                    <div className="absolute bottom-3 left-3">
                                                        <span className={`px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-wider rounded-sm shadow-sm
                                                            ${rank === 'Lab Pro' || rank === 'Innovator' ? 'bg-brutal-red text-white' :
                                                              rank === 'Maker' || rank === 'Builder' ? 'bg-brutal-dark text-brutal-bg' :
                                                              'bg-white/90 text-brutal-dark backdrop-blur-sm'}`}>
                                                            {rank}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-5 flex-1 flex flex-col">
                                                    <h3 className="font-heading font-bold text-lg mb-0.5 leading-tight">{maker.display_name}</h3>
                                                    {isMentor && (
                                                        <span className="font-data text-[9px] font-bold text-brutal-dark/35 uppercase tracking-[0.15em] mb-2">Param Resident Mentor</span>
                                                    )}
                                                    {!isMentor && domainTags.length > 0 && (
                                                        <span className="font-data text-[9px] font-bold text-brutal-dark/35 uppercase tracking-[0.15em] mb-2">
                                                            {domainTags[0]} Specialist
                                                        </span>
                                                    )}

                                                    <p className="font-data text-xs text-brutal-dark/50 line-clamp-3 mb-4 flex-1 leading-relaxed">
                                                        {maker.bio || 'No bio yet.'}
                                                    </p>

                                                    {/* Footer: domain dots + CTA */}
                                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-brutal-dark/5">
                                                        <div className="flex gap-1.5">
                                                            {domainTags.slice(0, 3).map(t => (
                                                                <span key={t} className="w-3 h-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[t] || '#6B7280' }} title={t} />
                                                            ))}
                                                            {domainTags.length === 0 && (
                                                                <span className="w-3 h-3 rounded-full bg-brutal-dark/10" />
                                                            )}
                                                        </div>
                                                        <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-wider group-hover:text-brutal-red transition-colors flex items-center gap-1">
                                                            View Logs <ArrowRight size={10} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Link>
                                    </MagneticCard>
                                );
                            })}
                        </div>

                        {(makers || []).length === 0 && !loading && (
                            <div className="py-16 text-center font-data text-sm text-brutal-dark/30 border border-dashed border-brutal-dark/10 rounded-2xl">
                                No makers found for this filter.
                            </div>
                        )}

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-12">
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 8)}
                                    className="px-8 py-3 bg-brutal-red text-white font-data text-xs font-bold uppercase tracking-widest hover:bg-brutal-dark transition-colors duration-300"
                                >
                                    Load More Makers
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Stats Footer */}
            <section className="border-t border-brutal-dark/10 bg-brutal-paper/20 animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
                <div className="mk-stats-grid px-6 md:px-12 lg:px-24 max-w-7xl mx-auto py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="border-l-4 border-brutal-red pl-6">
                        <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-[0.2em] block mb-2">Registry Volume</span>
                        <div className="font-heading font-bold text-5xl md:text-6xl text-brutal-dark leading-none mb-2">
                            {loading ? '—' : filtered.length.toLocaleString()}
                        </div>
                        <p className="font-data text-xs text-brutal-dark/40 leading-relaxed">
                            Verified creators contributing to the ecosystem.
                        </p>
                    </div>
                    <div className="border-l-4 border-brutal-red pl-6">
                        <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-[0.2em] block mb-2">Active Mentors</span>
                        <div className="font-heading font-bold text-5xl md:text-6xl text-brutal-dark leading-none mb-2">
                            {loading ? '—' : (makers || []).filter((m: any) => m.userRole === 'mentor').length}
                        </div>
                        <p className="font-data text-xs text-brutal-dark/40 leading-relaxed">
                            Resident mentors guiding builds across all domains.
                        </p>
                    </div>
                    <div className="border-l-4 border-brutal-red pl-6">
                        <span className="font-data text-[9px] font-bold text-brutal-dark/30 uppercase tracking-[0.2em] block mb-2">Domains Covered</span>
                        <div className="font-heading font-bold text-5xl md:text-6xl text-brutal-dark leading-none mb-2">
                            {domainNames.length}
                        </div>
                        <p className="font-data text-xs text-brutal-dark/40 leading-relaxed">
                            Technical domains from electronics to interdisciplinary research.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
