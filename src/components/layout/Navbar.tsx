import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useAuth } from '../../lib/auth';
import { LogOut, LayoutDashboard, Menu, X } from 'lucide-react';
// ParamLogo removed from navbar per redesign
import { useRankAccess } from '../../lib/hooks';
import { RankBadge } from '../ui/RankBadge';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
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
    }, [location.pathname]);

    const handleSignOut = () => {
        signOut(); // State clears instantly (setUser(null) is synchronous in signOut)
        navigate('/', { replace: true });
    };

    const navLinks = [
        { to: '/projects', label: 'Projects' },
        { to: '/challenges', label: 'Explorer Hub' },
        { to: '/events', label: 'Events' },
        { to: '/makers', label: 'Makers' },
        { to: '/badges', label: 'Badges' },
        { to: '/store', label: 'Store' },
    ];

    return (
        <header className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <nav
                className={cn(
                    "pointer-events-auto flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500 w-full max-w-5xl",
                    scrolled || !isHome
                        ? "bg-brutal-bg/80 backdrop-blur-xl border-2 border-brutal-dark/10 shadow-lg text-brutal-dark"
                        : "bg-transparent text-brutal-bg"
                )}
            >
                <Link to="/" className="font-heading font-bold tracking-tight-heading flex flex-col items-start leading-none interactive-lift">
                    <span className="text-xl">PARAM</span>
                    <span className={cn(
                        "font-data text-[9px] uppercase tracking-[0.25em] font-bold -mt-0.5",
                        (scrolled || !isHome) ? "text-brutal-dark/40" : "text-brutal-bg/40"
                    )}>makersadda</span>
                </Link>

                <div className="hidden lg:flex items-center gap-6 font-data font-medium text-sm">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
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
                    {!isLoading && user ? (
                        <>
                            {rankAccess?.rank && (
                                <RankBadge rank={rankAccess.rank} xp={rankAccess.xp} variant="pill" className="hidden md:inline-flex" />
                            )}
                            <Link
                                to="/dashboard"
                                className="hidden sm:flex items-center gap-2 font-data text-sm font-bold hover:text-brutal-red interactive-lift"
                            >
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-brutal-dark border-2 border-brutal-dark/20 flex items-center justify-center flex-shrink-0">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-data text-[10px] font-bold text-brutal-bg">
                                            {user.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                {user.name?.split(' ')[0]}
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className={cn(
                                    "hidden sm:flex items-center gap-1 font-data text-xs font-bold px-3 py-2 rounded-full transition-colors interactive-lift border-2",
                                    (scrolled || !isHome)
                                        ? "text-brutal-dark/70 hover:text-brutal-red border-brutal-dark/10 hover:border-brutal-red/30"
                                        : "text-brutal-bg/70 hover:text-brutal-bg border-brutal-bg/20 hover:border-brutal-bg/40"
                                )}
                            >
                                <LogOut className="w-3 h-3" /> Sign Out
                            </button>
                        </>
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
                            <Link key={link.to} to={link.to} className="hover:text-brutal-red transition-colors py-2 border-b border-brutal-dark/10">
                                {link.label}
                            </Link>
                        ))}
                        <div className="border-t-2 border-brutal-dark/10 pt-4 mt-2" />
                        {user ? (
                            <>
                                <Link to="/dashboard" className="flex items-center gap-2 text-brutal-dark font-bold hover:text-brutal-red py-2">
                                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                                </Link>
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
