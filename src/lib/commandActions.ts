/**
 * commandActions.ts — registry of every "command" the global Cmd/Ctrl+K
 * palette can run.
 *
 * An action is any user-facing capability that we want surfaced through
 * universal search: navigating to a route, opening a modal, signing out,
 * jumping to a deep-linked tab, etc. The registry is plain data so it
 * can be filtered, scored, and re-rendered without coupling to React.
 *
 * Authoring rules:
 *   • Keep `label` short and verb-first when it's an action ("Add
 *     project", not "New project page"). Search ranks verbs higher.
 *   • `keywords` are the alternative phrasings users might type.
 *   • `description` shows under the label in the palette — keep it short.
 *   • `category` groups results in the dropdown.
 *   • `requiresAuth` / `requiresRole` gate visibility. Omit for everyone.
 *   • `to` for navigation. For runtime actions (sign out, open modal),
 *     leave `to` undefined and set `runIntent` instead.
 */

export type ActionCategory =
    | 'create'
    | 'navigate'
    | 'manage'
    | 'account'
    | 'discover';

export type Role = 'viewer' | 'maker' | 'mentor' | 'admin';

export interface CommandAction {
    id: string;
    label: string;
    description?: string;
    keywords: string[];
    category: ActionCategory;
    /** Lucide icon name — the palette imports the icon by name. */
    icon: string;
    /** If set, navigate to this route. */
    to?: string;
    /** If set, dispatch this `cmd:<intent>` event for the host to handle. */
    runIntent?: string;
    requiresAuth?: boolean;
    requiresRole?: Role[];
}

// ─── Synonym map used by commandSearch.ts ──────────────────────────
export const SYNONYMS: Record<string, string[]> = {
    // Create-ish verbs
    add: ['create', 'new', 'make', 'post', 'submit', 'publish', 'start', 'open', 'register'],
    create: ['add', 'new', 'make', 'post', 'submit', 'publish', 'start'],
    new: ['add', 'create', 'make', 'fresh'],
    make: ['add', 'create', 'new', 'build'],
    post: ['add', 'create', 'submit', 'publish'],

    // Navigation verbs
    go: ['open', 'show', 'view', 'navigate'],
    open: ['go', 'show', 'view'],
    show: ['go', 'open', 'view'],
    view: ['go', 'open', 'show'],

    // Domain words
    challenge: ['blueprint', 'tutorial', 'guide'],
    blueprint: ['challenge', 'tutorial', 'guide'],
    project: ['build', 'make'],
    build: ['project', 'make', 'create'],
    talk: ['speaker', 'pitch', 'speak'],
    speaker: ['talk', 'pitch', 'speak'],
    meetup: ['gathering', 'event'],
    event: ['workshop', 'meetup', 'jam'],

    // Account verbs
    login: ['signin', 'sign in', 'log in'],
    logout: ['signout', 'sign out', 'log out'],
    profile: ['account', 'settings', 'me'],
};

// ─── Registry ──────────────────────────────────────────────────────

