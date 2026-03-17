import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { usePendingProjects, useProjectReviewMutations, useMyProfile, useMaker, useSupabaseQuery } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ClipboardCheck, Check, X, Eye } from 'lucide-react';

export function ReviewProjects() {
    const { user, role } = useAuth();
    const { data: projects, loading } = usePendingProjects();
    const { data: profile, loading: profileLoading } = useMyProfile();
    const { data: makerProfile } = useMaker(user?.id); // Fetch logged-in mentor's profile
    const { approveProject, rejectProject } = useProjectReviewMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    // Local list for optimistic removal — avoids refetching entire list
    const [localProjects, setLocalProjects] = useState<typeof projects>(null);

    // Sync local state when fresh data arrives
    React.useEffect(() => { if (projects) setLocalProjects(projects); }, [projects]);

    const approvalDomains = (makerProfile as any)?.approval_domains
        ? (makerProfile as any).approval_domains.split(',').map((d: string) => d.trim().toLowerCase())
        : [];

    const handleApprove = async (id: string) => {
        setActionLoading(id);
        // Optimistic: remove from local list immediately
        setLocalProjects(prev => prev?.filter(p => p.id !== id) ?? null);
        await approveProject(id);
        
        // Auto-award badges
        try {
            const { supabase } = await import('../../lib/supabase');
            const { onProjectApproved, onProjectActive } = await import('../../lib/badgeEngine');
            const { data: p } = await supabase.from('project').select('owner_id').eq('id', id).single();
            if (p?.owner_id) {
                await onProjectApproved(p.owner_id);
                await onProjectActive(p.owner_id);
            }
        } catch (err) {
            console.error('Failed to auto-award project badges', err);
        }
        
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Are you sure you want to reject this project? The maker will need to edit and resubmit.")) return;
        setActionLoading(id);
        // Optimistic: remove from local list immediately
        setLocalProjects(prev => prev?.filter(p => p.id !== id) ?? null);
        await rejectProject(id);
        setActionLoading(null);
    };

    if (loading || profileLoading) return <div className="p-24 flex justify-center font-data">Loading queue...</div>;

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-yellow-500 text-brutal-dark px-2 py-1 text-xs font-bold font-data rounded uppercase">Mentor Tools</span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                    <ClipboardCheck className="w-10 h-10 text-yellow-500" />
                    Project Reviews
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-yellow-500 pl-4 mb-8">
                    Review pending project submissions from makers. Approve to make them active and public, or reject to request changes.
                </p>

                {loading ? (
                    <div className="py-12 text-center font-data text-brutal-dark/50">Loading projects...</div>
                ) : (localProjects || []).filter(p => {
                    if (role === 'admin') return true; // Admins see everything
                    if (approvalDomains.length === 0) return true; // If mentor has no specific domains, they see all
                    return approvalDomains.includes((p.domain || '').toLowerCase());
                }).length === 0 ? (
                    <Card className="p-12 text-center border-2 border-dashed border-brutal-dark/20 bg-transparent shadow-none">
                        <ClipboardCheck className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                        <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">Queue is Clear</h3>
                        <p className="font-data text-brutal-dark/40 mt-2">No projects currently awaiting review.</p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {(localProjects || []).filter(p => {
                            if (role === 'admin') return true; // Admins see everything
                            if (approvalDomains.length === 0) return true; // If mentor has no specific domains, they see all
                            return approvalDomains.includes((p.domain || '').toLowerCase());
                        }).map((project) => (
                            <Card key={project.id} className="p-6 border-2 border-brutal-dark/10 flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-heading font-bold text-2xl">{project.title}</h3>
                                        {project.domain && <span className="text-xs font-data font-bold bg-brutal-dark/5 px-2 py-1 rounded">{project.domain}</span>}
                                        {project.tier && <span className="text-xs font-data font-bold bg-brutal-dark/5 px-2 py-1 rounded">{project.tier}</span>}
                                    </div>
                                    <p className="font-data text-sm font-bold text-brutal-dark/60">
                                        Submitted by: <span className="text-brutal-dark">{project.ownerName}</span> ({project.ownerEmail})
                                    </p>
                                    <div className="bg-white/50 p-4 border border-brutal-dark/5 rounded-lg space-y-4">
                                        <div>
                                            <strong className="block font-data text-xs uppercase text-brutal-dark/50 mb-1">Summary</strong>
                                            <p className="font-data text-sm">{project.summary}</p>
                                        </div>
                                        <div>
                                            <strong className="block font-data text-xs uppercase text-brutal-dark/50 mb-1">Description</strong>
                                            <p className="font-data text-sm whitespace-pre-wrap">{project.description}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-3 min-w-[200px] border-t-2 md:border-t-0 md:border-l-2 border-brutal-dark/10 pt-4 md:pt-0 md:pl-6 justify-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => window.open(`/projects/${project.id}`, '_blank')}
                                        className="w-full justify-start"
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> View Details
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApprove(project.id)}
                                        disabled={actionLoading === project.id}
                                    >
                                        <Check className="w-4 h-4 mr-2" /> 
                                        {actionLoading === project.id ? 'Processing...' : 'Approve Project'}
                                    </Button>
                                    <Button 
                                        variant="secondary"
                                        className="w-full justify-start border-brutal-red text-brutal-red hover:bg-brutal-red hover:text-white"
                                        onClick={() => handleReject(project.id)}
                                        disabled={actionLoading === project.id}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Reject / Changes
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
