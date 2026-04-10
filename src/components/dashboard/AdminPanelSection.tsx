import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../ui/Card';
import { supabase } from '../../lib/supabase';
import {
    Users,
    Award,
    Settings,
    Megaphone,
    Tag,
    UserCheck,
    Loader2,
} from 'lucide-react';

/**
 * §7 F-324 — Admin Panel with live stats, lazy-chunked out of Dashboard.tsx.
 *
 * Organised into two rows:
 *   Row 1 (core): Users, Mentors, Badges, Announcements — with live counts
 *   Row 2 (config): Store, Equipment, Tags — muted
 */

// ── Live admin stats hook ───────────────────────────────────────────────────
function useAdminStats() {
    const [stats, setStats] = useState({
        users: 0,
        mentors: 0,
        badges: 0,
        announcements: 0,
        loading: true,
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [users, mentors, badges, announcements] = await Promise.all([
                supabase.from('app_user').select('id', { count: 'exact', head: true }),
                supabase.from('app_user').select('id', { count: 'exact', head: true }).eq('role', 'mentor'),
                supabase.from('badge').select('id', { count: 'exact', head: true }),
                // 'announcement' table exists in DB but is not yet in database.types.ts — will be resolved by DB-24
                (supabase.from as any)('announcement').select('id', { count: 'exact', head: true }).eq('is_active', true),
            ]);
            if (!cancelled) {
                setStats({
                    users: users.count || 0,
                    mentors: mentors.count || 0,
                    badges: badges.count || 0,
                    announcements: announcements.count || 0,
                    loading: false,
                });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return stats;
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface AdminCardProps {
    title: string;
    blurb: string;
    to: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    stat?: number;
    statLabel?: string;
    statLoading?: boolean;
}

function AdminCard({ title, blurb, to, Icon, stat, statLabel, statLoading }: AdminCardProps) {
    return (
        <Link to={to} className="block group">
            <Card className="p-5 border-2 border-brutal-red/30 bg-brutal-red/[0.03] shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.25)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-brutal-red/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-brutal-red" aria-hidden />
                    </div>
                    <h3 className="font-heading font-bold text-base uppercase tracking-tight-heading flex-1">{title}</h3>
                </div>
                <p className="font-data text-xs text-brutal-dark/55 mb-3 flex-1 leading-relaxed">{blurb}</p>
                {/* Live stat */}
                {stat !== undefined && (
                    <div className="flex items-baseline gap-2 mb-3 pt-2 border-t border-brutal-dark/8">
                        {statLoading ? (
                            <Loader2 className="w-3.5 h-3.5 text-brutal-red/40 animate-spin" />
                        ) : (
                            <span className="font-heading font-bold text-2xl text-brutal-dark">{stat}</span>
                        )}
                        {statLabel && <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/40">{statLabel}</span>}
                    </div>
                )}
                <span className="inline-flex items-center rounded-full border-2 border-brutal-red/25 bg-brutal-bg px-3 py-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/60 group-hover:bg-brutal-dark group-hover:text-brutal-bg group-hover:border-brutal-dark transition-all duration-150 mt-auto self-start">
                    Manage
                </span>
            </Card>
        </Link>
    );
}

function ConfigCard({ title, blurb, to, Icon }: Omit<AdminCardProps, 'stat' | 'statLabel' | 'statLoading'>) {
    return (
        <Link to={to} className="block group">
            <Card className="p-4 border-2 border-brutal-dark/10 bg-brutal-dark/[0.03] flex flex-col h-full hover:border-brutal-dark/25 transition-colors duration-150">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-brutal-dark/40" aria-hidden />
                    <h3 className="font-data font-bold text-sm uppercase tracking-wider text-brutal-dark/70">{title}</h3>
                </div>
                <p className="font-data text-[11px] text-brutal-dark/45 mb-3 flex-1">{blurb}</p>
                <span className="inline-flex items-center rounded-full border border-brutal-dark/15 px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50 group-hover:text-brutal-dark group-hover:border-brutal-dark/30 transition-colors duration-150 mt-auto self-start">
                    Manage
                </span>
            </Card>
        </Link>
    );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function AdminPanelSection({ eyebrowNumber }: { eyebrowNumber?: string }) {
    const stats = useAdminStats();

    return (
        <section
            className="db-section"
            aria-labelledby="admin-panel-heading"
        >
            {eyebrowNumber && (
                <div className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-6">
                    {eyebrowNumber} Admin Panel
                </div>
            )}
            <div className="flex items-center gap-3 mb-8 border-b-2 border-brutal-dark/10 pb-4">
                <span className="bg-brutal-red text-brutal-bg px-3 py-1 text-[10px] font-bold font-data rounded-full uppercase tracking-widest">
                    Admin-only
                </span>
                <h2
                    id="admin-panel-heading"
                    className="font-heading text-3xl md:text-4xl font-bold uppercase tracking-tight-heading"
                >
                    System Control
                </h2>
            </div>

            {/* Row 1 — Core admin surfaces with live stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <AdminCard
                    title="Users"
                    blurb="Manage accounts, roles, and XP."
                    to="/admin/users"
                    Icon={Users}
                    stat={stats.users}
                    statLabel="registered"
                    statLoading={stats.loading}
                />
                <AdminCard
                    title="Mentors"
                    blurb="Assign domains, manage mentor roster."
                    to="/admin/mentors"
                    Icon={UserCheck}
                    stat={stats.mentors}
                    statLabel="active"
                    statLoading={stats.loading}
                />
                <AdminCard
                    title="Badges"
                    blurb="Mint achievement and domain badges."
                    to="/admin/badges"
                    Icon={Award}
                    stat={stats.badges}
                    statLabel="defined"
                    statLoading={stats.loading}
                />
                <AdminCard
                    title="Announcements"
                    blurb="Publish news and updates for the community."
                    to="/admin/announcements"
                    Icon={Megaphone}
                    stat={stats.announcements}
                    statLabel="active"
                    statLoading={stats.loading}
                />
            </div>

            {/* Row 2 — Config surfaces (low frequency) */}
            <div className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-4 pt-4 border-t border-brutal-dark/10">
                Configuration
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ConfigCard
                    title="Store"
                    blurb="Manage store products."
                    to="/admin/store"
                    Icon={Settings}
                />
                <ConfigCard
                    title="Equipment"
                    blurb="Lab tools & inductions."
                    to="/admin/equipment"
                    Icon={Settings}
                />
                <ConfigCard
                    title="Tags"
                    blurb="Organize content taxonomy."
                    to="/admin/tags"
                    Icon={Tag}
                />
                <ConfigCard
                    title="Inventory"
                    blurb="Track supplies & consumables."
                    to="/admin/inventory"
                    Icon={Settings}
                />
            </div>
        </section>
    );
}