export const COMMAND_ACTIONS: CommandAction[] = [
    // ── Create ────────────────────────────────────────────────
    {
        id: 'add-project',
        label: 'Add project',
        description: 'Propose a new project from the dashboard.',
        keywords: ['add', 'create', 'new', 'project', 'propose', 'post', 'make', 'start', 'submit', 'build'],
        category: 'create',
        icon: 'Plus',
        to: '/dashboard?mode=quick',
        requiresAuth: true,
    },
    {
        id: 'add-challenge',
        label: 'Add challenge',
        description: 'Create a new blueprint for the Explorer Hub.',
        keywords: ['add', 'create', 'new', 'challenge', 'blueprint', 'post', 'submit', 'publish'],
        category: 'create',
        icon: 'Zap',
        to: '/admin/challenges/new',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'add-event-build-challenge',
        label: 'Add build challenge event',
        description: 'Create a hardware sprint event with team submissions.',
        keywords: ['add', 'create', 'new', 'event', 'build', 'challenge', 'hackathon', 'competition'],
        category: 'create',
        icon: 'Trophy',
        to: '/admin/events/new/build-challenge',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'add-event-maker-meetup',
        label: 'Add maker meetup',
        description: 'Create a curated meetup with applications.',
        keywords: ['add', 'create', 'new', 'event', 'meetup', 'maker', 'gathering', 'social'],
        category: 'create',
        icon: 'Users',
        to: '/admin/events/new/maker-meetup',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'add-event-tech-tuesday',
        label: 'Add tech tuesday event',
        description: 'Schedule a weekly talk night.',
        keywords: ['add', 'create', 'new', 'event', 'tech', 'tuesday', 'talk', 'speaker', 'rsvp'],
        category: 'create',
        icon: 'Mic',
        to: '/admin/events/new/tech-tuesday',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'pitch-speaker',
        label: 'Pitch a talk',
        description: 'Submit a Tech Tuesday speaker pitch.',
        keywords: ['add', 'create', 'pitch', 'talk', 'speaker', 'submit', 'propose', 'topic', 'speak'],
        category: 'create',
        icon: 'Mic',
        to: '/speak',
        requiresAuth: true,
    },

    // ── Navigate ──────────────────────────────────────────────
    {
        id: 'goto-home',
        label: 'Home',
        description: 'Return to the landing page.',
        keywords: ['home', 'landing', 'start', 'main'],
        category: 'navigate',
        icon: 'Home',
        to: '/',
    },
    {
        id: 'goto-projects',
        label: 'Projects',
        description: 'Browse the project archive.',
        keywords: ['projects', 'browse', 'feed', 'archive', 'gallery', 'remix', 'builds'],
        category: 'navigate',
        icon: 'LayoutGrid',
        to: '/projects',
    },
    {
        id: 'goto-challenges',
        label: 'Explorer Hub',
        description: 'Browse the blueprint library.',
        keywords: ['challenges', 'blueprints', 'explorer', 'hub', 'library', 'browse', 'tutorials'],
        category: 'navigate',
        icon: 'Library',
        to: '/challenges',
    },
    {
        id: 'goto-events',
        label: 'Events',
        description: 'See upcoming workshops and meetups.',
        keywords: ['events', 'workshops', 'meetups', 'jams', 'talks', 'calendar', 'upcoming'],
        category: 'navigate',
        icon: 'Calendar',
        to: '/events',
    },
    {
        id: 'goto-makers',
        label: 'Makers',
        description: 'Browse the maker community.',
        keywords: ['makers', 'people', 'community', 'members', 'profiles', 'find'],
        category: 'navigate',
        icon: 'Users',
        to: '/makers',
    },
    {
        id: 'goto-store',
        label: 'Store',
        description: 'Browse inventory and gear.',
        keywords: ['store', 'shop', 'inventory', 'gear', 'parts', 'components', 'buy'],
        category: 'navigate',
        icon: 'ShoppingBag',
        to: '/store',
    },
    {
        id: 'goto-badges',
        label: 'Badges',
        description: 'See all available achievements.',
        keywords: ['badges', 'achievements', 'awards', 'rewards', 'progression'],
        category: 'navigate',
        icon: 'Award',
        to: '/badges',
    },
    {
        id: 'goto-dashboard',
        label: 'Dashboard',
        description: 'Open your personal dashboard.',
        keywords: ['dashboard', 'home', 'workspace', 'cockpit', 'profile', 'me', 'my'],
        category: 'navigate',
        icon: 'LayoutDashboard',
        to: '/dashboard',
        requiresAuth: true,
    },

    // ── Dashboard tab jumps ───────────────────────────────────
    // Routes to /dashboard?tab=<id>; the dashboard listens for that
    // query param and switches the active tab.
    {
        id: 'dashboard-tab-overview',
        label: 'Dashboard: Overview',
        description: 'Jump to the dashboard overview tab.',
        keywords: ['dashboard', 'overview', 'home', 'main'],
        category: 'navigate',
        icon: 'LayoutDashboard',
        to: '/dashboard?tab=overview',
        requiresAuth: true,
    },
    {
        id: 'dashboard-tab-mywork',
        label: 'Dashboard: My Work',
        description: 'Jump to the My Work tab — projects, attention items.',
        keywords: ['dashboard', 'my work', 'projects', 'attention', 'mine'],
        category: 'navigate',
        icon: 'LayoutDashboard',
        to: '/dashboard?tab=my-work',
        requiresAuth: true,
    },
    {
        id: 'dashboard-tab-badges',
        label: 'Dashboard: My Badges',
        description: 'Jump to your earned badges and progression.',
        keywords: ['dashboard', 'badges', 'achievements', 'mine'],
        category: 'navigate',
        icon: 'Award',
        to: '/dashboard?tab=badges',
        requiresAuth: true,
    },
    {
        id: 'dashboard-tab-mentor',
        label: 'Dashboard: Mentor Queue',
        description: 'Jump to the mentor review queue.',
        keywords: ['dashboard', 'mentor', 'queue', 'review'],
        category: 'navigate',
        icon: 'Shield',
        to: '/dashboard?tab=mentor',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'dashboard-tab-admin',
        label: 'Dashboard: System Control',
        description: 'Jump to the admin panel.',
        keywords: ['dashboard', 'admin', 'system', 'control', 'panel'],
        category: 'navigate',
        icon: 'Settings',
        to: '/dashboard?tab=admin',
        requiresRole: ['admin'],
    },
    {
        id: 'mentor-dashboard',
        label: 'Mentor dashboard',
        description: 'Mentor tools and review queue.',
        keywords: ['mentor', 'dashboard', 'tools', 'queue'],
        category: 'navigate',
        icon: 'Shield',
        to: '/mentor-dashboard',
        requiresRole: ['mentor', 'admin'],
    },

    // ── Discover (filtered views) ─────────────────────────────
    {
        id: 'discover-tier-1',
        label: 'Browse Tier 1 challenges',
        description: 'Beginner-friendly blueprints to get started.',
        keywords: ['tier 1', 'beginner', 'easy', 'starter', 'first', 'intro', 'novice'],
        category: 'discover',
        icon: 'Zap',
        to: '/challenges?tier=Tier+1',
    },
    {
        id: 'discover-tier-2',
        label: 'Browse Tier 2 challenges',
        description: 'Intermediate blueprints — solver tier.',
        keywords: ['tier 2', 'intermediate', 'medium', 'solver'],
        category: 'discover',
        icon: 'Zap',
        to: '/challenges?tier=Tier+2',
    },
    {
        id: 'discover-tier-3',
        label: 'Browse Tier 3 challenges',
        description: 'Advanced blueprints — architect tier.',
        keywords: ['tier 3', 'advanced', 'hard', 'expert', 'architect'],
        category: 'discover',
        icon: 'Zap',
        to: '/challenges?tier=Tier+3',
    },
    {
        id: 'discover-build-challenges',
        label: 'Build challenges',
        description: 'Hardware sprint competitions.',
        keywords: ['build', 'challenges', 'hackathon', 'competition', 'sprint'],
        category: 'discover',
        icon: 'Trophy',
        to: '/events/build-challenges',
    },
    {
        id: 'discover-tech-tuesdays',
        label: 'Tech Tuesdays',
        description: 'Weekly knowledge drop talks.',
        keywords: ['tech', 'tuesday', 'tuesdays', 'talks', 'speakers', 'weekly'],
        category: 'discover',
        icon: 'Mic',
        to: '/events/tech-tuesdays',
    },
    {
        id: 'discover-maker-meetups',
        label: 'Maker meetups',
        description: 'Application-only community meetups.',
        keywords: ['maker', 'meetups', 'meetup', 'gathering', 'social'],
        category: 'discover',
        icon: 'Users',
        to: '/events/meetups',
    },
    {
        id: 'discover-upcoming-events',
        label: 'Upcoming events',
        description: 'Just the events that haven’t happened yet.',
        keywords: ['events', 'upcoming', 'soon', 'next', 'this week'],
        category: 'discover',
        icon: 'Calendar',
        to: '/events?when=upcoming',
    },

    // ── Manage (mentor/admin) ────────────────────────────────
    {
        id: 'manage-events',
        label: 'Manage events',
        description: 'Open the events admin console.',
        keywords: ['manage', 'admin', 'events', 'console', 'edit'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/events',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-challenges',
        label: 'Manage challenges',
        description: 'Admin blueprint management.',
        keywords: ['manage', 'admin', 'challenges', 'blueprints', 'edit'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/challenges',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-projects',
        label: 'Manage projects',
        description: 'Admin project review and management.',
        keywords: ['manage', 'admin', 'projects', 'review'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/projects',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-series',
        label: 'Manage event series',
        description: 'Recurring Tech Tuesday templates.',
        keywords: ['manage', 'admin', 'series', 'recurring', 'tech', 'tuesday'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/series',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-speakers',
        label: 'Manage speaker pitches',
        description: 'Review Tech Tuesday talk pitches.',
        keywords: ['manage', 'admin', 'speakers', 'pitches', 'talks', 'review'],
        category: 'manage',
        icon: 'Mic',
        to: '/admin/speakers',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-inventory',
        label: 'Manage lab inventory',
        description: 'Track lab parts and consumables.',
        keywords: ['manage', 'admin', 'inventory', 'parts', 'lab', 'stock'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/inventory',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'review-projects',
        label: 'Review project submissions',
        description: 'Approve or reject pending projects.',
        keywords: ['review', 'approve', 'reject', 'projects', 'pending', 'submissions', 'queue'],
        category: 'manage',
        icon: 'CheckCircle',
        to: '/admin/review-projects',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'review-challenges',
        label: 'Review challenge submissions',
        description: 'Approve or reject pending challenge submissions.',
        keywords: ['review', 'approve', 'challenges', 'pending', 'submissions', 'queue'],
        category: 'manage',
        icon: 'CheckCircle',
        to: '/admin/review-challenges',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'review-event-submissions',
        label: 'Review event submissions',
        description: 'Approve or reject build challenge submissions.',
        keywords: ['review', 'approve', 'event', 'submissions', 'pending', 'queue', 'build'],
        category: 'manage',
        icon: 'CheckCircle',
        to: '/admin/review-submissions',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'review-website-submissions',
        label: 'Review website submissions',
        description: 'Approve or reject project website uploads.',
        keywords: ['review', 'approve', 'website', 'submissions', 'pending', 'queue'],
        category: 'manage',
        icon: 'CheckCircle',
        to: '/admin/review-websites',
        requiresRole: ['mentor', 'admin'],
    },
    {
        id: 'manage-users',
        label: 'Manage users',
        description: 'Admin user management.',
        keywords: ['manage', 'admin', 'users', 'people', 'roles'],
        category: 'manage',
        icon: 'Users',
        to: '/admin/users',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-mentors',
        label: 'Manage mentors',
        description: 'Promote, demote, and manage mentor accounts.',
        keywords: ['manage', 'admin', 'mentors', 'staff', 'promote'],
        category: 'manage',
        icon: 'Shield',
        to: '/admin/mentors',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-badges',
        label: 'Manage badges',
        description: 'Admin badge configuration.',
        keywords: ['manage', 'admin', 'badges', 'achievements'],
        category: 'manage',
        icon: 'Award',
        to: '/admin/badges',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-store',
        label: 'Manage store',
        description: 'Admin inventory and store items.',
        keywords: ['manage', 'admin', 'store', 'inventory'],
        category: 'manage',
        icon: 'ShoppingBag',
        to: '/admin/store',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-equipment',
        label: 'Manage equipment',
        description: 'Lab tools and machine catalog.',
        keywords: ['manage', 'admin', 'equipment', 'tools', 'machines', 'catalog'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/equipment',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-tags',
        label: 'Manage tags',
        description: 'Admin tag taxonomy.',
        keywords: ['manage', 'admin', 'tags', 'taxonomy', 'categories'],
        category: 'manage',
        icon: 'Settings',
        to: '/admin/tags',
        requiresRole: ['admin'],
    },
    {
        id: 'manage-announcements',
        label: 'Manage announcements',
        description: 'Admin homepage announcements.',
        keywords: ['manage', 'admin', 'announcements', 'banner', 'news'],
        category: 'manage',
        icon: 'Megaphone',
        to: '/admin/announcements',
        requiresRole: ['admin'],
    },

    // ── Account ──────────────────────────────────────────────
    {
        id: 'account-login',
        label: 'Sign in',
        description: 'Log in to your account.',
        keywords: ['sign in', 'log in', 'login', 'signin'],
        category: 'account',
        icon: 'LogIn',
        to: '/login',
    },
    {
        id: 'account-register',
        label: 'Create account',
        description: 'Sign up for a new account.',
        keywords: ['register', 'sign up', 'signup', 'create account', 'join'],
        category: 'account',
        icon: 'UserPlus',
        to: '/register',
    },
    {
        id: 'account-signout',
        label: 'Sign out',
        description: 'Log out of your account.',
        keywords: ['sign out', 'log out', 'logout', 'signout', 'leave'],
        category: 'account',
        icon: 'LogOut',
        runIntent: 'signout',
        requiresAuth: true,
    },
    {
        id: 'account-profile-setup',
        label: 'Edit profile',
        description: 'Update your profile and skills.',
        keywords: ['profile', 'edit', 'settings', 'me', 'account', 'avatar', 'skills', 'bio'],
        category: 'account',
        icon: 'UserCog',
        to: '/profile-setup',
        requiresAuth: true,
    },
    {
        id: 'account-update-password',
        label: 'Change password',
        description: 'Update your account password.',
        keywords: ['password', 'change', 'security', 'reset'],
        category: 'account',
        icon: 'Key',
        to: '/update-password',
        requiresAuth: true,
    },

    // ── Static info ──────────────────────────────────────────
    {
        id: 'goto-privacy',
        label: 'Privacy policy',
        keywords: ['privacy', 'policy', 'data', 'gdpr'],
        category: 'navigate',
        icon: 'FileText',
        to: '/privacy',
    },
    {
        id: 'goto-terms',
        label: 'Terms of service',
        keywords: ['terms', 'service', 'tos', 'legal'],
        category: 'navigate',
        icon: 'FileText',
        to: '/terms',
    },
    {
        id: 'goto-safety',
        label: 'Safety guidelines',
        keywords: ['safety', 'guidelines', 'rules', 'lab'],
        category: 'navigate',
        icon: 'Shield',
        to: '/safety',
    },
];

// ─── Route → relevant actions mapping ──────────────────────────────
//
// For each route pattern, a list of action IDs that should be boosted
// when the user opens the palette while sitting on that route. The
// first IDs in each array surface first when the query is empty
// (the "Suggested for this page" group), and they all get a search
// score boost so they win ties when fuzzy-matching.
//
// Patterns are simple prefix-segment matches against `location.pathname`,
// with `:id` matching any segment. Most-specific pattern wins.

export interface RouteContext {
    pattern: string;
    actionIds: string[];
}

export const ROUTE_CONTEXTS: RouteContext[] = [
    // Home — the major entry points and creates
    { pattern: '/', actionIds: [
        'goto-projects', 'goto-challenges', 'goto-events', 'goto-makers', 'goto-store', 'goto-badges',
        'add-project', 'add-challenge',
        'account-register', 'account-login',
    ] },

    // Projects flow
    { pattern: '/projects', actionIds: [
        'add-project',
        'manage-projects', 'review-projects',
        'goto-projects',
    ] },
    { pattern: '/projects/:id', actionIds: [
        'add-project',
        'goto-projects',
        'manage-projects', 'review-projects',
    ] },

    // Challenges / Explorer Hub flow
    { pattern: '/challenges', actionIds: [
        'add-challenge',
        'discover-tier-1', 'discover-tier-2', 'discover-tier-3',
        'manage-challenges', 'review-challenges',
        'goto-challenges',
    ] },
    { pattern: '/explorer-hub', actionIds: [
        'goto-challenges',
        'discover-tier-1', 'discover-tier-2', 'discover-tier-3',
        'add-challenge',
    ] },
    { pattern: '/challenges/:id', actionIds: [
        'add-project',
        'goto-challenges',
        'discover-tier-1', 'discover-tier-2', 'discover-tier-3',
        'manage-challenges',
    ] },

    // Events flow
    { pattern: '/events', actionIds: [
        'add-event-build-challenge', 'add-event-maker-meetup', 'add-event-tech-tuesday',
        'pitch-speaker',
        'discover-build-challenges', 'discover-tech-tuesdays', 'discover-maker-meetups',
        'manage-events', 'manage-series', 'manage-speakers',
        'review-event-submissions',
        'goto-events',
    ] },
    { pattern: '/events/build-challenges', actionIds: [
        'add-event-build-challenge',
        'discover-build-challenges',
        'review-event-submissions',
        'manage-events',
        'goto-events',
    ] },
    { pattern: '/events/tech-tuesdays', actionIds: [
        'add-event-tech-tuesday',
        'pitch-speaker',
        'discover-tech-tuesdays',
        'manage-speakers', 'manage-series',
        'goto-events',
    ] },
    { pattern: '/events/meetups', actionIds: [
        'add-event-maker-meetup',
        'discover-maker-meetups',
        'manage-events',
        'goto-events',
    ] },
    { pattern: '/events/:id', actionIds: [
        'goto-events',
        'pitch-speaker',
        'manage-events',
    ] },

    // Makers
    { pattern: '/makers', actionIds: [
        'goto-makers',
        'account-profile-setup',
        'manage-mentors', 'manage-users',
    ] },
    { pattern: '/makers/:id', actionIds: [
        'goto-makers',
        'account-profile-setup',
    ] },

    // Dashboard — full coverage matching the old dashboard palette
    { pattern: '/dashboard', actionIds: [
        'add-project',
        'dashboard-tab-overview',
        'dashboard-tab-mywork',
        'dashboard-tab-badges',
        'dashboard-tab-mentor',
        'dashboard-tab-admin',
        'review-projects',
        'review-challenges',
        'review-event-submissions',
        'review-website-submissions',
        'manage-events',
        'manage-inventory',
        'manage-challenges',
        'manage-projects',
        'account-profile-setup',
        'account-signout',
    ] },

    // Speak / pitch
    { pattern: '/speak', actionIds: [
        'pitch-speaker',
        'discover-tech-tuesdays',
        'manage-speakers',
        'goto-events',
    ] },

    // Store / badges
    { pattern: '/store', actionIds: [
        'goto-store',
        'manage-store', 'manage-inventory',
    ] },
    { pattern: '/badges', actionIds: [
        'goto-badges',
        'manage-badges',
        'dashboard-tab-badges',
    ] },

    // Auth pages
    { pattern: '/login', actionIds: ['account-login', 'account-register'] },
    { pattern: '/register', actionIds: ['account-register', 'account-login'] },

    // Admin sections
    { pattern: '/admin/projects', actionIds: [
        'manage-projects',
        'review-projects',
        'review-website-submissions',
        'add-project',
        'goto-projects',
    ] },
    { pattern: '/admin/challenges', actionIds: [
        'manage-challenges',
        'add-challenge',
        'review-challenges',
        'goto-challenges',
    ] },
    { pattern: '/admin/challenges/new', actionIds: [
        'add-challenge',
        'manage-challenges',
        'goto-challenges',
    ] },
    { pattern: '/admin/events', actionIds: [
        'manage-events',
        'add-event-build-challenge', 'add-event-maker-meetup', 'add-event-tech-tuesday',
        'manage-series', 'manage-speakers',
        'review-event-submissions',
        'goto-events',
    ] },
    { pattern: '/admin/review-projects', actionIds: [
        'review-projects',
        'manage-projects',
        'goto-projects',
    ] },
    { pattern: '/admin/review-challenges', actionIds: [
        'review-challenges',
        'manage-challenges',
        'goto-challenges',
    ] },
    { pattern: '/admin/users', actionIds: [
        'manage-users',
        'manage-mentors',
    ] },
    { pattern: '/mentor-dashboard', actionIds: [
        'mentor-dashboard',
        'review-projects', 'review-challenges',
        'review-event-submissions', 'review-website-submissions',
        'manage-events', 'manage-challenges', 'manage-projects',
    ] },

    // Profile setup
    { pattern: '/profile-setup', actionIds: [
        'account-profile-setup',
        'account-update-password',
        'goto-dashboard',
    ] },
];

/**
 * Match a pathname against ROUTE_CONTEXTS and return the most-specific
 * matching entry (or null). Patterns are sorted by length descending so
 * `/projects/:id` beats `/projects` on `/projects/abc`.
 */
export function findRouteContext(pathname: string): RouteContext | null {
    const sorted = [...ROUTE_CONTEXTS].sort((a, b) => b.pattern.length - a.pattern.length);
    for (const ctx of sorted) {
        if (matchesPattern(pathname, ctx.pattern)) return ctx;
    }
    return null;
}

function matchesPattern(pathname: string, pattern: string): boolean {
    const pSegs = pattern.split('/').filter(Boolean);
    const aSegs = pathname.split('/').filter(Boolean);
    if (pSegs.length === 0 && aSegs.length === 0) return true; // both '/'
    if (pSegs.length !== aSegs.length) return false;
    for (let i = 0; i < pSegs.length; i++) {
        if (pSegs[i].startsWith(':')) continue; // wildcard
        if (pSegs[i] !== aSegs[i]) return false;
    }
    return true;
}
