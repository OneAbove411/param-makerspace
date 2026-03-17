import React, { useState } from 'react';
import { useAuth, type Role } from '../../lib/auth';
import { useAllUsers, useUserMutations } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Users, Shield, UserX, UserCheck, Edit3, X } from 'lucide-react';

export function ManageUsers() {
    const { role } = useAuth();
    const { data: users, loading, refetch } = useAllUsers();
    const { updateRole, toggleActive, updateXPAndRank } = useUserMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Editing Rank/XP Modal State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [xpForm, setXpForm] = useState({ xp: 0, rank: 'Curious', rankOverride: false });

    // Only admins can access this page
    if (role !== 'admin') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied: Admin Only</div>;
    }

    const handleRoleChange = async (userId: string, newRole: Role) => {
        setActionLoading(userId);
        await updateRole(userId, newRole);
        
        if (newRole === 'mentor' || newRole === 'admin') {
            try {
                const { onMentorRoleGranted } = await import('../../lib/badgeEngine');
                await onMentorRoleGranted(userId);
            } catch (err) {
                console.error('Failed to award mentor badge', err);
            }
        }
        
        await refetch();
        setActionLoading(null);
    };

    const handleToggleActive = async (userId: string, currentStatus: boolean) => {
        setActionLoading(userId);
        await toggleActive(userId, !currentStatus);
        await refetch();
        setActionLoading(null);
    };

    const handleOpenEditXP = (user: any) => {
        setEditingUser(user);
        setXpForm({ xp: user.xp || 0, rank: user.rank || 'Curious', rankOverride: !!user.rank_override });
    };

    const handleSaveXP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setActionLoading(editingUser.id);
        const { error } = await updateXPAndRank(editingUser.id, xpForm.xp, xpForm.rank, xpForm.rankOverride);
        if (!error) {
            setEditingUser(null);
            await refetch();
        } else {
            alert('Failed to update XP/Rank');
        }
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
                                    <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">Rank / XP</th>
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
                                        <td className="p-4 text-sm font-bold">
                                            <div className="flex items-center gap-2">
                                                <span>{u.rank}</span>
                                                <span className="text-brutal-dark/50">({u.xp} XP)</span>
                                                {u.rank_override && <span className="bg-yellow-200 text-yellow-800 px-1 rounded text-[10px] uppercase">Override</span>}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditXP(u)}
                                                    className="p-2 text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/5 rounded transition-colors"
                                                    title="Edit XP & Rank"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {editingUser && (
                    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-md p-6 border-2 border-brutal-dark shadow-2xl relative">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            
                            <h2 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
                                Update Rank & XP
                            </h2>
                            <p className="font-data text-sm mb-6 text-brutal-dark/70">
                                Modifying data for <strong className="text-brutal-dark">{editingUser.name}</strong>
                            </p>

                            <form onSubmit={handleSaveXP} className="space-y-4">
                                <Input
                                    label="XP Amount"
                                    type="number"
                                    value={xpForm.xp.toString()}
                                    onChange={(e) => setXpForm({ ...xpForm, xp: parseInt(e.target.value) || 0 })}
                                    required
                                />
                                
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">Rank Tier</label>
                                    <select
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors"
                                        value={xpForm.rank}
                                        onChange={(e) => setXpForm({ ...xpForm, rank: e.target.value })}
                                        required
                                    >
                                        <option value="Curious">Curious (0 XP)</option>
                                        <option value="Tinkerer">Tinkerer (1000 XP)</option>
                                        <option value="Builder">Builder (3000 XP)</option>
                                        <option value="Maker">Maker (6000 XP)</option>
                                        <option value="Innovator">Innovator (10000 XP)</option>
                                        <option value="Lab Pro">Lab Pro (Custom)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        id="rankOverride"
                                        checked={xpForm.rankOverride}
                                        onChange={(e) => setXpForm({ ...xpForm, rankOverride: e.target.checked })}
                                        className="w-4 h-4 accent-brutal-red"
                                    />
                                    <label htmlFor="rankOverride" className="font-data text-sm font-bold cursor-pointer">
                                        Manual Override (Ignore XP engine calculations)
                                    </label>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t-2 border-brutal-dark/10">
                                    <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={!!actionLoading}>
                                        {actionLoading === editingUser.id ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
