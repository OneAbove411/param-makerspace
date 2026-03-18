import React, { useState } from 'react';
import { useAuth, type Role } from '../../lib/auth';
import { useSupabaseQuery } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Users, Shield, UserX, UserCheck, Edit3, X } from 'lucide-react';
import type { AppUser, MakerProfile } from '../../lib/database.types';

// ─── Isolated data fetching — does NOT rely on useAllUsers from hooks.ts ───
// This avoids the silent-empty-result bug caused by:
// 1. Selecting xp/rank/rank_override columns before the migration runs
// 2. Ambiguous FK join syntax in PostgREST (profile:maker_profile vs maker_profile!user_id)
function useManageUsersData() {
    return useSupabaseQuery<(AppUser & { profile: MakerProfile | null })[]>(
        async () => {
            // Fetch core user data — columns guaranteed to exist in schema
            const { data: users, error } = await supabase
                .from('app_user')
                .select('id, auth_id, email, name, role, is_active, created_at, updated_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ManageUsers] app_user fetch error:', error);
                return { data: [], error };
            }
            if (!users || users.length === 0) {
                console.warn('[ManageUsers] app_user returned 0 rows — check RLS policies');
                return { data: [], error: null };
            }

            const userIds = (users as any[]).map((u) => u.id);

            // Fetch XP/rank columns separately — these only exist after migration
            let xpMap: Record<string, { xp: number; rank: string; rank_override: boolean }> = {};
            const { data: xpData, error: xpError } = await supabase
                .from('app_user')
                .select('id, xp, rank, rank_override')
                .in('id', userIds);

            if (xpError) {
                // Columns don't exist yet — migration pending, that's OK
                console.warn('[ManageUsers] xp/rank columns not found (migration pending?):', xpError.message);
            } else {
                for (const row of xpData as any[]) {
                    xpMap[row.id] = {
                        xp: row.xp ?? 0,
                        rank: row.rank ?? 'Curious',
                        rank_override: row.rank_override ?? false,
                    };
                }
            }

            // Fetch profiles — explicit .in() avoids PostgREST FK ambiguity
            const { data: profiles, error: profileError } = await supabase
                .from('maker_profile')
                .select('id, user_id, display_name, avatar_url, is_public')
                .in('user_id', userIds);

            if (profileError) {
                console.error('[ManageUsers] maker_profile fetch error:', profileError);
            }

            const profileMap: Record<string, any> = {};
            for (const p of profiles || []) {
                profileMap[(p as any).user_id] = p;
            }

            const enriched = (users as any[]).map((u) => ({
                ...u,
                xp: xpMap[u.id]?.xp ?? 0,
                rank: xpMap[u.id]?.rank ?? 'Curious',
                rank_override: xpMap[u.id]?.rank_override ?? false,
                profile: profileMap[u.id] ?? null,
            }));

            return { data: enriched, error: null };
        },
        []
    );
}

