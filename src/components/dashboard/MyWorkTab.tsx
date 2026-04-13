import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, AlertTriangle, Lock, Trophy, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';

/**
 * §7 Cockpit — My Work tab.
 *
 * Houses the existing Attention column + Projects grid that used to live
 * in the long vertical scroll. The new-project form is rendered above the
 * grid as an inline section (no modal refactor — F-312 is still deferred).
 *
 * RBAC: parent gates rendering of the "Propose Project" CTA via the
 * `canCreateProject` prop, identical to the old logic.
 */

export interface MyWorkProject {
    id: string;
    title: string;
    summary: string;
    status: string;
}

export interface MyChallengeItem {
    challengeId: string;
    title: string;
    tier: string;
    status: string; // 'verified' | 'pending_review' | 'rejected'
}

export interface MyEventItem {
    id: string;
    title: string;
    date: string;
    type: string;
}

interface MyWorkTabProps {
    projects: MyWorkProject[];
    projectsLoading: boolean;
    attention: MyWorkProject[];
    canCreateProject: boolean;
    requiredRank: string;
    onPropose: () => void;
    challenges: MyChallengeItem[];
    challengesLoading: boolean;
    events: MyEventItem[];
    eventsLoading: boolean;
    currentXP?: number;
    profileComplete?: boolean;
}

