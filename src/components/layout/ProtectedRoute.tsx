import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../../lib/auth';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
    const { user, role, isLoading } = useAuth();
    const location = useLocation();

    // Don't block the whole page behind a text placeholder while auth
    // rehydrates. Render nothing for the brief window; the previous page
    // stays painted and transitions feel instant.
    if (isLoading) return null;

    if (!user) {
        // §1.5 F-105: round-trip the deep-link the user originally wanted.
        const target = `${location.pathname}${location.search}${location.hash}`;
        const safeTarget = target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
        const next = `/login?redirect=${encodeURIComponent(safeTarget)}`;
        return <Navigate to={next} replace />;
    }

    if (!allowedRoles.includes(role)) {
        if (role === 'viewer') {
            return (
                <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen flex items-center justify-center">
                    <div className="max-w-md text-center space-y-4">
                        <h2 className="font-heading font-bold text-3xl uppercase">Access Restricted</h2>
                        <p className="font-data text-brutal-dark/70">
                            Your account is currently set to Viewer. You must be inducted as a Maker to access this page. Please contact a Mentor or Admin.
                        </p>
                    </div>
                </div>
            );
        }
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
