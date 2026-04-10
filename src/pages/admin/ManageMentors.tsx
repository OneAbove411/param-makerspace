import React, { useState } from 'react';
import { useAuth, type Role } from '../../lib/auth';
import { useSupabaseQuery } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GraduationCap, Search, Shield, ChevronDown, X, Globe } from 'lucide-react';
import type { AppUser, MakerProfile } from '../../lib/database.types';

// Canonical maker-domain chip set
const MAKER_DOMAINS = [
    'Electronics',
    'Robotics',
    'AI',
    'Software',
    'Web Dev',
    'Game Dev',
    'IoT',
    '3D Printing',
    'CNC',
    'Woodwork',
    'Metalwork',
] as const;

type EnrichedMentor = AppUser & {
    profile: (MakerProfile & {
        mentor_domains?: string | null;
        approval_domains?: string | null;
    }) | null;
    mentorCount?: number;
};

function useMentorsData() {
    return useSupabaseQuery<EnrichedMentor[]>(
        async () => {
            // Fetch mentors and admins from app_user
            const { data: users, error } = await supabase
                .from('app_user')
                .select('id, auth_id, email, name, role, is_active, created_at, updated_at')
                .in('role', ['mentor', 'admin'])
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ManageMentors] app_user fetch error:', error);
                return { data: [], error };
            }
            if (!users || users.length === 0) {
                return { data: [], error: null };
            }

            const userIds = (users as any[]).map((u) => u.id);

            // Fetch profiles with mentor/approval domains
            const { data: profiles, error: profileError } = await supabase
                .from('maker_profile')
                .select('id, user_id, display_name, avatar_url, mentor_domains, approval_domains')
                .in('user_id', userIds);

            if (profileError) {
                console.error('[ManageMentors] maker_profile fetch error:', profileError);
            }

            const profileMap: Record<string, any> = {};
            for (const p of profiles || []) {
                profileMap[(p as any).user_id] = p;
            }

            // Fetch mentoring counts
            const mentorCounts: Record<string, number> = {};
            for (const mentorId of userIds) {
                const { count, error: countError } = await supabase
                    .from('project_member')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', mentorId)
                    .ilike('role', '%mentor%');

                if (!countError && count !== null) {
                    mentorCounts[mentorId] = count;
                }
            }

            const enriched = (users as any[]).map((u) => ({
                ...u,
                profile: profileMap[u.id] ?? null,
                mentorCount: mentorCounts[u.id] ?? 0,
            }));

            return { data: enriched, error: null };
        },
        []
    );
}

