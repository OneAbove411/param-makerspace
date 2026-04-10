import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Plus } from 'lucide-react';

import { useProjects, useRankAccess, useMyBookmarkedProjectIds, useToggleProjectBookmark } from '../lib/hooks';
import type { ProjectListItem } from '../lib/hooks';
import { canAccess } from '../lib/rankAccess';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { RankGate } from '../components/ui/RankGate';

import { Card } from '../components/ui/Card';
import { ProjectCard } from '../components/projects/ProjectCard';
import { FacetRail } from '../components/projects/FacetRail';
import type { ProjectsSort, ProjectsView } from '../components/projects/ProjectsFilterRail';
import { ProjectsCommandBar } from '../components/projects/ProjectsCommandBar';
import { MobileFilterSheet } from '../components/projects/MobileFilterSheet';
import { ProjectQuickPeek } from '../components/projects/ProjectQuickPeek';
import { RemixModal } from '../components/project/RemixModal';
import {
    ProjectsCommandPalette,
    type ProjectCommand,
} from '../components/projects/ProjectsCommandPalette';

gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────────────────────────
// §8 Archive Cockpit — Projects page (Phase-1 Step-2 archive visual cleanup).
//
// Composes:
//   • ProjectsCommandBar        — 72px sticky bar (search + sort only)
//   • FacetRail                 — 220px sticky left sidebar (≥ lg) with domains, tags, view
//   • MobileFilterSheet         — bottom sheet triggered on <md
//   • ProjectCard               — merged archive + featured variants, CSS columns layout
//   • ProjectQuickPeek          — right-drawer preview
//   • ProjectsCommandPalette    — ⌘K global actions
//
// URL state keys (shareable, refreshable):
//   ?domain=A,B     multi-select domain chips
//   ?tags=x,y       multi-select tag chips
//   ?sort=trending  sort mode (newest | oldest | trending)
//   ?view=list      view mode (grid | list | bookmarks)
//   ?q=text         search query
//
// Keyboard shortcuts (H7 — flexibility/efficiency):
//   /            focus search input
//   ⌘K / Ctrl+K  open command palette
//   g then p     noop (already here)
//   b            toggle Bookmarks view
//   v            cycle Grid → List → Bookmarks
//   Esc          close palette / quick peek
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

// Phase-1 Step-2: default sort is now 'trending' so the most-liked project
// lands in slot 1 (the 2x featured slot).
const DEFAULT_SORT: ProjectsSort = 'trending';
const DEFAULT_VIEW: ProjectsView = 'grid';

// ─── "Propose a Project" CTA card (guardrail: preserve italic / dashed) ───

function ProposeCTA() {
    const navigate = useNavigate();
    return (
        <div onClick={() => navigate('/dashboard')} className="group cursor-pointer h-full">
            <Card className="h-full flex flex-col items-center justify-center p-8 border-dashed border-brutal-dark/15 hover:border-brutal-red/40 transition-all duration-500 bg-brutal-bg hover:bg-brutal-red/[0.03] min-h-[320px]">
                <div className="w-14 h-14 rounded-full border-2 border-brutal-dark/10 flex items-center justify-center group-hover:border-brutal-red/30 group-hover:bg-brutal-red/5 transition-all duration-500">
                    <Plus size={24} className="text-brutal-dark/25 group-hover:text-brutal-red transition-colors duration-500" />
                </div>
                <h3 className="font-heading font-bold text-lg mt-6 text-brutal-dark/50 group-hover:text-brutal-dark transition-colors duration-500 text-center">
                    Be the first to build<br />something
                </h3>
                <p className="font-data text-[10px] text-brutal-dark/30 uppercase tracking-[0.15em] mt-3 group-hover:text-brutal-dark/50 transition-colors duration-500">
                    Start your own legacy
                </p>
                <div className="mt-6 px-5 py-2.5 rounded-full border-2 border-brutal-dark/15 font-heading font-bold text-xs uppercase tracking-widest text-brutal-dark/40 group-hover:bg-brutal-dark group-hover:text-brutal-bg group-hover:border-brutal-dark transition-all duration-500 flex items-center gap-2">
                    Propose a Project
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
            </Card>
        </div>
    );
}

