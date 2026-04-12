import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Plus, Zap, Sparkles } from 'lucide-react';

import { useProjects, useRankAccess, useMyBookmarkedProjectIds, useToggleProjectBookmark } from '../lib/hooks';
import type { ProjectListItem } from '../lib/hooks';
import { canAccess } from '../lib/rankAccess';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { RANK_THRESHOLDS, RANK_ORDER, XP_REWARDS } from '../lib/constants';
import { RankGate } from '../components/ui/RankGate';

import { ProjectCard } from '../components/projects/ProjectCard';
import type { ProjectsSort, ProjectsView } from '../components/projects/ProjectsFilterRail';
import { MobileFilterSheet } from '../components/projects/MobileFilterSheet';
import { RemixModal } from '../components/project/RemixModal';
import {
    ProjectsCommandPalette,
    type ProjectCommand,
} from '../components/projects/ProjectsCommandPalette';

// New shared components (SPEC.md Directive 1)
import { ListingLayout } from '../components/shared/ListingLayout';
import { ListingSidebar } from '../components/shared/ListingSidebar';
import { SidebarSearch } from '../components/shared/SidebarSearch';
import { SidebarChipGroup, type ChipOption } from '../components/shared/SidebarChipGroup';
import { GamificationNudge } from '../components/shared/GamificationNudge';
import { MobileFilterBar } from '../components/shared/MobileFilterBar';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8 Archive Cockpit — Projects page (SPEC.md refactor)
//
// Layout migration:
//   • ProjectsCommandBar  → REMOVED on desktop. Mobile: MobileFilterBar.
//   • FacetRail           → REPLACED by ListingSidebar + composed filter sections.
//   • PostProjectCTA      → REMOVED from grid. XP incentive now in sidebar GamificationNudge.
//   • CSS columns         → CSS Grid with @container queries.
//
// ALL data hooks, URL state, keyboard shortcuts, overlays preserved.
// ─────────────────────────────────────────────────────────────

const DOMAINS = [
    'Software & Robotics',
    'Fabrication',
    'Electronics',
    'AI & Machine Learning',
    'Bio-Hacking',
    'Woodworking',
    'Interdisciplinary',
];

const DEFAULT_SORT: ProjectsSort = 'trending';
const DEFAULT_VIEW: ProjectsView = 'grid';

// ── Sort selector for sidebar ──
function SidebarSortSelect({ value, onChange }: { value: ProjectsSort; onChange: (v: ProjectsSort) => void }) {
    return (
        <div>
            <h3 className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 mb-2">Sort</h3>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as ProjectsSort)}
                className="w-full h-8 px-2.5 rounded-lg border border-brutal-dark/15 bg-transparent font-data text-[11px] font-bold uppercase tracking-wider text-brutal-dark/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-red"
            >
                <option value="trending">Trending</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
            </select>
        </div>
    );
}


