import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/auth';
import { LogOut, LayoutDashboard, Menu, X, Shield, ChevronDown, ArrowLeft } from 'lucide-react';
// ParamLogo removed from navbar per redesign
import { useRankAccess } from '../../lib/hooks';
import { RankBadge } from '../ui/RankBadge';
import { XPHudPill } from './XPHudPill';

// Hoisted outside component to avoid re-creating on every render.
const navLinks = [
    { to: '/projects', label: 'Projects', prefetch: () => import('../../pages/Projects') },
    { to: '/challenges', label: 'Explorer Hub', prefetch: () => import('../../pages/Challenges') },
    { to: '/events', label: 'Events', prefetch: () => import('../../pages/Events') },
    { to: '/makers', label: 'Makers', prefetch: () => import('../../pages/Makers') },
    { to: '/store', label: 'Store', prefetch: () => import('../../pages/Store') },
];

const topLevelPaths = new Set(['/', '/projects', '/challenges', '/events', '/makers', '/store', '/login', '/register']);

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === '/';
    const { user, signOut, isLoading } = useAuth();
    const { data: rankAccess } = useRankAccess();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
        setAvatarOpen(false);
    }, [location.pathname]);

    // Click-outside for avatar dropdown
    useEffect(() => {
        if (!avatarOpen) return;
        const handler = (e: MouseEvent) => {
            if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
                setAvatarOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [avatarOpen]);

    const handleSignOut = () => {
        signOut(); // State clears instantly (setUser(null) is synchronous in signOut)
        navigate('/', { replace: true });
        // If already on '/', navigate() is a no-op and the page stays
        // scrolled at the bottom — force a scroll to the top so the user
        // lands back at the hero.
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const prefetchedRoutes = useRef(new Set<string>());
    const prefetchRoute = (to: string, loader: () => Promise<unknown>) => {
        if (prefetchedRoutes.current.has(to)) return;
        prefetchedRoutes.current.add(to);
        // Swallow errors — prefetch is best-effort and must never block UI.
        loader().catch(() => { prefetchedRoutes.current.delete(to); });
    };

    // Show back button on sub-pages (anything beyond top-level routes)
    const showBack = !topLevelPaths.has(location.pathname);

    const goBack = () => {
        if (typeof window !== 'undefined' && window.history.length > 1) navigate(-1);
        else navigate('/');
    };

    // Hero (logged out) needs a low-opacity tint + blur so the nav is legible
    // against the dark slab. Keep transparent feel, just bump contrast.
    const onDarkHero = isHome && !scrolled;

    return (
        <header className="fixed top-6 left-0 right-0 z-50 flex justify-center items-center gap-1.5 sm:gap-2.5 px-2 sm:px-4 pointer-events-none">
            {/* Back pill — separate from navbar, sits to its left */}
            {showBack && (
                <button
                    type="button"
                    onClick={goBack}
                    className={cn(
                        "pointer-events-auto inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-2.5 rounded-full transition-[background-color,border-color,color,box-shadow,backdrop-filter] duration-300 font-data text-[11px] font-bold uppercase tracking-wider flex-shrink-0",
                        scrolled || !isHome
                            ? "bg-brutal-bg/80 backdrop-blur-xl border-2 border-brutal-dark/10 shadow-lg text-brutal-dark/70 hover:text-brutal-dark"
                            : "bg-brutal-dark/35 backdrop-blur-md border-2 border-brutal-bg/10 text-brutal-bg/80 hover:text-brutal-bg"
                    )}
                    aria-label="Go back"
                >
                    <ArrowLeft size={13} />
                </button>
            )}

            <nav
                className={cn(
                    "pointer-events-auto flex items-center justify-between px-5 py-2.5 rounded-full transition-[background-color,border-color,color,box-shadow,backdrop-filter] duration-300 w-full max-w-5xl",
                    scrolled || !isHome
                        ? "bg-brutal-bg/80 backdrop-blur-xl border-2 border-brutal-dark/10 shadow-lg text-brutal-dark"
                        : "bg-brutal-dark/35 backdrop-blur-md border-2 border-brutal-bg/10 text-brutal-bg"
                )}
            >
                <Link to="/" className="font-heading font-bold tracking-tight-heading flex flex-col items-start leading-[0.95] interactive-lift">
                    <span className="text-base">PARAM</span>
                    <span className={cn(
                        "font-data text-[8px] uppercase tracking-[0.25em] font-bold -mt-px",
                        (scrolled || !isHome) ? "text-brutal-dark/40" : "text-brutal-bg/50"
                    )}>makersadda</span>
                </Link>

                <div className="hidden lg:flex items-center gap-7 font-data font-medium text-[13px]">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onMouseEnter={() => prefetchRoute(link.to, link.prefetch)}
                            onFocus={() => prefetchRoute(link.to, link.prefetch)}
                            onTouchStart={() => prefetchRoute(link.to, link.prefetch)}
                            className={cn(
                                "hover:text-brutal-red transition-colors interactive-lift",
                                location.pathname.startsWith(link.to) && "text-brutal-red font-bold"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    {/* Layer3-style XP HUD pill — replaces the old secondary status bar.
                        Lives inside the nav pill so logged-in users see XP/rank in-line. */}
                    {!isLoading && user && rankAccess?.rank && (
                        <XPHudPill
                            rank={rankAccess.rank}
                            xp={rankAccess.xp ?? 0}
                            onDark={onDarkHero}
                        />
                    )}
                    {!isLoading && user ? (
                        <div ref={avatarMenuRef} className="relative">
                            <button
                                onClick={() => setAvatarOpen(o => !o)}
                                className={cn(
                                    "hidden sm:flex items-center gap-2 font-data text-sm font-bold transition-colors interactive-lift",
                                    onDarkHero ? "hover:text-brutal-bg" : "hover:text-brutal-red"
                                )}
                                aria-haspopup="menu"
                                aria-expanded={avatarOpen}
                            >
                                {/* Avatar with rank ring — rank label lives in dropdown, not floating chip */}
                                <div className={cn(
                                    "w-7 h-7 rounded-full overflow-hidden bg-brutal-dark border-2 flex items-center justify-center flex-shrink-0",
                                    rankAccess?.rank ? "border-brutal-red" : "border-brutal-dark/20"
                                )}>
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-data text-[10px] font-bold text-brutal-bg">
                                            {user.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <span className="hidden md:inline text-[13px]">{user.name?.split(' ')[0]}</span>
                                <ChevronDown size={13} className={cn("transition-transform opacity-60", avatarOpen && "rotate-180")} />
                            </button>

                            {/* Dropdown menu */}
                            {avatarOpen && (
                                <div className="absolute right-0 top-[calc(100%+12px)] w-56 sm:w-64 max-w-[90vw] bg-brutal-bg border-2 border-brutal-dark/10 rounded-2xl shadow-2xl overflow-hidden">
                                    {/* User identity strip */}
                                    <div className="px-4 py-3 border-b border-brutal-dark/8 bg-brutal-dark/[0.02]">
                                        <p className="font-heading font-bold text-sm text-brutal-dark truncate">{user.name}</p>
                                        <p className="font-data text-[10px] text-brutal-dark/40 uppercase tracking-wider truncate">{user.email}</p>
                                        {rankAccess?.rank && (
                                            <div className="mt-2">
                                                <RankBadge rank={rankAccess.rank} xp={rankAccess.xp} variant="pill" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="py-2">
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setAvatarOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2.5 font-data text-sm font-bold text-brutal-dark hover:bg-brutal-red/5 hover:text-brutal-red transition-colors"
                                        >
                                            <LayoutDashboard size={15} /> Dashboard
                                        </Link>
                                        {(user.role === 'mentor' || user.role === 'admin') && (
                                            <Link
                                                to="/mentor-dashboard"
                                                onClick={() => setAvatarOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 font-data text-sm font-bold text-brutal-red hover:bg-brutal-red/5 transition-colors"
                                            >
                                                <Shield size={15} /> Mentor Panel
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => { setAvatarOpen(false); handleSignOut(); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 font-data text-sm font-bold text-brutal-dark/60 hover:bg-brutal-red/5 hover:text-brutal-red transition-colors text-left"
                                        >
                                            <LogOut size={15} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : !isLoading ? (
                        <>
                            <Link to="/login" className="hidden sm:block font-data text-sm font-bold hover:underline interactive-lift">Log In</Link>
                            <Link to="/register">
                                <Button variant={(scrolled || !isHome) ? "primary" : "secondary"} size="sm">
                                    Join the Lab
                                </Button>
                            </Link>
                        </>
                    ) : null}

                    {/* Mobile menu toggle */}
                    <button
                        className="lg:hidden interactive-lift"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Dropdown */}
            {mobileOpen && (
                <div className="pointer-events-auto lg:hidden fixed top-24 left-4 right-4 bg-brutal-bg/95 backdrop-blur-xl border-2 border-brutal-dark/10 rounded-3xl shadow-2xl p-6 z-50">
                    <div className="flex flex-col gap-4 font-data text-lg font-medium">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onTouchStart={() => prefetchRoute(link.to, link.prefetch)}
                                className="hover:text-brutal-red transition-colors py-2 border-b border-brutal-dark/10"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="border-t-2 border-brutal-dark/10 pt-4 mt-2" />
                        {user ? (
                            <>
                                <Link to="/dashboard" className="flex items-center gap-2 text-brutal-dark font-bold hover:text-brutal-red py-2">
                                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                                </Link>
                                {(user.role === 'mentor' || user.role === 'admin') && (
                                    <Link to="/mentor-dashboard" className="flex items-center gap-2 text-brutal-red font-bold hover:text-brutal-dark py-2">
                                        <Shield className="w-5 h-5" /> Mentor Panel
                                    </Link>
                                )}
                                <button onClick={handleSignOut} className="flex items-center gap-2 text-brutal-dark/60 hover:text-brutal-red py-2 font-bold text-left">
                                    <LogOut className="w-5 h-5" /> Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-brutal-dark font-bold hover:text-brutal-red py-2">Log In</Link>
                                <Link to="/register">
                                    <Button className="w-full">Join the Lab</Button>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
