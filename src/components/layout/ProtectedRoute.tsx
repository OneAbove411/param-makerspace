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
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
