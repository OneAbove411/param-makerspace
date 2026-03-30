import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Trophy, Calendar } from 'lucide-react';

export function ReviewEventSubmissions() {
    const { role } = useAuth();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchSubmissions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('event_submission')
            .select(`
                id, status, created_at,
                event:event!event_id(id, title, event_type),
                project:project!project_id(id, title, summary, domain),
                team:event_team!team_id(id, name),
                user:app_user!user_id(name, email)
            `)
            .in('status', ['submitted', 'shortlisted'])
            .order('created_at', { ascending: false });
            
        if (!error && data) {
            setSubmissions(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (role === 'admin' || role === 'mentor') {
            fetchSubmissions();
        }
    }, [role]);

    const handleUpdateStatus = async (subId: string, newStatus: string) => {
        setActionLoading(true);
        // Optimistic: update status in UI immediately
        setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: newStatus } : s)
            .filter(s => ['submitted', 'shortlisted'].includes(s.status)));
        await supabase.from('event_submission').update({ status: newStatus }).eq('id', subId);
        setActionLoading(false);
    };

    if (role !== 'admin' && role !== 'mentor') {
        return <div className="p-24 text-center font-data text-2xl">Access Denied</div>;
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-yellow-500 text-brutal-dark px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        Mentor Tools
                    </span>
                    <Link to="/dashboard" className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline">
                        Back to Dashboard
                    </Link>
                </div>
                
                <div>
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                        <Trophy className="w-10 h-10 text-yellow-600" />
                        Review Event Submissions
                    </h1>
                    <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-yellow-500 pl-4 mt-4 mb-12">
                        Review, shortlist, and accept Build Challenge project submissions from participating makers and teams.
                    </p>
                </div>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                        No pending submissions found. All caught up!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {submissions.map((sub) => (
                            <Card key={sub.id} className="flex flex-col p-6 hover:border-yellow-500/50 transition-colors border-2 border-brutal-dark/10 shadow-md">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 text-[10px] font-bold font-data rounded uppercase ${
                                        sub.status === 'shortlisted' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-brutal-dark/10 text-brutal-dark'
                                    }`}>
                                        Status: {sub.status}
                                    </span>
                                    <span className="font-data text-xs text-brutal-dark/50">{new Date(sub.created_at).toLocaleDateString()}</span>
                                </div>
                                
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 font-data text-xs font-bold text-brutal-red uppercase mb-1 tracking-widest">
                                        <Calendar className="w-3 h-3" /> Event: {sub.event?.title}
                                    </div>
                                    <h4 className="font-heading font-bold text-2xl leading-tight mb-2">
                                        {sub.project?.title || 'Unknown Project'}
                                    </h4>
                                    <p className="font-data text-sm text-brutal-dark/70 line-clamp-2">
                                        {sub.project?.summary}
                                    </p>
                                </div>
                                
                                <div className="bg-brutal-dark/5 p-3 rounded-xl border border-brutal-dark/10 mb-6 flex-1 text-sm font-data">
                                    <div className="mb-1"><span className="font-bold text-brutal-dark/60 uppercase text-[10px] tracking-wider w-20 inline-block">Submitter</span> {sub.user?.name}</div>
                                    <div><span className="font-bold text-brutal-dark/60 uppercase text-[10px] tracking-wider w-20 inline-block">Team</span> {sub.team?.name || 'Individual Entry'}</div>
                                    <div className="mt-2 pt-2 border-t border-brutal-dark/10">
                                        <Link to={`/projects/${sub.project?.id}`} className="text-brutal-red hover:underline font-bold text-xs uppercase" target="_blank">
                                            Open Project Page ↗
                                        </Link>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {sub.status === 'submitted' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(sub.id, 'shortlisted')} disabled={actionLoading} className="bg-yellow-500 text-white hover:bg-yellow-600 flex-1">
                                            Shortlist
                                        </Button>
                                    )}
                                    <Button size="sm" onClick={() => handleUpdateStatus(sub.id, 'accepted')} disabled={actionLoading} className="bg-green-600 text-white hover:bg-green-700 flex-1">
                                        Accept
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(sub.id, 'rejected')} disabled={actionLoading} className="border-brutal-red text-brutal-red hover:bg-brutal-red/10 flex-1">
                                        Reject
                                    </Button>
                                    {role === 'admin' && (
                                        <Button size="sm" onClick={() => handleUpdateStatus(sub.id, 'winner')} disabled={actionLoading} className="bg-brutal-dark text-white hover:bg-brutal-dark/90 w-full mt-2 border-2 border-yellow-500 relative overflow-hidden group">
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                <Trophy className="w-4 h-4 text-yellow-500" />
                                                Mark as Winner
                                            </span>
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