export function MyWorkTab({
    projects,
    projectsLoading,
    attention,
    canCreateProject,
    requiredRank,
    onPropose,
    challenges,
    challengesLoading,
    events,
    eventsLoading,
    currentXP = 0,
    profileComplete = false,
}: MyWorkTabProps) {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            {/* Header strip */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b-2 border-brutal-dark/10 pb-4">
                <div>
                    <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-2">
                        My Work
                    </div>
                    <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase tracking-tight-heading">
                        Projects &amp; Attention
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/projects"
                        className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                    >
                        View All Directory
                    </Link>
                    {canCreateProject ? (
                        <Button
                            onClick={onPropose}
                            className="shadow-[4px_4px_0_0_rgba(20,20,20,0.9)]"
                        >
                            <Plus className="w-4 h-4 mr-1" aria-hidden /> Propose Project
                        </Button>
                    ) : (
                        (() => {
                            const xpToUnlock = Math.max(0, 60 - currentXP);
                            return (
                                <Link
                                    to={!profileComplete ? '/profile-setup' : '/challenges?tier=Tier+1'}
                                    aria-label={`Propose Project locked. ${xpToUnlock} XP to Tinkerer rank.`}
                                    className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/50 border-2 border-dashed border-yellow-400/60 bg-yellow-50 px-3 py-2 rounded hover:border-yellow-500 hover:bg-yellow-100 transition-colors"
                                >
                                    <Lock className="w-3.5 h-3.5" aria-hidden />
                                    {!profileComplete
                                        ? 'Finish your Profile (+50 XP) to propose'
                                        : `${xpToUnlock} XP to unlock — Tier 1 challenge`
                                    }
                                </Link>
                            );
                        })()
                    )}
                </div>
            </div>

            {/* Attention strip — only when items exist */}
            {attention.length > 0 && (
                <div>
                    <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-brutal-red" aria-hidden />
                        Attention Required
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {attention.map((p) =>
                            p.status === 'rejected' ? (
                                <div
                                    key={p.id}
                                    className="p-4 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-2xl shadow-[4px_4px_0_0_rgba(196,41,30,0.15)]"
                                >
                                    <strong className="block font-data text-[10px] uppercase tracking-widest mb-1 text-brutal-red">
                                        Rejected
                                    </strong>
                                    <p className="font-data text-sm mb-3 line-clamp-2">
                                        "{p.title}" needs your edits.
                                    </p>
                                    <Link
                                        to={`/projects/${p.id}/edit`}
                                        className="inline-flex items-center gap-1 font-data text-xs font-bold uppercase text-brutal-red underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                    >
                                        Open editor →
                                    </Link>
                                </div>
                            ) : (
                                <div
                                    key={p.id}
                                    className="p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-2xl shadow-[4px_4px_0_0_rgba(234,179,8,0.15)]"
                                >
                                    <strong className="block font-data text-[10px] uppercase tracking-widest mb-1 text-yellow-700">
                                        Under Review
                                    </strong>
                                    <p className="font-data text-sm line-clamp-2">
                                        "{p.title}" is awaiting mentor approval.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Projects grid */}
            <div>
                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3">
                    All Projects
                </div>
                {projectsLoading && projects.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Skeleton variant="card" />
                        <Skeleton variant="card" />
                        <Skeleton variant="card" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="py-12 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl space-y-2">
                        <p>No projects yet.</p>
                        {canCreateProject ? (
                            <p>Click <strong>Propose Project</strong> to start your first one.</p>
                        ) : !profileComplete ? (
                            <p>
                                <Link to="/profile-setup" className="text-brutal-red underline hover:text-brutal-dark transition-colors">Finish your Profile</Link> to earn +50 XP and unlock project proposals.
                            </p>
                        ) : (
                            <p>
                                Complete a <Link to="/challenges?tier=Tier+1" className="text-brutal-red underline hover:text-brutal-dark transition-colors">Tier 1 challenge</Link> to unlock project proposals.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {projects.map((p) => (
                            <Card
                                key={p.id}
                                className={cn(
                                    'flex flex-col p-5 border-2 border-brutal-dark/15',
                                    'shadow-[6px_6px_0_0_rgba(20,20,20,0.06)]',
                                    'hover:border-brutal-dark hover:shadow-[8px_8px_0_0_rgba(20,20,20,0.1)]',
                                    'transition-all duration-150 ease-out motion-reduce:transition-none'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded tracking-widest',
                                            p.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : p.status === 'draft'
                                                ? 'bg-brutal-dark/10 text-brutal-dark/60'
                                                : p.status === 'pending_review'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-brutal-red/10 text-brutal-red'
                                        )}
                                    >
                                        {p.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <h4 className="font-heading font-bold text-xl mb-1 tracking-tight-heading line-clamp-2">
                                    {p.title}
                                </h4>
                                <p className="font-data text-xs text-brutal-dark/60 line-clamp-2 flex-1">
                                    {p.summary}
                                </p>
                                <div className="mt-4">
                                    {p.status === 'draft' || p.status === 'rejected' ? (
                                        <Button size="sm" onClick={() => navigate(`/projects/${p.id}/edit`)}>
                                            Edit Project
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => navigate(`/projects/${p.id}`)}
                                        >
                                            View Public
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Challenges history */}
            <div>
                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-brutal-red" aria-hidden />
                    My Challenges
                </div>
                {challengesLoading && challenges.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Skeleton variant="card" />
                        <Skeleton variant="card" />
                    </div>
                ) : challenges.length === 0 ? (
                    <div className="py-8 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                        No challenges attempted yet.{' '}
                        <Link to="/challenges" className="text-brutal-red underline">Browse challenges</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {challenges.map((c) => (
                            <Card
                                key={c.challengeId}
                                className={cn(
                                    'flex flex-col p-5 border-2 border-brutal-dark/15',
                                    'shadow-[6px_6px_0_0_rgba(20,20,20,0.06)]',
                                    'hover:border-brutal-dark hover:shadow-[8px_8px_0_0_rgba(20,20,20,0.1)]',
                                    'transition-all duration-150 ease-out motion-reduce:transition-none'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span
                                        className={cn(
                                            'px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded tracking-widest',
                                            c.status === 'verified'
                                                ? 'bg-green-100 text-green-700'
                                                : c.status === 'pending_review'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-brutal-red/10 text-brutal-red'
                                        )}
                                    >
                                        {c.status.replace('_', ' ')}
                                    </span>
                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/40">
                                        {c.tier}
                                    </span>
                                </div>
                                <h4 className="font-heading font-bold text-lg mb-1 tracking-tight-heading line-clamp-2">
                                    {c.title}
                                </h4>
                                <div className="mt-auto pt-3">
                                    <Link
                                        to={`/challenges/${c.challengeId}`}
                                        className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red underline"
                                    >
                                        View challenge →
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Events history */}
            <div>
                <div className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-dark/30 mb-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-brutal-red" aria-hidden />
                    My Events
                </div>
                {eventsLoading && events.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <Skeleton variant="card" />
                        <Skeleton variant="card" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="py-8 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                        No events registered yet.{' '}
                        <Link to="/events" className="text-brutal-red underline">Browse events</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {events.map((ev) => (
                            <Card
                                key={ev.id}
                                className={cn(
                                    'flex flex-col p-5 border-2 border-brutal-dark/15',
                                    'shadow-[6px_6px_0_0_rgba(20,20,20,0.06)]',
                                    'hover:border-brutal-dark hover:shadow-[8px_8px_0_0_rgba(20,20,20,0.1)]',
                                    'transition-all duration-150 ease-out motion-reduce:transition-none'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="px-2 py-0.5 text-[10px] font-bold font-data uppercase rounded tracking-widest bg-brutal-dark/10 text-brutal-dark/60">
                                        {ev.type}
                                    </span>
                                </div>
                                <h4 className="font-heading font-bold text-lg mb-1 tracking-tight-heading line-clamp-2">
                                    {ev.title}
                                </h4>
                                <div className="font-data text-xs text-brutal-dark/40 mt-1">
                                    {ev.date}
                                </div>
                                <div className="mt-auto pt-3">
                                    <Link
                                        to={`/events/${ev.id}`}
                                        className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-red underline"
                                    >
                                        View event →
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
