import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../../lib/auth';

export function ProtectedRoute({ allowedRoles }: { allowedRoles: Role[] }) {
    const { user, role, isLoading } = useAuth();

    if (isLoading) return <div className="p-20 font-data w-full flex justify-center mt-20">Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
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
