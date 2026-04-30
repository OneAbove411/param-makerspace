import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
    Search, X, Compass, FlaskConical, Users, ArrowRight,
    LayoutGrid, Calendar, ShoppingBag, LayoutDashboard, Library,
    Plus, Zap, Trophy, Mic, Home, Award, Settings, CheckCircle,
    Shield, Megaphone, LogIn, LogOut, UserPlus, UserCog, Key, FileText,
    Command as CommandIcon, CornerDownLeft,
} from 'lucide-react';
import { isMacPlatform } from '../lib/platform';
import { useChallenges } from '../lib/hooks/useChallenges';
import { useProjects } from '../lib/hooks/useProjects';
import { useMakers } from '../lib/hooks/useProfile';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { COMMAND_ACTIONS, findRouteContext, type CommandAction } from '../lib/commandActions';
import {
    searchActions,
    defaultActions,
    actionAllowed,
    type ScoreOptions,
} from '../lib/commandSearch';

// ─────────────────────────────────────────────────────────────
// Global command palette (Cmd/Ctrl+K).
//
// Mounted once in <RootLayout> so it works on every page.
// • Cmd/Ctrl+K  → toggle open
// • Escape      → close
// • ↑/↓         → move active result
// • Enter       → run / navigate to active result
// • Click       → run / navigate
//
// Search corpus:
//   1. ACTION REGISTRY — verb-aware actions ("Add project", "Sign out",
//      "Browse Tier 1 challenges"). Surfaced via `searchActions()` which
//      scores by label match + synonym expansion + category-intent boost
//      ("add ..." pushes create-category actions to the top).
//   2. CONTENT — challenges, projects, makers (lazy fetched the first
//      time the palette opens).
//
// Recents persist to localStorage so the empty-query view can show the
// last 3 actions you triggered, regardless of how you found them.
// ─────────────────────────────────────────────────────────────

type ResultKind = 'action' | 'blueprint' | 'project' | 'maker';

interface CommandResult {
    kind: ResultKind;
    id: string;
    title: string;
    subtitle?: string;
    /** For navigation actions/content. */
    to?: string;
    /** For runtime actions — emit this intent for the host to handle. */
    runIntent?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    /** Original action ref (only set for `kind === 'action'`). */
    action?: CommandAction;
}

// ─── Icon registry — keeps commandActions.ts dep-free ─────────────

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Plus, Zap, Trophy, Mic, Users, Home, LayoutGrid, Library, Calendar,
    ShoppingBag, Award, LayoutDashboard, Settings, CheckCircle, Shield,
    Megaphone, LogIn, LogOut, UserPlus, UserCog, Key, FileText, Compass,
    FlaskConical,
};

function iconFor(name: string) {
    return ICONS[name] || Compass;
}

// ─── Recents persistence ──────────────────────────────────────────

const RECENTS_KEY = 'cmd-palette:recents';
const RECENTS_MAX = 5;

function readRecents(): string[] {
    try {
        const raw = localStorage.getItem(RECENTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENTS_MAX);
    } catch {
        return [];
    }
}