export function ManageUsers() {
    const { role } = useAuth();
    const { data: users, loading, error, refetch } = useManageUsersData();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [xpForm, setXpForm] = useState({ xp: 0, rank: 'Curious', rankOverride: false });

    if (role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Admin Only
            </div>
        );
    }

    const handleRoleChange = async (userId: string, newRole: Role) => {
        setActionLoading(userId);
        const { error } = await supabase
            .from('app_user')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            console.error('Role update failed:', error);
        } else if (newRole === 'mentor' || newRole === 'admin') {
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
        const { error } = await supabase
            .from('app_user')
            .update({ is_active: !currentStatus })
            .eq('id', userId);
        if (error) console.error('Toggle active failed:', error);
        await refetch();
        setActionLoading(null);
    };

    const handleOpenEditXP = (user: any) => {
        setEditingUser(user);
        setXpForm({
            xp: user.xp || 0,
            rank: user.rank || 'Curious',
            rankOverride: !!user.rank_override,
        });
    };

    const handleSaveXP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setActionLoading(editingUser.id);

        // Only update xp/rank if columns exist — catch gracefully
        const { error } = await supabase
            .from('app_user')
            .update({
                xp: xpForm.xp,
                rank: xpForm.rank,
                rank_override: xpForm.rankOverride,
            } as any)
            .eq('id', editingUser.id);

        if (error) {
            console.error('XP/Rank update failed:', error);
            alert(
                error.message.includes('column')
                    ? 'XP/Rank columns not found — please run the migration SQL first.'
                    : 'Failed to update XP/Rank: ' + error.message
            );
        } else {
            setEditingUser(null);
            await refetch();
        }
        setActionLoading(null);
    };

    if (loading) {
        return (
            <div className="p-24 flex justify-center font-data">
                Loading users...
            </div>
        );
    }

    // Show a helpful error if something went wrong
    if (error) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
                <div className="max-w-2xl mx-auto">
                    <div className="p-8 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-2xl">
                        <h2 className="font-heading font-bold text-2xl text-brutal-red mb-4 uppercase">
                            Failed to Load Users
                        </h2>
                        <p className="font-data text-sm text-brutal-dark/80 mb-4">
                            Error: <code className="bg-brutal-dark/10 px-2 py-1 rounded">{error}</code>
                        </p>
                        <p className="font-data text-sm text-brutal-dark/60 mb-6">
                            This usually means the RLS policy on <code>app_user</code> is blocking admin reads,
                            or the <code>get_my_role()</code> function isn't returning 'admin' for your session.
                        </p>
                        <div className="space-y-2 font-data text-xs text-brutal-dark/50">
                            <p>Run this in your Supabase SQL editor to verify:</p>
                            <pre className="bg-brutal-dark/10 p-3 rounded overflow-auto">
                                {`SELECT get_my_role();
-- Should return 'admin' when you run it while logged in as your account`}
                            </pre>
                        </div>
                        <Button onClick={() => refetch()} className="mt-6">
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        Admin Panel
                    </span>
                    <Link
                        to="/dashboard"
                        className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                    <Users className="w-10 h-10 text-brutal-red" />
                    User Management
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
                    Manage all user accounts, update roles (Maker, Mentor, Admin), and
                    toggle account active status.
                </p>

                {/* Zero-state — table loaded but empty */}
                {users && users.length === 0 && (
                    <div className="p-12 bg-yellow-50 border-2 border-yellow-400/50 rounded-2xl text-center">
                        <h3 className="font-heading font-bold text-2xl text-yellow-800 uppercase mb-3">
                            No Users Found
                        </h3>
                        <p className="font-data text-sm text-yellow-800/70 max-w-lg mx-auto mb-4">
                            The query ran successfully but returned 0 rows. This is almost
                            always a Supabase RLS policy issue — the{' '}
                            <code className="bg-yellow-200 px-1 rounded">admin_all</code> policy
                            on <code className="bg-yellow-200 px-1 rounded">app_user</code> may
                            not be active, or{' '}
                            <code className="bg-yellow-200 px-1 rounded">get_my_role()</code>{' '}
                            isn't returning 'admin' for your session.
                        </p>
                        <p className="font-data text-xs text-yellow-800/50 mb-4">
                            Run in Supabase SQL Editor:{' '}
                            <code className="bg-yellow-200 px-1 rounded">
                                SELECT get_my_role();
                            </code>
                        </p>
                        <Button onClick={() => refetch()} variant="outline">
                            Retry
                        </Button>
                    </div>
                )}

                {users && users.length > 0 && (
                    <Card className="overflow-hidden border-2 border-brutal-dark/10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-data">
                                <thead>
                                    <tr className="bg-brutal-dark/5 border-b-2 border-brutal-dark/10">
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">
                                            User
                                        </th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">
                                            Role
                                        </th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">
                                            Status
                                        </th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider">
                                            Rank / XP
                                        </th>
                                        <th className="p-4 font-bold text-sm uppercase text-brutal-dark/60 tracking-wider text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brutal-dark/5">
                                    {users.map((u: any) => (
                                        <tr
                                            key={u.id}
                                            className="hover:bg-brutal-dark/5 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brutal-dark/10 rounded-full flex items-center justify-center font-heading font-bold overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                                        {u.profile?.avatar_url ? (
                                                            <img
                                                                src={u.profile.avatar_url}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            (u.name || u.email || '?').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-brutal-dark truncate">
                                                            {u.name || '(no name)'}
                                                        </div>
                                                        <div className="text-sm text-brutal-dark/60 truncate max-w-[200px]">
                                                            {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <select
                                                    className="bg-transparent border border-brutal-dark/20 rounded px-2 py-1 text-sm font-bold disabled:opacity-50 focus:outline-none focus:border-brutal-red"
                                                    value={u.role}
                                                    onChange={(e) =>
                                                        handleRoleChange(u.id, e.target.value as Role)
                                                    }
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
                                                    <span>{u.rank ?? 'Curious'}</span>
                                                    <span className="text-brutal-dark/50">
                                                        ({u.xp ?? 0} XP)
                                                    </span>
                                                    {u.rank_override && (
                                                        <span className="bg-yellow-200 text-yellow-800 px-1 rounded text-[10px] uppercase">
                                                            Override
                                                        </span>
                                                    )}
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
                                                        className={`text-sm font-bold flex items-center gap-1 px-3 py-1 rounded transition-colors ${u.is_active
                                                                ? 'text-brutal-red hover:bg-brutal-red/10'
                                                                : 'text-green-600 hover:bg-green-600/10'
                                                            }`}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        {actionLoading === u.id
                                                            ? '...'
                                                            : u.is_active
                                                                ? 'Suspend'
                                                                : 'Activate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* XP/Rank edit modal */}
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
                                Modifying data for{' '}
                                <strong className="text-brutal-dark">{editingUser.name}</strong>
                            </p>

                            <form onSubmit={handleSaveXP} className="space-y-4">
                                <Input
                                    label="XP Amount"
                                    type="number"
                                    value={xpForm.xp.toString()}
                                    onChange={(e) =>
                                        setXpForm({ ...xpForm, xp: parseInt(e.target.value) || 0 })
                                    }
                                    required
                                />

                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                        Rank Tier
                                    </label>
                                    <select
                                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark transition-colors"
                                        value={xpForm.rank}
                                        onChange={(e) =>
                                            setXpForm({ ...xpForm, rank: e.target.value })
                                        }
                                        required
                                    >
                                        <option value="Curious">Curious (0 XP)</option>
                                        <option value="Tinkerer">Tinkerer (60 XP)</option>
                                        <option value="Builder">Builder (250 XP)</option>
                                        <option value="Maker">Maker (600 XP)</option>
                                        <option value="Innovator">Innovator (1200 XP)</option>
                                        <option value="Lab Pro">Lab Pro (2500 XP)</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 py-2">
                                    <input
                                        type="checkbox"
                                        id="rankOverride"
                                        checked={xpForm.rankOverride}
                                        onChange={(e) =>
                                            setXpForm({ ...xpForm, rankOverride: e.target.checked })
                                        }
                                        className="w-4 h-4 accent-brutal-red"
                                    />
                                    <label
                                        htmlFor="rankOverride"
                                        className="font-data text-sm font-bold cursor-pointer"
                                    >
                                        Manual Override (Ignore XP engine calculations)
                                    </label>
                                </div>

                                <div className="pt-4 flex justify-end gap-3 border-t-2 border-brutal-dark/10">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => setEditingUser(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={!!actionLoading}>
                                        {actionLoading === editingUser.id
                                            ? 'Saving...'
                                            : 'Save Changes'}
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