function ProjectSkeleton({ spanCols = false }: { spanCols?: boolean }) {
    return (
        <Card
            className={cn(
                'h-full flex flex-col animate-pulse',
                spanCols && 'md:col-span-2 lg:col-span-2',
            )}
        >
            <div className="h-48 bg-brutal-dark/5" />
            <div className="p-6 space-y-4 flex-1">
                <div className="h-3 w-20 bg-brutal-dark/8 rounded" />
                <div className="h-6 w-3/4 bg-brutal-dark/8 rounded" />
                <div className="h-3 w-full bg-brutal-dark/5 rounded" />
                <div className="h-3 w-2/3 bg-brutal-dark/5 rounded" />
            </div>
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────
// Memoized card wrappers to prevent re-renders on keystroke
// ─────────────────────────────────────────────────────────────

interface CardItemProps {
    project: ProjectListItem;
    variant?: 'archive' | 'featured';
    bookmarkedIds: Set<string> | null | undefined;
    onQuickPeek: (p: ProjectListItem) => void;
    onRemix?: (p: ProjectListItem) => void;
    onToggleBookmark?: (p: ProjectListItem, currentlyBookmarked: boolean) => Promise<boolean>;
}

const CardItem = React.memo(function CardItem({ project, variant = 'archive', bookmarkedIds, onQuickPeek, onRemix, onToggleBookmark }: CardItemProps) {
    const isBookmarked = bookmarkedIds?.has(project.id) ?? false;
    return (
        <ProjectCard
            project={project}
            variant={variant}
            isBookmarked={isBookmarked}
            onQuickPeek={onQuickPeek}
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
    // Note: we fetch ALL projects client-side (no server-side domain filter)
    // so multi-select + search + trending can all be computed in memory.
    // This is cheap for the archive — one batched fetch, cached by the
    // stale-while-revalidate useSupabaseQuery.
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
            // Refresh the parent set so the "Saved" view filter stays in sync
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

    // ── Quick peek state ─────────────────────────────────────
    const [peek, setPeek] = useState<ProjectListItem | null>(null);
    const openPeek = useCallback((p: ProjectListItem) => setPeek(p), []);
    const closePeek = useCallback(() => setPeek(null), []);

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
            // Do not interfere while typing in inputs (except for modifier combos).
            const tgt = e.target as HTMLElement | null;
            const typing =
                !!tgt &&
                (tgt.tagName === 'INPUT' ||
                    tgt.tagName === 'TEXTAREA' ||
                    tgt.isContentEditable);

            // ⌘K / Ctrl+K — always works
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

    // ── GSAP intro animations — runs ONCE, respects reduced-motion ────
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
                '.filter-rail',
                { y: -10, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.1 }
            );
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

        // Navigate — jump to each visible project
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

        // Filter — set each domain as the sole filter
        for (const d of DOMAINS) {
            list.push({
                id: `filter:domain:${d}`,
                label: `Filter → ${d}`,
                section: 'Filter',
                keywords: ['domain', d],
                run: () => setDomains([d]),
            });
        }

        // Filter — sorts
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

        // View
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

        // Actions
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

    // ── Render ───────────────────────────────────────────────
    return (
        <div
            ref={pageRef}
            className="flex-1 w-full bg-brutal-bg pt-28 md:pt-32 px-6 md:px-12 lg:px-24 min-h-screen"
        >
            <div className="max-w-7xl mx-auto">
                {/* ─── Project Archive identity ─── */}
                <div className="flex items-end justify-between mb-6 md:mb-8">
                    <div>
                        <p className="font-data text-[10px] font-bold uppercase tracking-[0.25em] text-brutal-dark/50 mb-2">Project Archive</p>
                        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                            {filteredProjects.length} build{filteredProjects.length === 1 ? '' : 's'}
                            <span className="text-brutal-dark/30"> · browse, remix, build</span>
                        </h1>
                    </div>
                </div>

                {/* ─── Sticky Command Bar (full-width) ─── */}
                <ProjectsCommandBar
                    search={query}
                    onSearchChange={setQuery}
                    searchInputRef={searchInputRef}
                    sort={sort}
                    onSortChange={setSort}
                />

                {/* ─── Facet Rail (left) + Content (right) ─── */}
                <div className="flex gap-8 relative">
                    <FacetRail
                        domains={DOMAINS}
                        selectedDomains={selectedDomains}
                        onToggleDomain={toggleDomain}
                        allTags={allTags}
                        selectedTags={selectedTags}
                        onToggleTag={toggleTag}
                        view={view}
                        onViewChange={setView}
                        onClearAll={clearAll}
                        hasActiveFilters={hasActiveFilters}
                    />

                    <div className="flex-1 min-w-0">
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
                                {[...Array(6)].map((_, i) => (
                                    <ProjectSkeleton key={i} spanCols={i === 0} />
                                ))}
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
                            <div className="project-grid flex flex-col gap-4 pb-32">
                                {filteredProjects.map((p) => (
                                    <div key={p.id} className="project-card-animated">
                                        <CardItem
                                            project={p}
                                            variant="archive"
                                            bookmarkedIds={bookmarkedIds}
                                            onQuickPeek={openPeek}
                                            onRemix={openRemix}
                                            onToggleBookmark={handleToggleBookmark}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pb-32">
                                {/* Featured slot — full-width, OUTSIDE the masonry so the
                                    horizontal split layout actually has room to breathe.
                                    Without this the featured card is trapped in a single
                                    CSS column and all corner icons cluster on top of each
                                    other (Phase-1 fix). */}
                                {sort === 'trending' && filteredProjects[0] && (
                                    <div className="project-card-animated mb-8 md:mb-10">
                                        <CardItem
                                            project={filteredProjects[0]}
                                            variant="featured"
                                            bookmarkedIds={bookmarkedIds}
                                            onQuickPeek={openPeek}
                                            onRemix={openRemix}
                                            onToggleBookmark={handleToggleBookmark}
                                        />
                                    </div>
                                )}
                                <div className="project-grid columns-1 md:columns-2 xl:columns-3 gap-6 md:gap-8">
                                    {filteredProjects
                                        .slice(sort === 'trending' && filteredProjects[0] ? 1 : 0)
                                        .map((p) => (
                                            <div
                                                key={p.id}
                                                className="project-card-animated break-inside-avoid mb-6 md:mb-8"
                                            >
                                                <CardItem
                                                    project={p}
                                                    variant="archive"
                                                    bookmarkedIds={bookmarkedIds}
                                                    onQuickPeek={openPeek}
                                                    onRemix={openRemix}
                                                    onToggleBookmark={handleToggleBookmark}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Sticky mobile propose ─── */}
                {canPropose ? (
                    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-gradient-to-t from-brutal-bg via-brutal-bg/95 to-transparent pointer-events-none">
                        <Link
                            to="/dashboard"
                            aria-label="Propose a new project"
                            className="pointer-events-auto flex items-center justify-center gap-2 w-full bg-brutal-dark text-brutal-bg font-heading font-bold uppercase tracking-widest text-sm px-6 py-4 rounded-full border-2 border-brutal-dark shadow-[0_4px_0_rgba(0,0,0,0.15)] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red active:translate-y-[1px] transition-transform"
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
            <ProjectQuickPeek project={peek} open={!!peek} onClose={closePeek} />
            <RemixModal open={!!remixProject} origin={remixProject} onClose={closeRemix} />
            <ProjectsCommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                commands={commands}
            />
        </div>
    );
}