function pushRecent(actionId: string) {
    try {
        const cur = readRecents();
        const next = [actionId, ...cur.filter((id) => id !== actionId)].slice(0, RECENTS_MAX);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {
        /* localStorage might be unavailable (private mode); it's fine. */
    }
}

// ─── Content scoring (titles only, no intent — actions own intent) ──

function contentScore(query: string, ...fields: Array<string | null | undefined>): number {
    const q = query.trim().toLowerCase();
    if (!q) return 0;
    let best = 0;
    for (const field of fields) {
        if (!field) continue;
        const f = field.toLowerCase();
        if (f === q) { best = Math.max(best, 100); continue; }
        if (f.startsWith(q)) { best = Math.max(best, 70); continue; }
        const idx = f.indexOf(q);
        if (idx >= 0) { best = Math.max(best, 50 - Math.min(idx, 40)); continue; }
    }
    return best;
}

interface CommandPaletteShellProps {
    onClose: () => void;
}

/**
 * Shell rendered ONLY while the palette is open. Mounting the data
 * hooks here means Supabase fetches don't fire until the user actually
 * opens the palette.
 */
function CommandPaletteShell({ onClose }: CommandPaletteShellProps) {
    const navigate = useNavigate();
    const { user, role, signOut } = useAuth();
    const isMac = useMemo(() => isMacPlatform(), []);
    const modKeyLabel = isMac ? '⌘K' : 'Ctrl K';
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);

    const { data: challenges } = useChallenges();
    const { data: projects } = useProjects();
    const { data: makers } = useMakers();

    // Pull the active route's "relevant action IDs" so we can boost
    // them in scoring AND surface them first in the empty-query view.
    const location = useLocation();
    const contextActionIds = useMemo(() => {
        const ctx = findRouteContext(location.pathname);
        return ctx?.actionIds ?? [];
    }, [location.pathname]);

    const scoreOpts: ScoreOptions = useMemo(
        () => ({
            isAuthenticated: !!user,
            role: (role as ScoreOptions['role']) ?? null,
            contextActionIds,
        }),
        [user, role, contextActionIds],
    );

    // Focus input on mount
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 10);
        return () => clearTimeout(t);
    }, []);

    // ── Action results (registry) ────────────────────────────
    const actionResults = useMemo<CommandResult[]>(() => {
        const q = query.trim();

        // Empty query: show recents (filtered to allowed) then defaults.
        if (!q) {
            const recentIds = readRecents();
            const recentMap = new Map(COMMAND_ACTIONS.map((a) => [a.id, a]));
            const recents: CommandAction[] = [];
            for (const id of recentIds) {
                const a = recentMap.get(id);
                if (a && actionAllowed(a, scoreOpts)) recents.push(a);
            }
            const seen = new Set(recents.map((a) => a.id));
            const defaults = defaultActions(COMMAND_ACTIONS, scoreOpts).filter(
                (a) => !seen.has(a.id),
            );
            return [...recents, ...defaults].map(actionToResult);
        }

        return searchActions(q, COMMAND_ACTIONS, scoreOpts).map((s) => actionToResult(s.action));
    }, [query, scoreOpts]);

    // ── Content results (data) ──────────────────────────────
    const contentResults = useMemo<CommandResult[]>(() => {
        const q = query.trim();
        if (!q) return [];

        const scored: Array<{ r: CommandResult; score: number }> = [];

        for (const c of (challenges || [])) {
            const score = contentScore(q, c.title, c.tier, c.domain);
            if (score > 0) {
                scored.push({
                    score,
                    r: {
                        kind: 'blueprint',
                        id: `bp-${c.id}`,
                        title: c.title || 'Untitled blueprint',
                        subtitle: [c.tier, c.domain].filter(Boolean).join(' · ') || undefined,
                        to: `/challenges/${c.id}`,
                        icon: Compass,
                    },
                });
            }
        }

        for (const pr of (projects || [])) {
            const score = contentScore(q, pr.title, pr.owner_name, pr.domain);
            if (score > 0) {
                scored.push({
                    score,
                    r: {
                        kind: 'project',
                        id: `pj-${pr.id}`,
                        title: pr.title || 'Untitled project',
                        subtitle: pr.owner_name
                            ? `by ${pr.owner_name}${pr.domain ? ' · ' + pr.domain : ''}`
                            : pr.domain || undefined,
                        to: `/projects/${pr.id}`,
                        icon: FlaskConical,
                    },
                });
            }
        }

        for (const m of (makers || [])) {
            const skillsBit = (m.skills || []).slice(0, 2).join(', ');
            const score = contentScore(q, m.display_name, skillsBit, m.userRank ?? '');
            if (score > 0) {
                scored.push({
                    score,
                    r: {
                        kind: 'maker',
                        id: `mk-${m.id}`,
                        title: m.display_name || 'Maker',
                        subtitle: [m.userRank, skillsBit].filter(Boolean).join(' · ') || undefined,
                        to: `/makers/${m.id}`,
                        icon: Users,
                    },
                });
            }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 18).map((s) => s.r);
    }, [query, challenges, projects, makers]);

    // Combined groups in display order: actions first, then content kinds.
    const grouped = useMemo(() => {
        const out: Array<{ kind: string; label: string; items: CommandResult[] }> = [];
        if (actionResults.length > 0) {
            const hasContext = contextActionIds.length > 0;
            const emptyLabel = hasContext
                ? 'Suggested for this page'
                : readRecents().length > 0
                    ? 'Recent & suggested'
                    : 'Suggested';
            out.push({
                kind: 'action',
                label: query.trim() ? 'Actions' : emptyLabel,
                items: actionResults.slice(0, 12),
            });
        }
        const blueprints = contentResults.filter((r) => r.kind === 'blueprint');
        const projectsR = contentResults.filter((r) => r.kind === 'project');
        const makersR = contentResults.filter((r) => r.kind === 'maker');
        if (blueprints.length > 0) out.push({ kind: 'blueprint', label: 'Blueprints', items: blueprints });
        if (projectsR.length > 0) out.push({ kind: 'project', label: 'Projects', items: projectsR });
        if (makersR.length > 0) out.push({ kind: 'maker', label: 'Makers', items: makersR });
        return out;
    }, [actionResults, contentResults, query, contextActionIds]);

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
        // Record recents for actions only (not content navigation).
        if (r.kind === 'action' && r.action) {
            pushRecent(r.action.id);
        }

        // Close BEFORE running so the body-scroll-lock cleanup runs
        // before any destination page mounts. Otherwise the new page
        // can mount while body.overflow is still 'hidden', leaving
        // it un-scrollable until a hard refresh.
        onClose();

        // Defer so React commits the unmount + cleanup first.
        requestAnimationFrame(() => {
            if (r.runIntent === 'signout') {
                signOut();
                navigate('/', { replace: true });
                return;
            }
            if (r.to) navigate(r.to);
        });
    }, [navigate, onClose, signOut]);

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

            {/* Card — brutalist dialog body. Tighter corners, thicker
                border, sharper red shadow. Top stripe frames the dialog. */}
            <div
                className={cn(
                    'relative w-full max-w-xl bg-brutal-bg border-2 border-brutal-dark rounded-xl overflow-hidden',
                    'shadow-[8px_8px_0_0_rgba(196,41,30,0.95)]',
                    'motion-safe:animate-[fadeIn_120ms_ease-out]',
                )}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Brutalist red top stripe */}
                <div className="h-1 bg-brutal-red" aria-hidden />

                {/* Search bar */}
                <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-brutal-dark/15">
                    <Search className="w-[18px] h-[18px] text-brutal-dark/45 flex-shrink-0" aria-hidden strokeWidth={2.25} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Try “add project”, “tier 1”, “sign out”…"
                        aria-label="Search"
                        className="flex-1 bg-transparent border-none outline-none font-data text-[15px] leading-none text-brutal-dark placeholder:text-brutal-dark/35"
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
                    <kbd className="hidden sm:inline-flex items-center justify-center px-2 py-1 rounded border border-brutal-dark/25 bg-brutal-bg font-data text-[10px] font-bold tracking-widest text-brutal-dark/55">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <ul
                    ref={listRef}
                    className="max-h-[52vh] overflow-y-auto py-2 scrollbar-thin"
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
                                    className="px-5 pt-3 pb-1.5 font-data text-[10px] font-bold uppercase tracking-[0.18em] text-brutal-dark/35"
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
                                                    'w-full flex items-center gap-3 px-5 py-2.5 text-left',
                                                    'transition-colors motion-reduce:transition-none',
                                                    'border-l-2',
                                                    active
                                                        ? 'bg-brutal-dark text-brutal-bg border-brutal-red'
                                                        : 'text-brutal-dark border-transparent hover:bg-brutal-dark/[0.04]',
                                                )}
                                            >
                                                <Icon
                                                    size={14}
                                                    className={cn(
                                                        'flex-shrink-0',
                                                        active ? 'text-brutal-red' : 'text-brutal-dark/55',
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="flex-1 min-w-0">
                                                    <span className={cn(
                                                        'block font-data font-bold text-sm truncate',
                                                        active ? 'text-brutal-bg' : 'text-brutal-dark',
                                                    )}>
                                                        {r.title}
                                                    </span>
                                                    {r.subtitle && (
                                                        <span className={cn(
                                                            'block font-data text-[10px] truncate mt-0.5',
                                                            active ? 'text-brutal-bg/55' : 'text-brutal-dark/40',
                                                        )}>
                                                            {r.subtitle}
                                                        </span>
                                                    )}
                                                </span>
                                                <ArrowRight
                                                    size={12}
                                                    className={cn(
                                                        'flex-shrink-0 transition-transform motion-reduce:transition-none',
                                                        active
                                                            ? 'text-brutal-red translate-x-0.5'
                                                            : 'text-brutal-dark/25',
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

                {/* Footer hint */}
                <div className="flex items-center justify-between px-5 py-2.5 border-t-2 border-brutal-dark/15 bg-brutal-dark/[0.02] font-data text-[10px] font-bold uppercase tracking-[0.18em] text-brutal-dark/45">
                    <span className="inline-flex items-center gap-1.5">
                        <CommandIcon className="w-3 h-3 text-brutal-red" aria-hidden />
                        <span>{modKeyLabel}</span>
                        <span className="text-brutal-dark/25">·</span>
                        <span>Universal</span>
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                            <span aria-hidden>↑↓</span>
                            <span>navigate</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CornerDownLeft className="w-3 h-3" aria-hidden />
                            <span>select</span>
                        </span>
                        <span>{flat.length} result{flat.length === 1 ? '' : 's'}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────

function actionToResult(a: CommandAction): CommandResult {
    return {
        kind: 'action',
        id: `act-${a.id}`,
        title: a.label,
        subtitle: a.description,
        to: a.to,
        runIntent: a.runIntent,
        icon: iconFor(a.icon),
        action: a,
    };
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

        // Allow other components to open the global palette without
        // having to know about its state. Pages that previously had
        // their own palettes (e.g. the dashboard's "Quick jump" button)
        // dispatch this event so we get one palette for the whole app.
        const onOpenEvent = () => setOpen(true);
        window.addEventListener('cmd-palette:open', onOpenEvent);

        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('cmd-palette:open', onOpenEvent);
        };
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
