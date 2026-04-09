import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
    ClipboardCheck,
    Trophy,
    Globe,
    Calendar,
    Settings,
    Zap,
} from 'lucide-react';

/**
 * §7 F-313 — Mentor Tools split into two visually-weighted rows:
 *
 *   Row 1 (high attention): Review Queue
 *     Project Reviews / Challenge Verification / Event Submissions /
 *     Website Submissions
 *     Rendered with the yellow brutalist border and larger typography
 *     because these are the surfaces where mentors act on pending work.
 *
 *   Row 2 (low frequency): Lab Admin
 *     Event Management / Lab Inventory / Challenges / Projects
 *     Rendered muted (dark/5 bg, thinner border, smaller title) because
 *     these are configuration surfaces, not queues.
 *
 * Principle: inverted pyramid + grouping by frequency of use (Cluster,
 * GoodData). Equal-weight cards hid the Project Reviews surface in a
 * grid of nine identical yellow tiles.
 *
 * §7 F-324 — This file is code-split via `React.lazy()` in Dashboard.tsx
 * so viewers and non-mentor makers never pay the bundle cost.
 */

interface ReviewCardProps {
    title: string;
    blurb: string;
    to: string;
    cta: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}

function ReviewCard({ title, blurb, to, cta, Icon }: ReviewCardProps) {
    return (
        <Card className="p-5 border-2 border-yellow-500/50 bg-yellow-500/5 shadow-[6px_6px_0_0_rgba(234,179,8,0.18)] hover:shadow-[8px_8px_0_0_rgba(234,179,8,0.28)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <Icon className="w-5 h-5 text-yellow-700" aria-hidden />
                <h3 className="font-heading font-bold text-lg uppercase tracking-tight-heading">{title}</h3>
            </div>
            <p className="font-data text-sm text-brutal-dark/60 mb-4 flex-1">{blurb}</p>
            <Link to={to} className="mt-auto">
                <Button variant="outline" size="sm" className="w-full">{cta}</Button>
            </Link>
        </Card>
    );
}

function AdminCard({ title, blurb, to, cta, Icon }: ReviewCardProps) {
    return (
        <Card className="p-4 border-2 border-brutal-dark/10 bg-brutal-dark/5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-brutal-dark/50" aria-hidden />
                <h3 className="font-data font-bold text-sm uppercase tracking-wider text-brutal-dark/80">{title}</h3>
            </div>
            <p className="font-data text-xs text-brutal-dark/50 mb-3 flex-1">{blurb}</p>
            <Link to={to} className="mt-auto">
                <Button variant="outline" size="sm" className="w-full text-xs">{cta}</Button>
            </Link>
        </Card>
    );
}

export default function MentorToolsSection({ eyebrowNumber }: { eyebrowNumber?: string }) {
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
                    className="bg-yellow-500 text-brutal-dark px-3 py-1 text-xs font-bold font-data rounded uppercase"
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
            </div>

            {/* Row 1 — Review Queue (high attention) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <ReviewCard
                    title="Project Reviews"
                    blurb="Review pending project submissions from makers. Approve or request changes."
                    to="/admin/review-projects"
                    cta="View Pending"
                    Icon={ClipboardCheck}
                />
                <ReviewCard
                    title="Challenge Verification"
                    blurb="Verify maker challenge completions and award badges."
                    to="/admin/review-challenges"
                    cta="View Submissions"
                    Icon={Trophy}
                />
                <ReviewCard
                    title="Event Submissions"
                    blurb="Review and shortlist Build Challenge submissions."
                    to="/admin/review-submissions"
                    cta="Review"
                    Icon={Trophy}
                />
                <ReviewCard
                    title="Website Submissions"
                    blurb="Review participant website uploads for event showcases."
                    to="/admin/review-websites"
                    cta="Review"
                    Icon={Globe}
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
