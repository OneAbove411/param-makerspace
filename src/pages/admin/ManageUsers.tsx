import React, { useState } from 'react';
import { useAuth, type Role } from '../../lib/auth';
import { useAllUsers, useUserMutations } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Users, Shield, UserX, UserCheck } from 'lucide-react';

export function ManageUsers() {
    const { role } = useAuth();
    const { data: users, loading, refetch } = useAllUsers();
    const { updateRole, toggleActive } = useUserMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Only admins can access this page
    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const handleRoleChange = async (userId: string, newRole: Role) => {
        setActionLoading(userId);
        await updateRole(userId, newRole);
        await refetch();
        setActionLoading(null);
    };

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        await toggleActive(userId, !currentStatus);
        await refetch();
        setActionLoading(null);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading users...</div>;

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">Admin Panel</span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                    <Users className="w-10 h-10 text-brutal-red" />
                    User Management
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
                    Manage all user accounts, update roles (Maker, Mentor, Admin), and toggle account active status.
                </p>

                <Card className="overflow-hidden border-2 border-brutal-dark/10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-data">
                            <thead>
                                <tr className="bg-brutal-dark/5 border-b-2 border-brutal-dark/10">
                                    <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">User</th>
                                    <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">Role</th>
                                    <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">Status</th>
                                    <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brutal-dark/5">
                                {users?.map((u) => (
                                    <tr key={u.id} className="hover:bg-brutal-dark/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-brutal-dark/10 rounded-full flex items-center justify-center font-heading font-bold overflow-hidden border-2 border-brutal-dark">
                                                    {u.profile?.avatar_url ? (
                                                        <img src={u.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        u.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-brutal-dark">{u.name}</div>
                                                    <div className="text-sm text-brutal-dark/60">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                className="bg-transparent border border-brutal-dark/20 rounded px-2 py-1 text-sm font-bold disabled:opacity-50"
                                                value={u.role}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                                                disabled={actionLoading === u.id}
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="maker">Maker</option>
                                                <option value="mentor">Mentor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            {u.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-green-100 text-green-800 rounded">
                                                    <UserCheck className="w-3 h-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-800 rounded">
                                                    <UserX className="w-3 h-3" /> Suspended
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleToggleActive(u.id, u.is_active)}
                                                disabled={actionLoading === u.id}
                                                className={`text-sm font-bold flex items-center gap-1 ml-auto px-3 py-1 rounded transition-colors ${
                                                    u.is_active 
                                                        ? 'text-brutal-red hover:bg-brutal-red/10' 
                                                        : 'text-green-600 hover:bg-green-600/10'
                                                }`}
                                            >
                                                <Shield className="w-4 h-4" />
                                                {actionLoading === u.id ? '...' : (u.is_active ? 'Suspend' : 'Activate')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