function parseChips(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function chipsToString(chips: string[]): string {
    return chips.join(', ');
}

export function ManageMentors() {
    const { role } = useAuth();
    const { data: mentors, loading, error, refetch } = useMentorsData();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDomain, setFilterDomain] = useState('');
    const [editingMentor, setEditingMentor] = useState<EnrichedMentor | null>(null);
    const [editMentorDomains, setEditMentorDomains] = useState<string[]>([]);
    const [editApprovalDomains, setEditApprovalDomains] = useState<string[]>([]);

    if (role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Admin Only
            </div>
        );
    }

    const filtered = (mentors || []).filter((m) => {
        const matchesSearch =
            !searchTerm ||
            m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDomain =
            !filterDomain ||
            parseChips(m.profile?.mentor_domains).includes(filterDomain);

        return matchesSearch && matchesDomain;
    });

    const handleRoleChange = async (mentorId: string, newRole: Role) => {
        setActionLoading(mentorId);
        const { error } = await supabase
            .from('app_user')
            .update({ role: newRole })
            .eq('id', mentorId);

        if (error) {
            console.error('Role update failed:', error);
        } else if (newRole === 'mentor') {
            try {
                const { onMentorRoleGranted } = await import('../../lib/badgeEngine');
                await onMentorRoleGranted(mentorId);
            } catch (err) {
                console.error('Failed to award mentor badge', err);
            }
        }

        await refetch();
        setActionLoading(null);
    };

    const handleToggleActive = async (mentorId: string, currentStatus: boolean) => {
        setActionLoading(mentorId);
        const { error } = await supabase
            .from('app_user')
            .update({ is_active: !currentStatus })
            .eq('id', mentorId);
        if (error) console.error('Toggle active failed:', error);
        await refetch();
        setActionLoading(null);
    };

    const handleEditDomains = (mentor: EnrichedMentor) => {
        setEditingMentor(mentor);
        setEditMentorDomains(parseChips(mentor.profile?.mentor_domains));
        setEditApprovalDomains(parseChips(mentor.profile?.approval_domains));
    };

    const handleSaveDomains = async () => {
        if (!editingMentor?.profile) return;
        setActionLoading(editingMentor.id);

        const { error } = await supabase
            .from('maker_profile')
            .update({
                mentor_domains: chipsToString(editMentorDomains),
                approval_domains: chipsToString(editApprovalDomains),
            })
            .eq('id', editingMentor.profile.id);

        if (error) {
            console.error('Domain update failed:', error);
        } else {
            setEditingMentor(null);
            await refetch();
        }
        setActionLoading(null);
    };

    const toggleDomain = (domain: string, isApproval: boolean) => {
        if (isApproval) {
            setEditApprovalDomains((prev) =>
                prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
            );
        } else {
            setEditMentorDomains((prev) =>
                prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
            );
        }
    };

    if (loading) {
        return (
            <div className="p-24 flex justify-center font-data">
                Loading mentors...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
                <div className="max-w-2xl mx-auto">
                    <div className="p-8 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-2xl">
                        <h2 className="font-heading font-bold text-2xl text-brutal-red mb-4 uppercase">
                            Failed to Load Mentors
                        </h2>
                        <p className="font-data text-sm text-brutal-dark/80 mb-6">
                            Error: <code className="bg-brutal-dark/10 px-2 py-1 rounded">{error}</code>
                        </p>
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
                    <GraduationCap className="w-10 h-10 text-brutal-red" />
                    Mentor Management
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mb-8">
                    Manage mentor accounts, assign expertise domains, and track mentoring activity.
                </p>

                {/* Search and filter bar */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-dark/40" />
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={filterDomain}
                        onChange={(e) => setFilterDomain(e.target.value)}
                        className="bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded font-data text-sm font-bold focus:outline-none focus:border-brutal-dark transition-colors min-w-[180px]"
                    >
                        <option value="">All Domains</option>
                        {MAKER_DOMAINS.map((domain) => (
                            <option key={domain} value={domain}>
                                {domain}
                            </option>
                        ))}
                    </select>
                </div>

                {mentors && mentors.length === 0 && (
                    <div className="p-12 bg-yellow-50 border-2 border-yellow-400/50 rounded-2xl text-center">
                        <h3 className="font-heading font-bold text-2xl text-yellow-800 uppercase mb-3">
                            No Mentors Found
                        </h3>
                        <p className="font-data text-sm text-yellow-800/70 max-w-lg mx-auto">
                            No users with mentor or admin roles yet.
                        </p>
                    </div>
                )}

                {mentors && mentors.length > 0 && filtered.length === 0 && (
                    <div className="p-8 bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-2xl text-center">
                        <p className="font-data text-sm text-brutal-dark/60">
                            No mentors match your search or filter.
                        </p>
                    </div>
                )}

                {filtered.length > 0 && (
                    <Card className="overflow-hidden border-2 border-brutal-dark">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-data">
                                <thead>
                                    <tr className="bg-brutal-dark text-brutal-bg border-b-2 border-brutal-dark/10">
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Mentor
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Role
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Status
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Mentor Domains
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest">
                                            Mentoring Activity
                                        </th>
                                        <th className="p-4 font-bold text-[10px] uppercase text-brutal-bg tracking-widest text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brutal-dark/10">
                                    {filtered.map((m: EnrichedMentor) => (
                                        <tr
                                            key={m.id}
                                            className="hover:bg-brutal-dark/5 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brutal-dark/10 rounded-full flex items-center justify-center font-heading font-bold overflow-hidden border-2 border-brutal-dark flex-shrink-0">
                                                        {m.profile?.avatar_url ? (
                                                            <img
                                                                src={m.profile.avatar_url}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            (m.name || m.email || '?').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-brutal-dark truncate">
                                                            {m.profile?.display_name || m.name || '(no name)'}
                                                        </div>
                                                        <div className="text-sm text-brutal-dark/60 truncate max-w-[200px]">
                                                            {m.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <select
                                                    className="bg-transparent border-2 border-brutal-dark rounded px-2 py-1 text-sm font-bold disabled:opacity-50 focus:outline-none focus:border-brutal-red"
                                                    value={m.role}
                                                    onChange={(e) =>
                                                        handleRoleChange(m.id, e.target.value as Role)
                                                    }
                                                    disabled={actionLoading === m.id}
                                                >
                                                    <option value="maker">Maker</option>
                                                    <option value="mentor">Mentor</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>

                                            <td className="p-4">
                                                {m.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-green-100 text-green-800 rounded">
                                                        <Globe className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-red-100 text-red-800 rounded">
                                                        <Shield className="w-3 h-3" /> Suspended
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {parseChips(m.profile?.mentor_domains).length > 0 ? (
                                                        parseChips(m.profile?.mentor_domains).map((d) => (
                                                            <span
                                                                key={d}
                                                                className="inline-block text-xs px-2 py-1 bg-brutal-dark/10 text-brutal-dark rounded font-bold"
                                                            >
                                                                {d}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-brutal-dark/50 italic">
                                                            None assigned
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <span className="text-sm font-bold text-brutal-dark/70">
                                                    {m.mentorCount} projects
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditDomains(m)}
                                                        className="text-sm font-bold text-brutal-dark/60 hover:text-brutal-dark hover:bg-brutal-dark/5 px-3 py-1 rounded transition-colors"
                                                        title="Edit domains"
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(m.id, m.is_active)}
                                                        disabled={actionLoading === m.id}
                                                        className={`text-sm font-bold flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                                                            m.is_active
                                                                ? 'text-brutal-red hover:bg-brutal-red/10'
                                                                : 'text-green-600 hover:bg-green-600/10'
                                                        }`}
                                                    >
                                                        <Shield className="w-4 h-4" />
                                                        {actionLoading === m.id
                                                            ? '...'
                                                            : m.is_active
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

                {/* Domain editor modal */}
                {editingMentor && (
                    <div className="fixed inset-0 bg-brutal-bg/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-2xl p-6 border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(20,20,20,0.08)] relative">
                            <button
                                onClick={() => setEditingMentor(null)}
                                className="absolute top-4 right-4 text-brutal-dark/50 hover:text-brutal-dark"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="font-heading font-bold text-2xl uppercase tracking-tight-heading mb-6">
                                Edit Mentor Domains
                            </h2>
                            <p className="font-data text-sm mb-6 text-brutal-dark/70">
                                Assigning domains to{' '}
                                <strong className="text-brutal-dark">
                                    {editingMentor.profile?.display_name || editingMentor.name}
                                </strong>
                            </p>

                            <div className="space-y-6">
                                {/* Mentor Domains */}
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-3 block">
                                        Mentor Domains (can mentor in)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {MAKER_DOMAINS.map((domain) => (
                                            <button
                                                key={domain}
                                                type="button"
                                                onClick={() => toggleDomain(domain, false)}
                                                className={`px-3 py-2 rounded font-data text-sm font-bold transition-colors ${
                                                    editMentorDomains.includes(domain)
                                                        ? 'bg-brutal-dark text-white'
                                                        : 'bg-brutal-dark/10 text-brutal-dark hover:bg-brutal-dark/20'
                                                }`}
                                            >
                                                {domain}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Approval Domains */}
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-3 block">
                                        Approval Domains (can approve in)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {MAKER_DOMAINS.map((domain) => (
                                            <button
                                                key={domain}
                                                type="button"
                                                onClick={() => toggleDomain(domain, true)}
                                                className={`px-3 py-2 rounded font-data text-sm font-bold transition-colors ${
                                                    editApprovalDomains.includes(domain)
                                                        ? 'bg-brutal-red text-white'
                                                        : 'bg-brutal-dark/10 text-brutal-dark hover:bg-brutal-dark/20'
                                                }`}
                                            >
                                                {domain}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex justify-end gap-3 border-t-2 border-brutal-dark/10">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setEditingMentor(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!!actionLoading}
                                    onClick={handleSaveDomains}
                                >
                                    {actionLoading === editingMentor.id ? 'Saving...' : 'Save Domains'}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
