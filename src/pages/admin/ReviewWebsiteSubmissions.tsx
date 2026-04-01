import React, { useState, useMemo } from 'react';
import { useAuth } from '../../lib/auth';
import { useEventWebsitesForReview, useEventWebsiteMutations, useAllEvents } from '../../lib/hooks';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Globe, Calendar, Users, Eye, EyeOff, Check, X, ChevronDown } from 'lucide-react';

// Stable style constants for iframe previews (avoid recreating each render)
const MINI_PREVIEW_STYLE: React.CSSProperties = {
    transform: 'scale(0.4)',
    transformOrigin: 'top left',
    width: '250%',
    height: '250%',
    paddingTop: '18px',
    pointerEvents: 'none',
};
const FULL_PREVIEW_STYLE: React.CSSProperties = { paddingTop: '28px' };

export function ReviewWebsiteSubmissions() {
    const { user, role } = useAuth();
    const [selectedEventId, setSelectedEventId] = useState<string | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const { data: websites, loading, refetch } = useEventWebsitesForReview(selectedEventId);
    const { data: events } = useAllEvents();
    const { reviewWebsite } = useEventWebsiteMutations();
    const [actionLoading, setActionLoading] = useState(false);
    const [previewId, setPreviewId] = useState<string | null>(null);

    const handleReview = async (id: string, status: 'approved' | 'rejected') => {
        if (!user) return;
        setActionLoading(true);
        await reviewWebsite(id, status, user.id);
        refetch();
        setActionLoading(false);
    };

    const filtered = useMemo(
        () => (websites || []).filter(w => statusFilter === 'all' || w.status === statusFilter),
        [websites, statusFilter]
    );

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
                        <Globe className="w-10 h-10 text-brutal-red" />
                        Review Website Submissions
                    </h1>
                    <p className="font-data text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4 mb-8">
                        Review and approve participant website submissions for events. Approved websites will appear on the event showcase wall.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative">
                        <select
                            value={selectedEventId || ''}
                            onChange={e => setSelectedEventId(e.target.value || undefined)}
                            className="bg-brutal-bg border-2 border-brutal-dark/15 px-4 py-2 pr-10 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark/30 appearance-none min-w-[220px]"
                        >
                            <option value="">All Events</option>
                            {(events || []).map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brutal-dark/40 pointer-events-none" />
                    </div>

                    <div className="flex gap-1 bg-brutal-dark/5 rounded-xl p-1">
                        {(['pending', 'approved', 'rejected', 'all'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg font-data text-xs font-bold uppercase transition-all ${
                                    statusFilter === s
                                        ? 'bg-brutal-dark text-brutal-bg shadow'
                                        : 'text-brutal-dark/50 hover:text-brutal-dark hover:bg-brutal-dark/10'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <span className="font-data text-xs text-brutal-dark/40 font-bold ml-auto">
                        {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Submissions */}
                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading submissions...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-brutal-dark/50">
                        No {statusFilter !== 'all' ? statusFilter : ''} website submissions found.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filtered.map(website => (
                            <Card key={website.id} className="flex flex-col border-2 border-brutal-dark/10 shadow-md overflow-hidden">
                                {/* Preview area */}
                                <div className="relative bg-white" style={{ height: previewId === website.id ? '400px' : '200px' }}>
                                    {/* Browser chrome */}
                                    <div className="absolute top-0 left-0 right-0 bg-brutal-dark/90 px-3 py-1.5 flex items-center gap-2 z-10">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 rounded-full bg-brutal-red/70" />
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/70" />
                                            <div className="w-2 h-2 rounded-full bg-green-500/70" />
                                        </div>
                                        <div className="flex-1 bg-brutal-dark/50 rounded px-2 py-0.5">
                                            <span className="font-mono text-[8px] text-brutal-bg/40 truncate block">{website.title}</span>
                                        </div>
                                        <button
                                            onClick={() => setPreviewId(previewId === website.id ? null : website.id)}
                                            className="text-brutal-bg/40 hover:text-brutal-bg transition-colors"
                                        >
                                            {previewId === website.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                    </div>

                                    {website.html_content ? (
                                        <iframe
                                            srcDoc={website.html_content}
                                            title={website.title}
                                            className="w-full h-full border-0 pt-7"
                                            sandbox={previewId === website.id ? 'allow-scripts' : ''}
                                            style={previewId !== website.id ? MINI_PREVIEW_STYLE : FULL_PREVIEW_STYLE}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-brutal-dark/5 pt-7">
                                            <Globe className="w-8 h-8 text-brutal-dark/20" />
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2 py-1 text-[10px] font-bold font-data rounded uppercase ${
                                            website.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                                            website.status === 'rejected' ? 'bg-brutal-red/10 text-brutal-red border border-brutal-red/30' :
                                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                        }`}>
                                            {website.status}
                                        </span>
                                        <span className="font-data text-xs text-brutal-dark/50">
                                            {new Date(website.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <h3 className="font-heading font-bold text-xl leading-tight mb-2">{website.title}</h3>

                                    {website.description && (
                                        <p className="font-data text-sm text-brutal-dark/70 line-clamp-2 mb-3">{website.description}</p>
                                    )}

                                    <div className="bg-brutal-dark/5 p-3 rounded-xl border border-brutal-dark/10 mb-4 text-sm font-data flex-1">
                                        <div className="mb-1">
                                            <span className="font-bold text-brutal-dark/60 uppercase text-[10px] tracking-wider w-20 inline-block">Submitter</span>
                                            {website.userName}
                                        </div>
                                        <div className="mb-1">
                                            <span className="font-bold text-brutal-dark/60 uppercase text-[10px] tracking-wider w-20 inline-block">Email</span>
                                            {website.userEmail}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-brutal-dark/60 uppercase text-[10px] tracking-wider w-20 inline-block">Hosts</span>
                                            <Users className="w-3 h-3 text-brutal-dark/40" />
                                            <span>{website.host_names?.join(', ') || 'None listed'}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {website.status === 'pending' && (
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleReview(website.id, 'approved')}
                                                disabled={actionLoading}
                                                className="bg-green-600 text-white hover:bg-green-700 flex-1"
                                            >
                                                <Check className="w-4 h-4" /> Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReview(website.id, 'rejected')}
                                                disabled={actionLoading}
                                                className="border-brutal-red text-brutal-red hover:bg-brutal-red/10 flex-1"
                                            >
                                                <X className="w-4 h-4" /> Reject
                                            </Button>
                                        </div>
                                    )}

                                    {website.status === 'approved' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleReview(website.id, 'rejected')}
                                            disabled={actionLoading}
                                            className="border-brutal-red text-brutal-red hover:bg-brutal-red/5 w-full"
                                        >
                                            Revoke Approval
                                        </Button>
                                    )}

                                    {website.status === 'rejected' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleReview(website.id, 'approved')}
                                            disabled={actionLoading}
                                            className="bg-green-600 text-white hover:bg-green-700 w-full"
                                        >
                                            Approve After All
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
