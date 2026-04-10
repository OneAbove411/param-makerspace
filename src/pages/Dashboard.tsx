import React, { useState, useRef, useEffect, useMemo, useCallback, Suspense } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router';
import {
    useMyProjects,
    useMyStats,
    useProjectMutations,
    useMyProfile,
    useRankAccess,
    useMyXPHistory,
    useBadges,
    useUserBadges,
    useMyChallengeCompletionStatus,
    useChallenges,
} from '../lib/hooks';
import { useRequireProfile } from '../lib/useRequireProfile';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { canAccess, getRequiredRank } from '../lib/rankAccess';
import { toast } from '../lib/toast';
import { Card } from '../components/ui/Card';
import { RankBadge } from '../components/ui/RankBadge';
import { RankGate } from '../components/ui/RankGate';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FieldError } from '../components/ui/FieldError';
import { Skeleton } from '../components/ui/Skeleton';
import {
    Settings,
    AlertTriangle,
    X,
    UserCheck,
    BookOpen,
} from 'lucide-react';
import { isValidVideoUrl } from '../lib/videoUtils';
import {
    DashboardSidebar,
    DashboardTabBarMobile,
    type DashboardTabId,
    type DashboardSidebarItem,
} from '../components/dashboard/DashboardSidebar';
import {
    DashboardCommandPalette,
    type DashboardCommand,
} from '../components/dashboard/DashboardCommandPalette';
import { OverviewBento } from '../components/dashboard/OverviewBento';
import { MyWorkTab } from '../components/dashboard/MyWorkTab';
import { MyBadgesTab } from '../components/dashboard/MyBadgesTab';
import { isMacPlatform } from '../lib/platform';

/**
 * §7 Cockpit — Dashboard Shell.
 *
 * Layout: brutalist Cockpit shell.
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  HERO (compact welcome + role + rank pill)           │
 *   ├────────┬─────────────────────────────────────────────┤
 *   │ SIDE-  │  TAB BODY                                   │
 *   │ BAR    │  (Overview Bento / My Work / Mentor / Admin)│
 *   │ (md+)  │                                             │
 *   └────────┴─────────────────────────────────────────────┘
 *
 * Why a tab shell over the old long scroll:
 *   - Linear/Vercel/Supabase have all converged on rail+content for
 *     power-user dashboards. It collapses 8 vertical viewports into one.
 *   - Each tab is in-page state (not a route), so URL contracts with the
 *     rest of the app are unchanged. Future UX_MASTER sections that link
 *     to /dashboard land on the same URL as before.
 *
 * Hard constraints honored (per user):
 *   - No DB / migration changes
 *   - No RBAC / role logic changes — all role checks identical to before
 *   - No router / RootLayout changes
 *   - No new npm dependency (Cmd+K is hand-rolled)
 *   - Brutalist tokens preserved as the only design language
 *   - All work confined to src/pages/Dashboard.tsx + src/components/dashboard/*
 *
 * Revert path:
 *   git checkout HEAD -- src/pages/Dashboard.tsx src/components/dashboard/
 */

// Code-split heavy role-gated sections (kept from prior pass).
const MentorToolsSection = React.lazy(() => import('../components/dashboard/MentorToolsSection'));
const AdminPanelSection = React.lazy(() => import('../components/dashboard/AdminPanelSection'));

// Static option lists for the new-project form (kept from prior pass).
const DOMAINS = ['Electronics', 'AI', 'Robotics', 'Embedded Systems', 'IoT', '3D Printing', 'Automation', 'Woodworks', 'Wireless Comms', 'Quantum Computing', 'Parallel Computing', 'Design', 'Fabrication', 'Bio & Life Sciences', 'Interdisciplinary'];
const TIERS = ['Tier 1', 'Tier 2', 'Tier 3'];

// Human labels for the legacy `role` enum (Nielsen H2).
const ROLE_LABELS: Record<string, string> = {
    viewer: 'Explorer',
    maker: 'Maker',
    mentor: 'Mentor',
    admin: 'Admin',
};

