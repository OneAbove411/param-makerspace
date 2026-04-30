/**
 * commandSearch.ts — fuzzy + intent-aware scorer for the command palette.
 *
 * The palette doesn't try to be a full search engine. It needs to be
 * responsive to natural-language queries like "add a new project" or
 * "find tier 1 challenges" without forcing the user to remember exact
 * labels. Three layers do that work:
 *
 *   1. Tokenize and expand synonyms. The query "create new event" gets
 *      expanded so it also matches actions whose keywords say "add".
 *
 *   2. Score each candidate by a blend of:
 *        - exact label match  (huge weight)
 *        - prefix match       (label/keyword starts with a query token)
 *        - substring match    (label/keyword contains a query token)
 *        - bigram overlap     (catches typos: "challange" ≈ "challenge")
 *        - keyword count      (shared tokens stack up)
 *
 *   3. Boost by category when the query carries an "intent" verb. If
 *      the user types "add ..." we push `category: 'create'` actions
 *      to the top regardless of label match strength.
 */

import type { CommandAction, ActionCategory, Role } from './commandActions';
import { SYNONYMS } from './commandActions';

// ─── Tokenization ──────────────────────────────────────────────────

function tokenize(s: string): string[] {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9 ]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

/** Expand a query token through the synonym map. */
function expandToken(token: string): string[] {
    const out = new Set<string>([token]);
    const syns = SYNONYMS[token];
    if (syns) for (const s of syns) out.add(s);
    return [...out];
}

// ─── Bigram overlap (typo-tolerant) ────────────────────────────────

function bigrams(s: string): Set<string> {
    const out = new Set<string>();
    if (s.length < 2) {
        if (s.length === 1) out.add(s);
        return out;
    }
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
    return out;
}

function bigramOverlap(a: string, b: string): number {
    const ba = bigrams(a);
    const bb = bigrams(b);
    if (ba.size === 0 || bb.size === 0) return 0;
    let shared = 0;
    for (const g of ba) if (bb.has(g)) shared++;
    return shared / Math.max(ba.size, bb.size);
}

// ─── Intent detection ──────────────────────────────────────────────

const CREATE_VERBS = new Set([
    'add', 'create', 'new', 'make', 'post', 'submit', 'publish', 'start', 'propose', 'register',
]);
const NAVIGATE_VERBS = new Set([
    'go', 'goto', 'open', 'show', 'view', 'navigate',
]);
const FIND_VERBS = new Set([
    'find', 'search', 'browse', 'list', 'see', 'discover',
]);

interface Intent {
    boostCategory: ActionCategory | null;
}

function detectIntent(tokens: string[]): Intent {
    for (const t of tokens) {
        if (CREATE_VERBS.has(t)) return { boostCategory: 'create' };
        if (NAVIGATE_VERBS.has(t)) return { boostCategory: 'navigate' };
        if (FIND_VERBS.has(t)) return { boostCategory: 'discover' };
    }
    return { boostCategory: null };
}

// ─── Per-action scoring ────────────────────────────────────────────

interface ScoreInput {
    queryTokens: string[];
    queryRaw: string;
    intent: Intent;
    contextActionIds?: string[];
}

export function scoreAction(action: CommandAction, input: ScoreInput): number {
    const { queryTokens, queryRaw, intent } = input;
    if (queryTokens.length === 0) return 0;

    const labelLower = action.label.toLowerCase();
    const labelTokens = tokenize(action.label);
    const keywordsLower = action.keywords.map((k) => k.toLowerCase());
    const descLower = (action.description || '').toLowerCase();

    let score = 0;

    // Exact label match — dominant signal.
    if (labelLower === queryRaw) score += 1000;

    // Whole label includes query phrase.
    if (queryRaw.length >= 2 && labelLower.includes(queryRaw)) score += 200;

    // Per-token loop. Each query token (and its synonyms) gets matched
    // against label tokens and keyword list.
    for (const rawToken of queryTokens) {
        if (rawToken.length === 0) continue;
        const expansions = expandToken(rawToken);

        let tokenBest = 0;

        for (const tok of expansions) {
            // Label token-level
            for (const lt of labelTokens) {
                if (lt === tok) tokenBest = Math.max(tokenBest, 100);
                else if (lt.startsWith(tok)) tokenBest = Math.max(tokenBest, 70);
                else if (tok.length >= 3 && lt.includes(tok)) tokenBest = Math.max(tokenBest, 40);
            }

            // Keyword-level
            for (const kw of keywordsLower) {
                if (kw === tok) tokenBest = Math.max(tokenBest, 80);
                else if (kw.startsWith(tok)) tokenBest = Math.max(tokenBest, 55);
                else if (tok.length >= 3 && kw.includes(tok)) tokenBest = Math.max(tokenBest, 30);
            }

            // Description fallback (lower weight).
            if (tok.length >= 3 && descLower.includes(tok)) {
                tokenBest = Math.max(tokenBest, 15);
            }

            // Typo tolerance — bigram overlap on label / keywords.
            // Only do this for tokens of length >= 4 to avoid false matches.
            if (tok.length >= 4 && tokenBest < 50) {
                const lbBigram = bigramOverlap(tok, labelLower);
                if (lbBigram > 0.5) tokenBest = Math.max(tokenBest, Math.round(lbBigram * 60));
                for (const kw of keywordsLower) {
                    if (kw.length < 4) continue;
                    const kbBigram = bigramOverlap(tok, kw);
                    if (kbBigram > 0.5) {
                        tokenBest = Math.max(tokenBest, Math.round(kbBigram * 50));
                    }
                }
            }
        }

        if (tokenBest === 0) {
            // A required token didn't match anything — penalize heavily so
            // we don't pollute the result list with weak hits.
            return 0;
        }
        score += tokenBest;
    }

    // Intent boost — push the matching category to the top of its tier.
    if (intent.boostCategory && action.category === intent.boostCategory) {
        score += 75;
    }

    // Route-context boost — actions the current route considers
    // relevant get bumped so they win ties against equally-fuzzy
    // matches from elsewhere. The earlier in the list, the bigger
    // the boost, so the page's "primary" action surfaces first.
    if (input.contextActionIds && input.contextActionIds.length > 0) {
        const idx = input.contextActionIds.indexOf(action.id);
        if (idx >= 0) {
            // 60 for the first slot, decaying ~10 per rank, floor 20.
            score += Math.max(20, 60 - idx * 10);
        }
    }

    return score;
}

