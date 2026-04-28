import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
    Search, X, Compass, FlaskConical, Users, ArrowRight,
    LayoutGrid, Calendar, ShoppingBag, LayoutDashboard, Library,
} from 'lucide-react';
import { useChallenges } from '../lib/hooks/useChallenges';
import { useProjects } from '../lib/hooks/useProjects';
import { useMakers } from '../lib/hooks/useProfile';
import { cn } from '../lib/utils';

// ─────────────────────────────────────────────────────────────
// Global command palette (Cmd/Ctrl+K).
//
// Mounted once in <RootLayout> so it works on every page.
// • Cmd/Ctrl+K → toggle open
// • Escape    → close
// • ↑/↓       → move active result
// • Enter     → navigate to active result
// • Click     → navigate
//
// Data: lazy — hooks are only mounted (and therefore Supabase fetches
// only fire) once the palette is opened the first time. This keeps the
// global mount free at app boot.
// ─────────────────────────────────────────────────────────────

type ResultKind = 'page' | 'blueprint' | 'project' | 'maker';

interface CommandResult {
    kind: ResultKind;
    id: string;
    title: string;
    subtitle?: string;
    to: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

// Static, always-available navigation entries. Cheap to filter, no fetch.
const PAGE_RESULTS: CommandResult[] = [
    { kind: 'page', id: 'page-projects', title: 'Projects', subtitle: 'Browse projects feed', to: '/projects', icon: LayoutGrid },
    { kind: 'page', id: 'page-explorer', title: 'Explorer Hub', subtitle: 'Blueprints library', to: '/challenges', icon: Library },
    { kind: 'page', id: 'page-events', title: 'Events', subtitle: 'Workshops, jams, talks', to: '/events', icon: Calendar },
    { kind: 'page', id: 'page-makers', title: 'Makers', subtitle: 'Find people', to: '/makers', icon: Users },
    { kind: 'page', id: 'page-store', title: 'Store', subtitle: 'Inventory & gear', to: '/store', icon: ShoppingBag },
    { kind: 'page', id: 'page-dashboard', title: 'Dashboard', subtitle: 'Your space', to: '/dashboard', icon: LayoutDashboard },
];

function matchScore(query: string, ...fields: Array<string | null | undefined>): number {
    const q = query.trim().toLowerCase();
    if (!q) return 1; // empty query — everything matches lightly
    let best = 0;
    for (const field of fields) {
        if (!field) continue;
        const f = field.toLowerCase();
        if (f === q) { best = Math.max(best, 100); continue; }
        if (f.startsWith(q)) { best = Math.max(best, 80); continue; }
        const idx = f.indexOf(q);
        if (idx >= 0) { best = Math.max(best, 60 - Math.min(idx, 40)); continue; }
    }
    return best;
}

interface CommandPaletteShellProps {
    onClose: () => void;
}

/**
 * Shell rendered ONLY while the palette is open. Mounting the data hooks
 * here means Supabase fetches don't fire until the user actually opens
 * the palette.
 */
function CommandPaletteShell({ onClose }: CommandPaletteShellProps) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);

    const { data: challenges } = useChallenges();
    const { data: projects } = useProjects();
    const { data: makers } = useMakers();

    // Focus input on mount
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 10);
        return () => clearTimeout(t);
    }, []);

    // Build full searchable corpus once data lands.
    const allResults = useMemo<CommandResult[]>(() => {
        const out: CommandResult[] = [];

        for (const p of PAGE_RESULTS) out.push(p);

        for (const c of (challenges || [])) {
            out.push({
                kind: 'blueprint',
                id: `bp-${c.id}`,
                title: c.title || 'Untitled blueprint',
                subtitle: [c.tier, c.domain].filter(Boolean).join(' · ') || undefined,
                to: `/challenges/${c.id}`,
                icon: Compass,
            });
        }

        for (const pr of (projects || [])) {
            out.push({
                kind: 'project',
                id: `pj-${pr.id}`,
                title: pr.title || 'Untitled project',
                subtitle: pr.owner_name ? `by ${pr.owner_name}${pr.domain ? ' · ' + pr.domain : ''}` : pr.domain || undefined,
                to: `/projects/${pr.id}`,
                icon: FlaskConical,
            });
        }

        for (const m of (makers || [])) {
            const skillsBit = (m.skills || []).slice(0, 2).join(', ');
            out.push({
                kind: 'maker',
                id: `mk-${m.id}`,
                title: m.display_name || 'Maker',
                subtitle: [m.userRank, skillsBit].filter(Boolean).join(' · ') || undefined,
                to: `/makers/${m.id}`,
                icon: Users,
            });
        }

        return out;
    }, [challenges, projects, makers]);

    // Score + filter + group.
    const grouped = useMemo(() => {
        const q = query.trim();
        const scored = allResults
            .map((r) => ({
                r,
                score: matchScore(q, r.title, r.subtitle),
            }))
            .filter((x) => x.score > 0);

        // When query is empty, only show pages + a few of each kind so the panel doesn't dump 500 rows.
        if (!q) {
            const limited: typeof scored = [];
            const counts: Record<ResultKind, number> = { page: 0, blueprint: 0, project: 0, maker: 0 };
            const caps: Record<ResultKind, number> = { page: 6, blueprint: 5, project: 5, maker: 5 };
            for (const x of scored) {
                if (counts[x.r.kind] < caps[x.r.kind]) {
                    limited.push(x);
                    counts[x.r.kind]++;
                }
            }
            return groupByKind(limited.map((x) => x.r));
        }

        scored.sort((a, b) => b.score - a.score);
        return groupByKind(scored.slice(0, 24).map((x) => x.r));
    }, [allResults, query]);

    // Flat list mirroring render order — for arrow-key navigation.
    const flat = useMemo(() => {
        const out: CommandResult[] = [];
        for (const g of grouped) for (const r of g.items) out.push(r);
        return out;
    }, [grouped]);

    // Reset active index whenever the result set changes.
    useEffect(() => {
        setActiveIdx(0);
    }, [flat.length, query]);

    // Keep active item visible.
    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const el = list.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
        el?.scrollIntoView({ block: 'nearest' });
    }, [activeIdx]);

    const commit = useCallback((r: CommandResult) => {
        // Close BEFORE navigating so the body-scroll-lock cleanup runs
        // before the destination page mounts. Otherwise the new page can
        // mount while body.overflow is still 'hidden', leaving the page
        // un-scrollable until a hard refresh.
        onClose();
        // Defer navigation a tick so React commits the unmount + cleanup first.
        requestAnimationFrame(() => navigate(r.to));
    }, [navigate, onClose]);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = flat[activeIdx];
            if (target) commit(target);
        }
    }, [flat, activeIdx, commit]);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4"
            onMouseDown={(e) => {
                // Click on backdrop closes; clicks inside the card don't bubble here.
                if (e.target === e.currentTarget) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Universal search"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-brutal-dark/70 backdrop-blur-sm" aria-hidden />

            {/* Card */}
            <div
                className={cn(
                    'relative w-full max-w-xl',
                    'rounded-2xl border-2 border-brutal-dark bg-brutal-bg',
                    'shadow-[8px_8px_0_0_rgba(196,41,30,0.55)]',
                    'overflow-hidden',
                )}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Search row */}
                <div className="flex items-center gap-3 px-4 h-14 border-b border-brutal-dark/10">
                    <Search size={16} className="text-brutal-dark/50 flex-shrink-0" aria-hidden />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search blueprints, projects, makers, pages…"
                        aria-label="Search"
                        className={cn(
                            'flex-1 min-w-0 bg-transparent border-0',
                            'font-data text-[13px] text-brutal-dark placeholder:text-brutal-dark/35',
                            'focus:outline-none',
                        )}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Clear search"
                            className="p-1 rounded-md text-brutal-dark/40 hover:text-brutal-red hover:bg-brutal-dark/5"
                        >
                            <X size={13} />
                        </button>
                    )}
                    <kbd className="font-data text-[9px] font-bold text-brutal-dark/40 bg-brutal-dark/5 border border-brutal-dark/10 rounded px-1.5 py-0.5 leading-none">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <ul
                    ref={listRef}
                    className="max-h-[55vh] overflow-y-auto py-2"
                    role="listbox"
                    aria-label="Search results"
                >
                    {flat.length === 0 ? (
                        <li className="px-4 py-12 text-center font-data text-[11px] text-brutal-dark/45">
                            {query ? 'No matches.' : 'Start typing to search.'}
                        </li>
                    ) : (
                        grouped.map((group) => (
                            <React.Fragment key={group.kind}>
                                <li
                                    className="px-4 pt-3 pb-1 font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40"
                                    aria-hidden
                                >
                                    {group.label}
                                </li>
                                {group.items.map((r) => {
                                    const idx = flat.indexOf(r);
                                    const active = idx === activeIdx;
                                    const Icon = r.icon;
                                    return (
                                        <li key={r.id} role="option" aria-selected={active} data-idx={idx}>
                                            <button
                                                type="button"
                                                onMouseEnter={() => setActiveIdx(idx)}
                                                onClick={() => commit(r)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                                                    'transition-colors duration-100',
                                                    active ? 'bg-brutal-red text-brutal-bg' : 'text-brutal-dark hover:bg-brutal-dark/5',
                                                )}
                                            >
                                                <Icon
                                                    size={14}
                                                    className={cn(
                                                        'flex-shrink-0',
                                                        active ? 'text-brutal-bg' : 'text-brutal-dark/55',
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="flex-1 min-w-0">
                                                    <span className={cn(
                                                        'block font-heading font-bold text-[13px] truncate',
                                                        active ? 'text-brutal-bg' : 'text-brutal-dark',
                                                    )}>
                                                        {r.title}
                                                    </span>
                                                    {r.subtitle && (
                                                        <span className={cn(
                                                            'block font-data text-[10px] truncate mt-0.5',
                                                            active ? 'text-brutal-bg/75' : 'text-brutal-dark/45',
                                                        )}>
                                                            {r.subtitle}
                                                        </span>
                                                    )}
                                                </span>
                                                <ArrowRight
                                                    size={12}
                                                    className={cn(
                                                        'flex-shrink-0',
                                                        active ? 'text-brutal-bg' : 'text-brutal-dark/25',
                                                    )}
                                                    aria-hidden
                                                />
                                            </button>
                                        </li>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    )}
                </ul>

                {/* Footer hints */}
                <div className="flex items-center justify-between gap-3 px-4 h-9 border-t border-brutal-dark/10 bg-brutal-dark/[0.02] font-data text-[9px] uppercase tracking-widest text-brutal-dark/40">
                    <span className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                            <kbd className="bg-brutal-dark/5 border border-brutal-dark/10 rounded px-1 py-0.5 leading-none">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <kbd className="bg-brutal-dark/5 border border-brutal-dark/10 rounded px-1 py-0.5 leading-none">↵</kbd>
                            Open
                        </span>
                    </span>
                    <span>{flat.length} result{flat.length === 1 ? '' : 's'}</span>
                </div>
            </div>
        </div>
    );
}

const KIND_LABELS: Record<ResultKind, string> = {
    page: 'Pages',
    blueprint: 'Blueprints',
    project: 'Projects',
    maker: 'Makers',
};

const KIND_ORDER: ResultKind[] = ['page', 'blueprint', 'project', 'maker'];

function groupByKind(rs: CommandResult[]): Array<{ kind: ResultKind; label: string; items: CommandResult[] }> {
    const buckets: Record<ResultKind, CommandResult[]> = {
        page: [], blueprint: [], project: [], maker: [],
    };
    for (const r of rs) buckets[r.kind].push(r);
    return KIND_ORDER
        .filter((k) => buckets[k].length > 0)
        .map((k) => ({ kind: k, label: KIND_LABELS[k], items: buckets[k] }));
}

// ─────────────────────────────────────────────────────────────
// Public component — listens for Cmd/Ctrl+K and toggles the shell.
// ─────────────────────────────────────────────────────────────

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const location = useLocation();

    // Toggle on Cmd/Ctrl+K, close on Escape.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isToggle = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
            if (isToggle) {
                e.preventDefault();
                setOpen((o) => !o);
                return;
            }
            if (e.key === 'Escape') {
                setOpen((o) => (o ? false : o));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Close on route change (defensive — clicking a result already navigates + closes).
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    // Lock body scroll while open. Always restore to '' on cleanup —
    // capturing the previous value can wedge the page if some other
    // code left body.overflow in an unexpected state.
    useEffect(() => {
        if (!open) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;
    return <CommandPaletteShell onClose={() => setOpen(false)} />;
}