export function Dashboard() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    useRequireProfile();

    // ── Data hooks (unchanged from prior pass) ──
    const { data: stats, loading: statsLoading } = useMyStats();
    const { data: myProjects, loading: projectsLoading } = useMyProjects();
    const { createProject } = useProjectMutations();
    const { data: myProfile, loading: profileLoading } = useMyProfile();
    const { data: rankAccess, loading: rankLoading } = useRankAccess();
    const { data: xpHistory, loading: xpLoading } = useMyXPHistory();
    const { data: allBadges, loading: badgesLoading } = useBadges();
    const { data: userBadges, loading: userBadgesLoading } = useUserBadges(user?.id);
    const { data: myChallengeStatus, loading: myChallengesLoading } = useMyChallengeCompletionStatus();
    const { data: allChallenges, loading: allChallengesLoading } = useChallenges();

    // Build challenge items for MyWorkTab
    const myChallengeItems = useMemo(() => {
        if (!myChallengeStatus || !allChallenges) return [];
        const items: Array<{ challengeId: string; title: string; tier: string; status: string }> = [];
        for (const [challengeId, status] of myChallengeStatus.entries()) {
            const challenge = allChallenges.find((c: any) => c.id === challengeId);
            if (challenge) {
                items.push({
                    challengeId,
                    title: (challenge as any).title || 'Untitled',
                    tier: (challenge as any).tier || 'Tier 1',
                    status,
                });
            }
        }
        return items;
    }, [myChallengeStatus, allChallenges]);

    // Build event items for MyWorkTab (query user's event registrations)
    const [myEventItems, setMyEventItems] = useState<Array<{ id: string; title: string; date: string; type: string }>>([]);
    const [myEventsLoading, setMyEventsLoading] = useState(true);
    useEffect(() => {
        if (!user?.id) { setMyEventsLoading(false); return; }
        (async () => {
            const { data } = await supabase
                .from('event_registration')
                .select('event_id, event:event(id, title, date, event_type)')
                .eq('user_id', user.id)
                .order('registered_at', { ascending: false })
                .limit(20);
            if (data) {
                setMyEventItems(
                    (data as any[])
                        .filter((r: any) => r.event)
                        .map((r: any) => ({
                            id: r.event.id,
                            title: r.event.title,
                            date: r.event.date
                                ? new Date(r.event.date).toLocaleDateString()
                                : '',
                            type: r.event.event_type || 'Event',
                        }))
                );
            }
            setMyEventsLoading(false);
        })();
    }, [user?.id]);

    // ── Active tab + sidebar state (persisted in localStorage per user) ──
    const tabStorageKey = user?.id ? `db_tab_${user.id}` : null;
    const sidebarStorageKey = user?.id ? `db_sidebar_collapsed_${user.id}` : null;

    const [activeTab, setActiveTab] = useState<DashboardTabId>(() => {
        if (typeof window === 'undefined' || !tabStorageKey) return 'overview';
        try {
            const stored = window.localStorage.getItem(tabStorageKey) as DashboardTabId | null;
            if (stored && ['overview', 'my-work', 'badges', 'mentor', 'admin'].includes(stored)) {
                return stored;
            }
        } catch { /* ignore */ }
        return 'overview';
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !sidebarStorageKey) return false;
        try {
            return window.localStorage.getItem(sidebarStorageKey) === '1';
        } catch { return false; }
    });
    const [paletteOpen, setPaletteOpen] = useState(false);
    // Platform-aware Cmd+K display (Mac shows ⌘K, others show Ctrl K).
    // The keyboard listener accepts BOTH metaKey and ctrlKey, so this is
    // purely a display concern. Memoized once per mount.
    const isMac = useMemo(() => isMacPlatform(), []);
    const modKeyLabel = isMac ? '⌘K' : 'Ctrl K';

    const handleTabChange = useCallback(
        (tab: DashboardTabId) => {
            setActiveTab(tab);
            if (tabStorageKey) {
                try { window.localStorage.setItem(tabStorageKey, tab); } catch { /* ignore */ }
            }
        },
        [tabStorageKey]
    );
    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed((prev) => {
            const next = !prev;
            if (sidebarStorageKey) {
                try { window.localStorage.setItem(sidebarStorageKey, next ? '1' : '0'); } catch { /* ignore */ }
            }
            return next;
        });
    }, [sidebarStorageKey]);

    // ── New-project form state (unchanged from prior pass) ──
    const [showNewProject, setShowNewProject] = useState(false);
    const emptyProjectForm = { title: '', summary: '', domain: '', tier: '', videoUrl: '' };
    const [newProjectForm, setNewProjectForm] = useState(emptyProjectForm);
    const [creating, setCreating] = useState(false);
    const [videoUrlError, setVideoUrlError] = useState('');

    // Profile-completion banner dismissal (persisted, F-311)
    const bannerStorageKey = user?.id ? `db_profile_banner_dismissed_${user.id}` : null;
    const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !bannerStorageKey) return false;
        try {
            return window.localStorage.getItem(bannerStorageKey) === '1';
        } catch {
            return false;
        }
    });
    const dismissBanner = () => {
        setBannerDismissed(true);
        if (bannerStorageKey) {
            try { window.localStorage.setItem(bannerStorageKey, '1'); } catch { /* ignore */ }
        }
    };

    // Form dirty guard
    const formDirty = showNewProject && (
        newProjectForm.title.trim() !== '' ||
        newProjectForm.summary.trim() !== '' ||
        newProjectForm.domain !== '' ||
        newProjectForm.tier !== '' ||
        newProjectForm.videoUrl.trim() !== ''
    );
    useUnsavedChanges(formDirty);

    const pageRef = useRef<HTMLDivElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showNewProject && formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [showNewProject]);

    // Entrance animation — runs once, honors prefers-reduced-motion
    useEffect(() => {
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.db-hero-text',
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: 'power3.out' }
            );
            gsap.fromTo(
                '.db-tab-body',
                { y: 16, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.15 }
            );
        }, pageRef);

        return () => ctx.revert();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Subtle re-fade when switching tabs
    useEffect(() => {
        const prefersReducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;
        const el = pageRef.current?.querySelector('.db-tab-body');
        if (el) {
            gsap.fromTo(
                el,
                { y: 8, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
            );
        }
    }, [activeTab]);

    // ── Derived facts ──
    const profileComplete = !!(
        myProfile?.bio &&
        (myProfile as any)?.avatar_url &&
        myProfile?.display_name &&
        ((myProfile as any)?.github_url || (myProfile as any)?.linkedin_url)
    );

    const activeProjects = stats?.activeProjects || 0;
    const upcomingEvents = stats?.upcomingEvents || 0;
    const completedChallenges = stats?.completedChallenges || 0;

    const currentRank = rankAccess?.rank || 'Curious';
    const currentXP = rankAccess?.xp || 0;
    const canCreateProject = canAccess(currentRank, 'create_project');
    const createProjectRequiredRank = getRequiredRank('create_project');
    const canViewMentorTools = role === 'mentor' || role === 'admin';
    const isAdmin = role === 'admin';

    const firstRejected = useMemo(
        () => (myProjects || []).find((p) => p.status === 'rejected') || null,
        [myProjects]
    );
    const firstDraft = useMemo(
        () => (myProjects || []).find((p) => p.status === 'draft') || null,
        [myProjects]
    );
    const nbaLoading = profileLoading || projectsLoading || rankLoading || statsLoading;

    const attentionItems = useMemo(
        () => (myProjects || []).filter((p) => p.status === 'rejected' || p.status === 'pending_review'),
        [myProjects]
    );

    // ── Handlers ──
    const openProposeForm = useCallback(() => {
        setShowNewProject(true);
        setActiveTab('my-work');
    }, []);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectForm.title.trim()) return;
        setCreating(true);

        const videoUrl = newProjectForm.videoUrl.trim();

        const { data: project, error } = await createProject({
            title: newProjectForm.title.trim(),
            summary: newProjectForm.summary.trim() || newProjectForm.title.trim(),
            description: '',
            domain: newProjectForm.domain || undefined,
            tier: newProjectForm.tier || undefined,
        });

        if (error || !project) {
            toast.error('Couldn’t create the project: ' + (error || 'Unknown error'));
            setCreating(false);
            return;
        }

        if (videoUrl && isValidVideoUrl(videoUrl)) {
            try {
                const { error: videoError } = await supabase.from('project_video').insert({
                    project_id: project.id,
                    title: 'Project Video',
                    video_url: videoUrl,
                    display_order: 1,
                });
                if (videoError) {
                    toast.error('Couldn’t attach the video — you can add it from the editor.');
                    console.warn('Video insert failed:', videoError.message);
                }
            } catch (err: any) {
                toast.error('Couldn’t attach the video — you can add it from the editor.');
                console.warn('Video insert threw:', err?.message || err);
            }
        }

        setNewProjectForm(emptyProjectForm);
        setVideoUrlError('');
        setShowNewProject(false);
        setCreating(false);
        toast.success('Project created — opening editor.');
        navigate(`/projects/${project.id}/edit`);
    };

    const handleCloseForm = () => {
        setShowNewProject(false);
        setNewProjectForm(emptyProjectForm);
    };

    // ── Sidebar items (RBAC-filtered) ──
    const sidebarItems: DashboardSidebarItem[] = useMemo(() => {
        const items: DashboardSidebarItem[] = [
            { id: 'overview', label: 'Overview', description: 'Your cockpit', icon: 'overview' },
            {
                id: 'my-work',
                label: 'My Work',
                description: 'Projects & attention',
                icon: 'work',
                badge: attentionItems.length,
            },
            {
                id: 'badges',
                label: 'My Badges',
                description: 'Earned & upcoming badges',
                icon: 'badges',
                badge: userBadges?.length || 0,
            },
        ];
        if (canViewMentorTools) {
            items.push({
                id: 'mentor',
                label: 'Mentor Queue',
                description: 'Reviews & lab admin',
                icon: 'mentor',
            });
        }
        if (isAdmin) {
            items.push({
                id: 'admin',
                label: 'System Control',
                description: 'Admin panel',
                icon: 'admin',
            });
        }
        return items;
    }, [attentionItems.length, userBadges?.length, canViewMentorTools, isAdmin]);

    // Guard: if a user's role no longer permits the persisted tab, fall back.
    useEffect(() => {
        const allowed = sidebarItems.map((i) => i.id);
        if (!allowed.includes(activeTab)) {
            handleTabChange('overview');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sidebarItems.length]);

    // ── Command palette commands (RBAC-filtered) ──
    const commands: DashboardCommand[] = useMemo(() => {
        const list: DashboardCommand[] = [
            { id: 'nav-overview', section: 'Navigate', label: 'Go to Overview', tab: 'overview', keywords: ['home', 'dashboard'] },
            { id: 'nav-my-work', section: 'Navigate', label: 'Go to My Work', tab: 'my-work', keywords: ['projects', 'attention'] },
        ];
        if (canViewMentorTools) {
            list.push({ id: 'nav-mentor', section: 'Navigate', label: 'Go to Mentor Queue', tab: 'mentor' });
        }
        if (isAdmin) {
            list.push({ id: 'nav-admin', section: 'Navigate', label: 'Go to System Control', tab: 'admin' });
        }

        if (canCreateProject) {
            list.push({
                id: 'create-project',
                section: 'Create',
                label: 'Propose new project',
                hint: 'Opens the project form',
                action: openProposeForm,
                keywords: ['new', 'project', 'propose', 'add'],
            });
        }

        list.push(
            { id: 'browse-challenges', section: 'Navigate', label: 'Browse Challenges', to: '/challenges' },
            { id: 'browse-events', section: 'Navigate', label: 'Browse Events', to: '/events' },
            { id: 'browse-makers', section: 'Navigate', label: 'Browse Makers', to: '/makers' },
            { id: 'browse-projects', section: 'Navigate', label: 'Browse Projects', to: '/projects' },
        );

        if (canViewMentorTools) {
            list.push(
                { id: 'mentor-projects', section: 'Mentor', label: 'Project Reviews', to: '/admin/review-projects' },
                { id: 'mentor-challenges', section: 'Mentor', label: 'Challenge Verification', to: '/admin/review-challenges' },
                { id: 'mentor-submissions', section: 'Mentor', label: 'Event Submissions', to: '/admin/review-submissions' },
                { id: 'mentor-websites', section: 'Mentor', label: 'Website Submissions', to: '/admin/review-websites' },
                { id: 'mentor-events-manage', section: 'Mentor', label: 'Manage Events', to: '/admin/events' },
                { id: 'mentor-inventory', section: 'Mentor', label: 'Lab Inventory', to: '/admin/inventory' },
                { id: 'mentor-challenges-manage', section: 'Mentor', label: 'Manage Challenges', to: '/admin/challenges' },
                { id: 'mentor-projects-manage', section: 'Mentor', label: 'Manage Projects', to: '/admin/projects' },
            );
        }

        if (isAdmin) {
            list.push(
                { id: 'admin-users', section: 'Admin', label: 'Manage Users', to: '/admin/users' },
                { id: 'admin-badges', section: 'Admin', label: 'Manage Badges', to: '/admin/badges' },
                { id: 'admin-store', section: 'Admin', label: 'Manage Store', to: '/admin/store' },
                { id: 'admin-equipment', section: 'Admin', label: 'Manage Equipment', to: '/admin/equipment' },
            );
        }

        list.push(
            { id: 'acct-profile', section: 'Account', label: 'Edit Profile', to: '/profile-setup' },
            { id: 'acct-view-profile', section: 'Account', label: 'View My Profile', to: '/profile' },
        );

        return list;
    }, [canViewMentorTools, isAdmin, canCreateProject, openProposeForm]);

    // Global Cmd+K listener
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;
            if (isMod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((p) => !p);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── Render ──
    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* HERO — compact (text-4xl/5xl, not 7xl) */}
            <section
                className="pt-32 pb-4 px-6 md:px-12 lg:px-20 max-w-[1500px] mx-auto"
                aria-labelledby="dashboard-title"
            >
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div className="min-w-0">
                        <div className="db-hero-text flex flex-wrap items-center gap-2 mb-3">
                            <span className="bg-brutal-dark text-brutal-bg px-2 py-1 text-xs font-bold font-data rounded uppercase">
                                {ROLE_LABELS[role || 'viewer'] || role}
                            </span>
                            {rankLoading ? (
                                <span className="inline-block h-[26px] w-24 rounded-full bg-brutal-dark/10 motion-safe:animate-pulse" />
                            ) : (
                                <RankBadge rank={currentRank} xp={currentXP} variant="pill" />
                            )}
                        </div>
                        <h1
                            id="dashboard-title"
                            className="db-hero-text font-heading font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight-heading truncate"
                        >
                            Welcome back, {user?.name || 'Maker'}.
                        </h1>
                    </div>
                    <div className="db-hero-text flex items-center gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setPaletteOpen(true)}
                            className="hidden lg:inline-flex h-10 items-center gap-2 font-data text-sm font-bold uppercase tracking-wider text-brutal-dark/60 border-2 border-brutal-dark/20 px-4 rounded hover:border-brutal-dark/40 hover:text-brutal-dark hover:bg-brutal-dark/5 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                        >
                            Quick jump
                            <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-brutal-dark/20 bg-brutal-bg text-[10px] font-bold tabular-nums leading-none">
                                {modKeyLabel}
                            </kbd>
                        </button>
                        <Link
                            to="/profile-setup"
                            className="h-10 font-data text-sm font-bold inline-flex items-center gap-2 border-2 border-brutal-dark/20 px-4 hover:bg-brutal-dark/5 rounded transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                        >
                            <Settings className="w-4 h-4" aria-hidden />
                            <span className="hidden sm:inline">Edit Profile</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* View-only banner (F-305) — kept above the shell */}
            {role === 'viewer' && (
                <section className="px-6 md:px-12 lg:px-20 max-w-[1500px] mx-auto pb-2">
                    <div
                        role="status"
                        aria-live="polite"
                        className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r font-data shadow-[4px_4px_0_0_rgba(234,179,8,0.18)]"
                    >
                        <p className="font-bold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" aria-hidden /> View-Only Access
                        </p>
                        <p className="text-sm mt-1">
                            Your account is currently pending maker induction. Here&apos;s how to advance:
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <Link
                                to="/makers?role=mentor"
                                className="inline-flex items-center gap-2 border-2 border-brutal-red text-brutal-red px-3 py-1.5 font-data text-xs font-bold uppercase tracking-wider hover:bg-brutal-red hover:text-brutal-bg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                <UserCheck className="w-4 h-4" aria-hidden /> Find a mentor
                            </Link>
                            <Link
                                to="/challenges"
                                className="inline-flex items-center gap-2 border-2 border-brutal-dark/30 text-brutal-dark px-3 py-1.5 font-data text-xs font-bold uppercase tracking-wider hover:bg-brutal-dark hover:text-brutal-bg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                <BookOpen className="w-4 h-4" aria-hidden /> Read induction guide
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Profile completion banner (F-311) */}
            {!profileComplete && !bannerDismissed && (
                <section className="px-6 md:px-12 lg:px-20 max-w-[1500px] mx-auto pb-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 py-4 bg-brutal-dark text-brutal-bg rounded-2xl border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.5)]">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-2 h-2 rounded-full bg-brutal-red motion-safe:animate-pulse flex-shrink-0" aria-hidden />
                            <span className="font-data text-sm font-bold truncate md:whitespace-normal md:truncate-none">
                                Your profile is incomplete — add a bio, avatar, and social links to appear in the Makers Directory.
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Link to="/profile-setup">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg"
                                >
                                    Complete Profile
                                </Button>
                            </Link>
                            <button
                                onClick={dismissBanner}
                                aria-label="Dismiss profile completion banner"
                                className="p-2 rounded text-brutal-bg/50 hover:text-brutal-bg hover:bg-brutal-bg/10 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                <X className="w-4 h-4" aria-hidden />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* COCKPIT SHELL — rail + content */}
            <section
                className="px-6 md:px-12 lg:px-20 max-w-[1500px] mx-auto pb-20"
                aria-label="Dashboard cockpit"
            >
                {/* Mobile tab bar (md-) */}
                <div className="md:hidden mt-2 mb-6">
                    <DashboardTabBarMobile
                        items={sidebarItems}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                </div>

                <div className="flex gap-6">
                    {/* Sidebar (md+) */}
                    <DashboardSidebar
                        items={sidebarItems}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        collapsed={sidebarCollapsed}
                        onToggleCollapsed={toggleSidebar}
                        onOpenCommandPalette={() => setPaletteOpen(true)}
                    />

                    {/* Tab body */}
                    <div className="flex-1 min-w-0 db-tab-body">
                        {activeTab === 'overview' && (
                            <OverviewBento
                                nbaInput={{
                                    loading: nbaLoading,
                                    profileComplete,
                                    hasRejectedProject: firstRejected
                                        ? { id: firstRejected.id, title: firstRejected.title }
                                        : null,
                                    hasDraftProject: firstDraft
                                        ? { id: firstDraft.id, title: firstDraft.title }
                                        : null,
                                    currentRank,
                                    completedChallenges,
                                    upcomingEvents,
                                }}
                                rank={{ rank: currentRank, xp: currentXP, loading: rankLoading }}
                                stats={{
                                    activeProjects,
                                    upcomingEvents,
                                    completedChallenges,
                                    loading: statsLoading,
                                }}
                                xpHistory={{
                                    items: (xpHistory || []).map((e) => ({
                                        id: e.id,
                                        reason: e.reason,
                                        amount: e.amount,
                                    })),
                                    loading: xpLoading,
                                }}
                                propose={{
                                    canCreate: canCreateProject,
                                    requiredRank: createProjectRequiredRank,
                                    onPropose: openProposeForm,
                                }}
                                attention={attentionItems.map((p) => ({
                                    id: p.id,
                                    status: p.status,
                                    title: p.title,
                                }))}
                                badges={{
                                    earned: userBadges?.length || 0,
                                    total: allBadges?.length || 0,
                                    lastBadgeName: userBadges && userBadges.length > 0
                                        ? (userBadges[userBadges.length - 1] as any)?.badge?.name || null
                                        : null,
                                    loading: badgesLoading || userBadgesLoading,
                                }}
                            />
                        )}

                        {activeTab === 'my-work' && (
                            <div className="space-y-6">
                                <MyWorkTab
                                    projects={(myProjects || []).map((p) => ({
                                        id: p.id,
                                        title: p.title,
                                        summary: p.summary,
                                        status: p.status,
                                    }))}
                                    projectsLoading={projectsLoading}
                                    attention={attentionItems.map((p) => ({
                                        id: p.id,
                                        title: p.title,
                                        summary: p.summary,
                                        status: p.status,
                                    }))}
                                    canCreateProject={canCreateProject}
                                    requiredRank={createProjectRequiredRank}
                                    onPropose={() => setShowNewProject(true)}
                                    challenges={myChallengeItems}
                                    challengesLoading={myChallengesLoading || allChallengesLoading}
                                    events={myEventItems}
                                    eventsLoading={myEventsLoading}
                                />

                                {/* Inline new-project form */}
                                {showNewProject && (
                                    <Card
                                        ref={formRef}
                                        className="p-8 border-2 border-brutal-red/30 shadow-[8px_8px_0_0_rgba(196,41,30,0.18)] relative scroll-mt-32"
                                    >
                                        <button
                                            onClick={handleCloseForm}
                                            aria-label="Close new project form"
                                            className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                        >
                                            <X className="w-5 h-5" aria-hidden />
                                        </button>
                                        <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
                                            New Project Proposal
                                        </h3>

                                        {!canCreateProject ? (
                                            <div className="space-y-4">
                                                <RankGate feature="create_project" />
                                                <Link
                                                    to="/challenges?tier=Tier+1"
                                                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 text-brutal-dark hover:bg-yellow-600 transition-colors px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    Browse Tier 1 Challenges
                                                </Link>
                                            </div>
                                        ) : (
                                        <form onSubmit={handleCreateProject} className="space-y-4">
                                            <Input
                                                label="Project Title"
                                                value={newProjectForm.title}
                                                onChange={(e) =>
                                                    setNewProjectForm((prev) => ({ ...prev, title: e.target.value }))
                                                }
                                                required
                                            />
                                            <Input
                                                label="Summary (optional)"
                                                value={newProjectForm.summary}
                                                onChange={(e) =>
                                                    setNewProjectForm((prev) => ({ ...prev, summary: e.target.value }))
                                                }
                                                placeholder="A one-line pitch for your project"
                                            />
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label
                                                        htmlFor="new-project-domain"
                                                        className="font-data text-sm font-bold text-brutal-dark mb-2 block"
                                                    >
                                                        Domain
                                                    </label>
                                                    <select
                                                        id="new-project-domain"
                                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red focus:border-brutal-dark transition-colors"
                                                        value={newProjectForm.domain}
                                                        onChange={(e) =>
                                                            setNewProjectForm((prev) => ({ ...prev, domain: e.target.value }))
                                                        }
                                                    >
                                                        <option value="">Select domain...</option>
                                                        {DOMAINS.map((d) => (
                                                            <option key={d} value={d}>{d}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label
                                                        htmlFor="new-project-tier"
                                                        className="font-data text-sm font-bold text-brutal-dark mb-2 block"
                                                    >
                                                        Tier
                                                    </label>
                                                    <select
                                                        id="new-project-tier"
                                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red focus:border-brutal-dark transition-colors"
                                                        value={newProjectForm.tier}
                                                        onChange={(e) =>
                                                            setNewProjectForm((prev) => ({ ...prev, tier: e.target.value }))
                                                        }
                                                    >
                                                        <option value="">Select tier...</option>
                                                        {TIERS.map((t) => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <Input
                                                label="Video URL (optional)"
                                                type="text"
                                                placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
                                                value={newProjectForm.videoUrl}
                                                error={videoUrlError || undefined}
                                                aria-invalid={videoUrlError ? true : undefined}
                                                aria-describedby={videoUrlError ? 'new-project-video-url-error' : undefined}
                                                onChange={(e) => {
                                                    setNewProjectForm((prev) => ({ ...prev, videoUrl: e.target.value }));
                                                    const v = e.target.value.trim();
                                                    setVideoUrlError(
                                                        v && !isValidVideoUrl(v) ? 'Not a valid YouTube or Vimeo URL' : ''
                                                    );
                                                }}
                                            />
                                            <FieldError id="new-project-video-url-error">{videoUrlError}</FieldError>

                                            <div className="flex justify-end gap-4 pt-4 border-t border-brutal-dark/10">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={handleCloseForm}
                                                    disabled={creating}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    disabled={creating || !newProjectForm.title.trim() || !!videoUrlError}
                                                >
                                                    {creating ? 'Creating...' : 'Create Project'}
                                                </Button>
                                            </div>
                                        </form>
                                        )}
                                    </Card>
                                )}
                            </div>
                        )}

                        {activeTab === 'badges' && (
                            <MyBadgesTab
                                earnedBadges={(userBadges || []).map((ub: any) => ({
                                    id: ub.badge?.id || ub.badge_id,
                                    name: ub.badge?.name || 'Unknown',
                                    description: ub.badge?.description,
                                    criteria: ub.badge?.criteria,
                                    tier: ub.badge?.tier,
                                    domain: ub.badge?.domain,
                                    badge_type: ub.badge?.badge_type,
                                    icon_url: ub.badge?.icon_url,
                                }))}
                                allBadges={(allBadges || []).map((b: any) => ({
                                    id: b.id,
                                    name: b.name,
                                    description: b.description,
                                    criteria: b.criteria,
                                    tier: b.tier,
                                    domain: b.domain,
                                    badge_type: b.badge_type,
                                    icon_url: b.icon_url,
                                }))}
                                loading={badgesLoading || userBadgesLoading}
                            />
                        )}

                        {activeTab === 'mentor' && canViewMentorTools && (
                            <Suspense
                                fallback={<Skeleton variant="card" />}
                            >
                                <MentorToolsSection />
                            </Suspense>
                        )}

                        {activeTab === 'admin' && isAdmin && (
                            <Suspense
                                fallback={<Skeleton variant="card" />}
                            >
                                <AdminPanelSection />
                            </Suspense>
                        )}
                    </div>
                </div>
            </section>

            {/* Cmd+K palette */}
            <DashboardCommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                commands={commands}
                onJumpToTab={handleTabChange}
            />
        </div>
    );
}