// ─── Top-level entrypoint ──────────────────────────────────────────

export interface ScoreOptions {
    isAuthenticated: boolean;
    role: Role | null;
    /**
     * Action IDs the current route considers "relevant" (most relevant
     * first). Boosted in search ranking and surfaced first in default
     * (empty-query) view. Pass [] when no route context applies.
     */
    contextActionIds?: string[];
}

export interface ScoredAction {
    action: CommandAction;
    score: number;
}

/**
 * Score and sort actions for a query. Filters out actions the current
 * viewer isn't allowed to see based on auth + role.
 */
export function searchActions(
    query: string,
    actions: CommandAction[],
    opts: ScoreOptions,
): ScoredAction[] {
    const visible = actions.filter((a) => actionAllowed(a, opts));
    const queryRaw = query.trim().toLowerCase();
    const queryTokens = tokenize(queryRaw);
    const intent = detectIntent(queryTokens);

    if (queryTokens.length === 0) return [];

    const scored: ScoredAction[] = [];
    for (const action of visible) {
        const score = scoreAction(action, {
            queryTokens,
            queryRaw,
            intent,
            contextActionIds: opts.contextActionIds,
        });
        if (score > 0) scored.push({ action, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

export function actionAllowed(action: CommandAction, opts: ScoreOptions): boolean {
    if (action.requiresAuth && !opts.isAuthenticated) return false;
    if (action.requiresRole && action.requiresRole.length > 0) {
        if (!opts.role) return false;
        if (!action.requiresRole.includes(opts.role)) return false;
    }
    return true;
}

/**
 * Default actions to surface when the query is empty.
 *
 * Two distinct modes:
 *
 *   1. Route context exists (the common case — most app routes are
 *      mapped). Show ONLY the page's flow — every action listed in
 *      ROUTE_CONTEXTS for this route, in the declared order. No
 *      generic backfill. The user is on a page; we trust the page's
 *      own list and don't muddy it with cross-flow shortcuts. Account
 *      actions (sign in / out / profile) are quietly appended as a
 *      footer because those are valid from anywhere.
 *
 *   2. No route context (unmapped route, or a future page that hasn't
 *      been registered yet). Fall back to a sensible cross-section
 *      mix so the palette is still useful. `create` is excluded from
 *      this fallback for the same reason — the user can still reach
 *      any create action by typing.
 *
 * Either way, full search results (typed query) are unaffected: the
 * scorer ignores this function entirely and returns every matching
 * action across every category.
 */
export function defaultActions(actions: CommandAction[], opts: ScoreOptions): CommandAction[] {
    const visible = actions.filter((a) => actionAllowed(a, opts));
    const byId = new Map(visible.map((a) => [a.id, a]));

    const contextIds = opts.contextActionIds || [];

    // ── Mode 1: route has a context — show ONLY its actions ──
    if (contextIds.length > 0) {
        const out: CommandAction[] = [];
        const seen = new Set<string>();
        for (const id of contextIds) {
            const a = byId.get(id);
            if (a && !seen.has(a.id)) {
                out.push(a);
                seen.add(a.id);
            }
        }

        // Append a tiny tail of universally-useful account actions.
        // These don't pollute the page flow (they sit visually after
        // the page's items, in their own group via category) and
        // they're capability-gated, so signed-out users see different
        // entries from signed-in.
        const tail: string[] = opts.isAuthenticated
            ? ['account-profile-setup', 'account-signout']
            : ['account-login', 'account-register'];
        for (const id of tail) {
            const a = byId.get(id);
            if (a && !seen.has(a.id)) {
                out.push(a);
                seen.add(a.id);
            }
        }
        return out;
    }

    // ── Mode 2: no context — generic cross-section fallback ──
    const order: ActionCategory[] = ['navigate', 'discover', 'manage', 'account'];
    const buckets: Record<ActionCategory, CommandAction[]> = {
        create: [], navigate: [], manage: [], account: [], discover: [],
    };
    for (const a of visible) buckets[a.category].push(a);
    const caps: Record<ActionCategory, number> = {
        navigate: 6, discover: 3, manage: 3, account: 2,
        create: 0,
    };
    const out: CommandAction[] = [];
    for (const cat of order) {
        out.push(...buckets[cat].slice(0, caps[cat]));
    }
    return out;
}
