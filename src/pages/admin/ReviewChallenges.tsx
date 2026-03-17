import React, { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { usePendingCompletions, useCompletionReviewMutations, useBadgeMutations } from '../../lib/hooks';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, Check, X, Eye, ExternalLink } from 'lucide-react';

export function ReviewChallenges() {
    const { user, role } = useAuth();
    const { data: completions, loading, refetch } = usePendingCompletions();
    const { verifyCompletion, rejectCompletion } = useCompletionReviewMutations();
    const { awardBadge } = useBadgeMutations();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied</div>;
    }

    const handleVerify = async (completion: any) => {
        if (!user) return;
        setActionLoading(completion.id);
        
        // Mark as verified
        const { error: verifyErr } = await verifyCompletion(completion.id, user.id);
        
        if (!verifyErr) {
            // Auto-award badges for challenge completion
            try {
                const { onChallengeVerified } = await import('../../lib/badgeEngine');
                await onChallengeVerified(completion.user_id, completion.challenge_id);
            } catch (err) {
                console.error('Failed to auto-award challenge badges', err);
            }
        }
        
        await refetch();
        setActionLoading(null);
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Are you sure you want to reject this submission? The maker will need to try again.")) return;
        setActionLoading(id);
        await rejectCompletion(id);
        await refetch();
        setActionLoading(null);
    };

    if (loading) return <div className="p-24 flex justify-center font-data">Loading queue...</div>;

    const pendingList = completions || [];

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
                    <Trophy className="w-10 h-10 text-yellow-500" />
                    Challenge Verification
                </h1>
                <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-yellow-500 pl-4 mb-8">
                    Review maker challenge submissions and verify their evidence to award completion (and optional badges).
                </p>

                {pendingList.length === 0 ? (
                    <Card className="p-12 text-center border-2 border-dashed border-brutal-dark/20 bg-transparent shadow-none">
                        <Trophy className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                        <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">Queue is Clear</h3>
                        <p className="font-data text-brutal-dark/40 mt-2">No challenge submissions awaiting verification.</p>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {pendingList.map(completion => (
                            <Card key={completion.id} className="p-6 border-2 border-brutal-dark/10 flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3 border-b-2 border-brutal-dark/10 pb-4">
                                        <div className="flex flex-col">
                                            <span className="font-data text-sm font-bold text-brutal-dark/60 uppercase">Challenge</span>
                                            <h3 className="font-heading font-bold text-2xl">{completion.challengeTitle}</h3>
                                        </div>
                                    </div>
                                    
                                    <p className="font-data text-sm font-bold text-brutal-dark/60">
                                        Submitted by: <span className="text-brutal-dark">{completion.userName}</span>
                                    </p>
                                    
                                    <div className="bg-white/50 p-4 border border-brutal-dark/5 rounded-lg space-y-4">
                                        <div>
                                            <strong className="block font-data text-xs uppercase text-brutal-dark/50 mb-1">Maker Notes</strong>
                                            <p className="font-data text-sm italic border-l-2 border-brutal-dark/20 pl-3">
                                                {completion.notes || "No notes provided."}
                                            </p>
                                        </div>
                                        {completion.evidence_url && (
                                            <div>
                                                <strong className="block font-data text-xs uppercase text-brutal-dark/50 mb-1">Evidence URL</strong>
                                                <a 
                                                    href={completion.evidence_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="font-data text-sm text-brutal-red hover:underline flex items-center gap-1"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> View Evidence Link
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-3 min-w-[200px] border-t-2 md:border-t-0 md:border-l-2 border-brutal-dark/10 pt-4 md:pt-0 md:pl-6 justify-center">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => window.open(`/challenges/${completion.challenge_id}`, '_blank')}
                                        className="w-full justify-start"
                                    >
                                        <Eye className="w-4 h-4 mr-2" /> View Challenge
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleVerify(completion)}
                                        disabled={actionLoading === completion.id}
                                    >
                                        <Check className="w-4 h-4 mr-2" /> 
                                        {actionLoading === completion.id ? 'Processing...' : 'Verify & Complete'}
                                    </Button>
                                    <Button 
                                        variant="secondary"
                                        className="w-full justify-start border-brutal-red text-brutal-red hover:bg-brutal-red hover:text-white"
                                        onClick={() => handleReject(completion.id)}
                                        disabled={actionLoading === completion.id}
                                    >
                                        <X className="w-4 h-4 mr-2" /> Reject Submission
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
