import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import {
    ClipboardCheck,
    Trophy,
    Globe,
    Calendar,
    Settings,
    Zap,
    Loader2,
} from 'lucide-react';

/**
 * §7 F-313 — Mentor Tools split into two visually-weighted rows:
 *
 *   Row 1 (high attention): Review Queue — with LIVE pending counts
 *     Project Reviews / Challenge Verification / Event Submissions /
 *     Website Submissions
 *     Rendered with the yellow brutalist border, larger typography,
 *     and a count badge showing how many items await action.
 *
 *   Row 2 (low frequency): Lab Admin
 *     Event Management / Lab Inventory / Challenges / Projects
 *     Rendered muted (dark/5 bg, thinner border, smaller title) because
 *     these are configuration surfaces, not queues.
 *
 * §7 F-324 — Code-split via `React.lazy()` in Dashboard.tsx.
 */

// ── Live queue counts hook ──────────────────────────────────────────────────
function useQueueCounts() {
    const [counts, setCounts] = useState({
        projects: 0,
        challenges: 0,
        eventSubs: 0,
        websites: 0,
        loading: true,
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [projects, challenges, eventSubs, websites] = await Promise.all([
                supabase.from('project').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
                supabase.from('challenge_completion').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
                supabase.from('event_submission').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'shortlisted']),
                supabase.from('event_website').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            ]);
            if (!cancelled) {
                setCounts({
                    projects: projects.count || 0,
                    challenges: challenges.count || 0,
                    eventSubs: eventSubs.count || 0,
                    websites: websites.count || 0,
                    loading: false,
                });
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return counts;
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface ReviewCardProps {
    title: string;
    blurb: string;
    to: string;
    cta: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    count?: number;
    countLoading?: boolean;
}

function ReviewCard({ title, blurb, to, cta, Icon, count, countLoading }: ReviewCardProps) {
    return (
        <Link to={to} className="block group">
            <Card className="p-5 border-2 border-yellow-500/50 bg-yellow-500/5 shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] hover:shadow-[8px_8px_0_0_rgba(234,179,8,0.28)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-yellow-700" aria-hidden />
                    </div>
                    <h3 className="font-heading font-bold text-base uppercase tracking-tight-heading flex-1">{title}</h3>
                    {/* Live count badge */}
                    {countLoading ? (
                        <Loader2 className="w-3.5 h-3.5 text-yellow-600/50 animate-spin" />
                    ) : count !== undefined && count > 0 ? (
                        <span className="bg-yellow-500 text-brutal-dark px-2 py-0.5 text-[10px] font-bold font-data rounded-full min-w-[24px] text-center">
                            {count}
                        </span>
                    ) : (
                        <span className="font-data text-[10px] text-brutal-dark/30 font-bold">0</span>
                    )}
                </div>
                <p className="font-data text-xs text-brutal-dark/55 mb-4 flex-1 leading-relaxed">{blurb}</p>
                <div className="mt-auto">
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-yellow-500/40 bg-brutal-bg px-3 py-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/60 group-hover:bg-brutal-dark group-hover:text-brutal-bg group-hover:border-brutal-dark transition-all duration-150">
                        {cta}
                    </span>
                </div>
            </Card>
        </Link>
    );
}

interface AdminCardProps {
    title: string;
    blurb: string;
    to: string;
    cta: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

function AdminCard({ title, blurb, to, cta, Icon }: AdminCardProps) {
    return (
        <Link to={to} className="block group">
            <Card className="p-4 border-2 border-brutal-dark/10 bg-brutal-dark/[0.03] flex flex-col h-full hover:border-brutal-dark/25 transition-colors duration-150">
                <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-brutal-dark/40" aria-hidden />
                    <h3 className="font-data font-bold text-sm uppercase tracking-wider text-brutal-dark/70">{title}</h3>
                </div>
                <p className="font-data text-[11px] text-brutal-dark/45 mb-3 flex-1">{blurb}</p>
                <span className="inline-flex items-center rounded-full border border-brutal-dark/15 px-2.5 py-1 font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/50 group-hover:text-brutal-dark group-hover:border-brutal-dark/30 transition-colors duration-150 mt-auto self-start">
                    {cta}
                </span>
            </Card>
        </Link>
    );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function MentorToolsSection({ eyebrowNumber }: { eyebrowNumber?: string }) {
    const queue = useQueueCounts();
    const totalPending = queue.projects + queue.challenges + queue.eventSubs + queue.websites;

    return (
        <section
            className="db-section"
            aria-labelledby="mentor-tools-heading"
        >
            {eyebrowNumber && (
                <div className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-6">
                    {eyebrowNumber} Mentor Tools
                </div>
            )}
            <div className="flex items-center gap-3 mb-8 border-b-2 border-brutal-dark/10 pb-4">
                <span
                    className="bg-yellow-500 text-brutal-dark px-3 py-1 text-[10px] font-bold font-data rounded-full uppercase tracking-widest"
                    aria-label="Mentor-only zone"
                >
                    Mentor-only
                </span>
                <h2
                    id="mentor-tools-heading"
                    className="font-heading text-3xl md:text-4xl font-bold uppercase tracking-tight-heading"
                >
                    Review Queue
                </h2>
                {!queue.loading && totalPending > 0 && (
                    <span className="bg-yellow-500 text-brutal-dark px-2.5 py-1 text-xs font-bold font-data rounded-full ml-auto">
                        {totalPending} pending
                    </span>
                )}
            </div>

            {/* Row 1 — Review Queue (high attention) with live counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <ReviewCard
                    title="Project Reviews"
                    blurb="Review pending project submissions from makers. Approve or request changes."
                    to="/admin/review-projects"
                    cta="View Pending"
                    Icon={ClipboardCheck}
                    count={queue.projects}
                    countLoading={queue.loading}
                />
                <ReviewCard
                    title="Challenge Verification"
                    blurb="Verify maker challenge completions and award badges."
                    to="/admin/review-challenges"
                    cta="View Submissions"
                    Icon={Trophy}
                    count={queue.challenges}
                    countLoading={queue.loading}
                />
                <ReviewCard
                    title="Event Submissions"
                    blurb="Review and shortlist Build Challenge project submissions."
                    to="/admin/review-submissions"
                    cta="Review"
                    Icon={Trophy}
                    count={queue.eventSubs}
                    countLoading={queue.loading}
                />
                <ReviewCard
                    title="Website Submissions"
                    blurb="Review participant website uploads for event showcases."
                    to="/admin/review-websites"
                    cta="Review"
                    Icon={Globe}
                    count={queue.websites}
                    countLoading={queue.loading}
                />
            </div>

            {/* Row 2 — Lab Admin (low frequency) */}
            <div className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-4 pt-4 border-t border-brutal-dark/10">
                Lab Admin
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <AdminCard
                    title="Event Management"
                    blurb="Schedule and manage events."
                    to="/admin/events"
                    cta="Manage"
                    Icon={Calendar}
                />
                <AdminCard
                    title="Lab Inventory"
                    blurb="Track supplies and consumables."
                    to="/admin/inventory"
                    cta="Manage"
                    Icon={Settings}
                />
                <AdminCard
                    title="Challenges"
                    blurb="Create & publish challenges."
                    to="/admin/challenges"
                    cta="Manage"
                    Icon={Zap}
                />
                <AdminCard
                    title="Projects"
                    blurb="View, manage & delete projects."
                    to="/admin/projects"
                    cta="Manage"
                    Icon={Zap}
                />
            </div>
        </section>
    );
}