function ProjectSkeleton() {
    return (
        <div className="animate-pulse rounded-lg overflow-hidden bg-brutal-dark/10 aspect-[3/4] relative">
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Memoized card wrappers to prevent re-renders on keystroke
// ─────────────────────────────────────────────────────────────

interface CardItemProps {
    project: ProjectListItem;
    variant?: 'archive' | 'featured';
    isNew?: boolean;
    bookmarkedIds: Set<string> | null | undefined;
    onRemix?: (p: ProjectListItem) => void;
    onToggleBookmark?: (p: ProjectListItem, currentlyBookmarked: boolean) => Promise<boolean>;
}

const CardItem = React.memo(function CardItem({ project, variant = 'archive', isNew = false, bookmarkedIds, onRemix, onToggleBookmark }: CardItemProps) {
    const isBookmarked = bookmarkedIds?.has(project.id) ?? false;
    return (
        <ProjectCard
            project={project}
            variant={variant}
            isNew={isNew}
            isBookmarked={isBookmarked}
            onRemix={onRemix}
            onToggleBookmark={onToggleBookmark}
        />
    );
});

// ─────────────────────────────────────────────────────────────
//  Main page
// ─────────────────────────────────────────────────────────────

export function Projects() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── URL state parsing ─────────────────────────────────────
    const parseCsv = (v: string | null) =>
        (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);

    const selectedDomains = useMemo(
        () => parseCsv(searchParams.get('domain')),
        [searchParams]
    );
    const selectedTags = useMemo(() => parseCsv(searchParams.get('tags')), [searchParams]);
    const sort = (searchParams.get('sort') as ProjectsSort) || DEFAULT_SORT;
    const view = (searchParams.get('view') as ProjectsView) || DEFAULT_VIEW;
    const query = searchParams.get('q') || '';

    const updateParams = useCallback(
        (mutator: (p: URLSearchParams) => void) => {
            const p = new URLSearchParams(searchParams);
            mutator(p);
            setSearchParams(p, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    const setDomains = (next: string[]) =>
        updateParams((p) => {
            if (next.length === 0) p.delete('domain');
            else p.set('domain', next.join(','));
        });
    const setTags = (next: string[]) =>
        updateParams((p) => {
            if (next.length === 0) p.delete('tags');
            else p.set('tags', next.join(','));
        });
    const setSort = (next: ProjectsSort) =>
        updateParams((p) => {
            if (next === DEFAULT_SORT) p.delete('sort');
            else p.set('sort', next);
        });
    const setView = (next: ProjectsView) =>
        updateParams((p) => {
            if (next === DEFAULT_VIEW) p.delete('view');
            else p.set('view', next);
        });
    const setQuery = (next: string) =>
        updateParams((p) => {
            if (!next) p.delete('q');
            else p.set('q', next);
        });

    const toggleDomain = (d: string) => {
        const next = selectedDomains.includes(d)
            ? selectedDomains.filter((x) => x !== d)
            : [...selectedDomains, d];
        setDomains(next);
    };
    const toggleTag = (t: string) => {
        const next = selectedTags.includes(t)
            ? selectedTags.filter((x) => x !== t)
            : [...selectedTags, t];
        setTags(next);
    };

    const clearAll = () => {
        setSearchParams(new URLSearchParams(), { replace: true });
    };

    // ── Data ─────────────────────────────────────────────────
    const { data: projects, loading } = useProjects(undefined, sort);
    const { data: bookmarkedIds, refetch: refetchBookmarks } = useMyBookmarkedProjectIds();
    const { user } = useAuth();
    const { data: rankInfo } = useRankAccess();
    const canPropose = !!rankInfo?.rank && canAccess(rankInfo.rank, 'create_project');

    // ── Card-level Save (bookmark) handler ───────────────────
    const toggleBookmark = useToggleProjectBookmark();
    const handleToggleBookmark = useCallback(
        async (p: ProjectListItem, currentlyBookmarked: boolean) => {
            if (!rankInfo) {
                navigate('/login');
                return currentlyBookmarked;
            }
            const next = await toggleBookmark(p.id, currentlyBookmarked);
            refetchBookmarks();
            return next;
        },
        [toggleBookmark, refetchBookmarks, rankInfo, navigate],
    );

    // ── Derived — available tag universe ─────────────────────
    const allTags = useMemo(() => {
        if (!projects) return [] as string[];
        const set = new Set<string>();
        for (const p of projects) for (const t of p.tags) set.add(t);
        return Array.from(set).sort();
    }, [projects]);

    // ── Derived — domain counts (for sidebar) ────────────────
    const domainCounts = useMemo(() => {
        if (!projects) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        for (const p of projects) {
            if (p.domain) counts[p.domain] = (counts[p.domain] || 0) + 1;
        }
        return counts;
    }, [projects]);

    // ── Derived — tag counts ─────────────────────────────────
    const tagCounts = useMemo(() => {
        if (!projects) return {} as Record<string, number>;
        const counts: Record<string, number> = {};
        for (const p of projects) {
            for (const t of p.tags) counts[t] = (counts[t] || 0) + 1;
        }
        return counts;
    }, [projects]);

    // ── Filter pipeline ─────────────────────────────────────
    const filteredProjects = useMemo(() => {
        if (!projects) return [] as ProjectListItem[];
        const q = query.trim().toLowerCase();
        return projects.filter((p) => {
            if (selectedDomains.length > 0 && !selectedDomains.includes(p.domain || '')) return false;
            if (selectedTags.length > 0) {
                const hasAll = selectedTags.every((t) => p.tags.includes(t));
                if (!hasAll) return false;
            }
            if (view === 'bookmarks') {
                if (!bookmarkedIds || !bookmarkedIds.has(p.id)) return false;
            }
            if (q) {
                const hay = [
                    p.title,
                    p.summary || '',
                    p.domain || '',
                    p.owner_name || '',
                    ...p.tags,
                ]
                    .join(' ')
                    .toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [projects, selectedDomains, selectedTags, view, bookmarkedIds, query]);

    const hasActiveFilters =
        selectedDomains.length > 0 ||
        selectedTags.length > 0 ||
        sort !== DEFAULT_SORT ||
        view !== DEFAULT_VIEW ||
        !!query;

    // ── Remix modal state ────────────────────────────────────
    const [remixProject, setRemixProject] = useState<ProjectListItem | null>(null);
    const openRemix = useCallback((p: ProjectListItem) => setRemixProject(p), []);
    const closeRemix = useCallback(() => setRemixProject(null), []);

    // ── Command palette state ────────────────────────────────
    const [paletteOpen, setPaletteOpen] = useState(false);

    // ── Mobile filter sheet state ────────────────────────────
    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cycle view helper used by shortcut + command palette
    const cycleView = useCallback(() => {
        const next: ProjectsView =
            view === 'grid' ? 'list' : view === 'list' ? 'bookmarks' : 'grid';
        setView(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view]);

    // ── Keyboard shortcuts ───────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tgt = e.target as HTMLElement | null;
            const typing =
                !!tgt &&
                (tgt.tagName === 'INPUT' ||
                    tgt.tagName === 'TEXTAREA' ||
                    tgt.isContentEditable);

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((o) => !o);
                return;
            }

            if (typing) return;

            if (e.key === '/') {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }
            if (e.key === 'b') {
                e.preventDefault();
                setView(view === 'bookmarks' ? 'grid' : 'bookmarks');
                return;
            }
            if (e.key === 'v') {
                e.preventDefault();
                cycleView();
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, cycleView]);

    // ── GSAP intro animations ────
    const pageRef = useRef<HTMLDivElement>(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (loading || hasAnimated.current) return;
        hasAnimated.current = true;
        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.project-card-animated',
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    stagger: 0.08,
                    ease: 'power3.out',
                    delay: 0.15,
                }
            );
        }, pageRef);
        return () => ctx.revert();
    }, [loading]);

    // ── Command palette command list ─────────────────────────
    const commands = useMemo<ProjectCommand[]>(() => {
        const list: ProjectCommand[] = [];

        for (const p of filteredProjects.slice(0, 20)) {
            list.push({
                id: `nav:${p.id}`,
                label: p.title,
                hint: p.domain || undefined,
                section: 'Navigate',
                keywords: p.tags,
                run: () => navigate(`/projects/${p.id}`),
            });
        }

        for (const d of DOMAINS) {
            list.push({
                id: `filter:domain:${d}`,
                label: `Filter → ${d}`,
                section: 'Filter',
                keywords: ['domain', d],
                run: () => setDomains([d]),
            });
        }

        const sorts: Array<{ id: ProjectsSort; label: string }> = [
            { id: 'trending', label: 'Sort by Trending' },
            { id: 'newest', label: 'Sort by Newest' },
            { id: 'oldest', label: 'Sort by Oldest' },
        ];
        for (const s of sorts) {
            list.push({
                id: `filter:sort:${s.id}`,
                label: s.label,
                section: 'Filter',
                keywords: ['sort', s.id],
                run: () => setSort(s.id),
            });
        }

        const views: Array<{ id: ProjectsView; label: string }> = [
            { id: 'grid', label: 'Switch to Grid view' },
            { id: 'list', label: 'Switch to List view' },
            { id: 'bookmarks', label: 'Show only Bookmarks' },
        ];
        for (const v of views) {
            list.push({
                id: `view:${v.id}`,
                label: v.label,
                section: 'View',
                keywords: ['view', v.id],
                run: () => setView(v.id),
            });
        }

        list.push({
            id: 'action:focus-search',
            label: 'Focus search',
            hint: '/',
            section: 'Actions',
            run: () => searchInputRef.current?.focus(),
        });
        list.push({
            id: 'action:clear',
            label: 'Clear all filters',
            section: 'Actions',
            run: clearAll,
        });
        if (canPropose) {
            list.push({
                id: 'action:propose',
                label: 'Propose a new project',
                section: 'Actions',
                run: () => navigate('/dashboard'),
            });
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredProjects, canPropose, navigate]);

    // ── Sidebar chip data ────────────────────────────────────
    const domainChips: ChipOption[] = DOMAINS.map((d) => ({
        value: d,
        label: d,
        count: domainCounts[d] || 0,
    }));

    const tagChips: ChipOption[] = allTags.slice(0, 30).map((t) => ({
        value: t,
        label: t,
        count: tagCounts[t] || 0,
    }));

    // ── Render ───────────────────────────────────────────────
    return (
        <div
            ref={pageRef}
            className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 min-h-screen"
        >
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-0">
                {/* ─── Page heading ─── */}
                <div className="px-0 lg:px-8 mb-6 md:mb-8">
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="inline-block w-6 h-[3px] bg-brutal-red" aria-hidden />
                                <p className="font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/60">Project Archive</p>
                            </div>
                            <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                                {filteredProjects.length} build{filteredProjects.length === 1 ? '' : 's'}
                                <span className="text-brutal-dark/30"> · browse, remix, build</span>
                            </h1>
                            {filteredProjects.length > 0 && (() => {
                                const newest = filteredProjects.reduce((a, b) =>
                                    new Date(b.created_at) > new Date(a.created_at) ? b : a
                                );
                                const daysAgo = Math.floor(
                                    (Date.now() - new Date(newest.created_at).getTime()) / (1000 * 60 * 60 * 24)
                                );
                                const timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? '1d ago' : `${daysAgo}d ago`;
                                return (
                                    <p className="font-data text-[11px] text-brutal-dark/40 mt-1">
                                        Latest: <span className="font-bold text-brutal-dark/55">{newest.title}</span> posted {timeLabel}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* ─── Mobile filter bar (< lg) ─── */}
                <MobileFilterBar
                    searchValue={query}
                    onSearch={setQuery}
                    onOpenFilters={() => setMobileSheetOpen(true)}
                    placeholder="Search projects…"
                />

                {/* ─── Two-column layout ─── */}
                <ListingLayout
                    sidebar={
                        <ListingSidebar>
                            <SidebarSearch
                                value={query}
                                onChange={setQuery}
                                placeholder="Search projects…"
                                inputRef={searchInputRef}
                            />
                            <SidebarChipGroup
                                label="Domain"
                                options={domainChips}
                                selected={selectedDomains}
                                onChange={setDomains}
                            />
                            <SidebarChipGroup
                                label="Tags"
                                options={tagChips}
                                selected={selectedTags}
                                onChange={setTags}
                            />
                            <SidebarSortSelect value={sort} onChange={setSort} />
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="w-full font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red border border-brutal-red/20 rounded-lg py-2 hover:bg-brutal-red/5 transition-colors"
                                >
                                    Clear all filters
                                </button>
                            )}
                            <GamificationNudge />
                        </ListingSidebar>
                    }
                >
                    {loading ? (
                        <div className="">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <ProjectSkeleton key={i} />
                                ))}
                            </div>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="py-24 text-center space-y-4">
                            <div className="font-heading font-bold text-5xl text-brutal-dark/10 uppercase tracking-tight-heading">
                                {view === 'bookmarks' ? 'No Bookmarks' : 'Nothing Found'}
                            </div>
                            <p className="font-data text-sm text-brutal-dark/40 max-w-md mx-auto">
                                {view === 'bookmarks'
                                    ? 'Bookmark projects from their detail page and they will show up here.'
                                    : hasActiveFilters
                                    ? 'No projects match the current filters. Try clearing some chips.'
                                    : 'Be the first to propose a project and start building.'}
                            </p>
                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="font-data text-[11px] font-bold uppercase tracking-widest text-brutal-red border-b-2 border-brutal-red/40 pb-0.5 hover:border-brutal-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : view === 'list' ? (
                        <div className="project-grid grid grid-cols-2 lg:grid-cols-4 gap-4 pb-32">
                            {filteredProjects.map((p) => (
                                <div key={p.id} className="project-card-animated">
                                    <CardItem
                                        project={p}
                                        variant="archive"
                                        bookmarkedIds={bookmarkedIds}
                                        onRemix={openRemix}
                                        onToggleBookmark={handleToggleBookmark}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="pb-32">
                            {/* Uniform grid — 3 per row */}
                            <div className="project-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredProjects.map((p) => {
                                    const isNew = (Date.now() - new Date(p.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
                                    return (
                                        <div
                                            key={p.id}
                                            className="project-card-animated"
                                        >
                                            <CardItem
                                                project={p}
                                                variant="archive"
                                                isNew={isNew}
                                                bookmarkedIds={bookmarkedIds}
                                                        onRemix={openRemix}
                                                onToggleBookmark={handleToggleBookmark}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </ListingLayout>

                {/* ─── Sticky mobile propose ─── */}
                {canPropose ? (
                    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-gradient-to-t from-brutal-bg via-brutal-bg/95 to-transparent pointer-events-none">
                        <Link
                            to="/dashboard"
                            aria-label="Propose a new project"
                            className="pointer-events-auto flex items-center justify-center gap-2 w-full bg-brutal-dark text-brutal-bg font-heading font-bold uppercase tracking-widest text-sm px-6 py-4 rounded-full border-2 border-brutal-dark shadow-[3px_3px_0_0_rgba(196,41,30,0.12)] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red active:translate-y-[1px] transition-transform"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Propose Project
                        </Link>
                    </div>
                ) : user && (
                    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-gradient-to-t from-brutal-bg via-brutal-bg/95 to-transparent pointer-events-none">
                        <div className="pointer-events-auto">
                            <RankGate feature="create_project" compact />
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Overlays ─── */}
            <MobileFilterSheet
                open={mobileSheetOpen}
                onClose={() => setMobileSheetOpen(false)}
                domains={DOMAINS}
                selectedDomains={selectedDomains}
                onToggleDomain={toggleDomain}
                allTags={allTags}
                selectedTags={selectedTags}
                onToggleTag={toggleTag}
                sort={sort}
                onSortChange={setSort}
                onClearAll={clearAll}
                hasActiveFilters={hasActiveFilters}
                resultCount={filteredProjects.length}
            />
            <RemixModal open={!!remixProject} origin={remixProject} onClose={closeRemix} />
            <ProjectsCommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                commands={commands}
            />
        </div>
    );
}
