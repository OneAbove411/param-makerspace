import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChallenge, useChallengeCompletion } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Clock, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export function ChallengeDetails() {
    const { id } = useParams();
    const { data: challenge, loading } = useChallenge(id);
    const { user } = useAuth();
    const { completion, markComplete } = useChallengeCompletion(id);
    const [submitting, setSubmitting] = useState(false);

    const handleMarkComplete = async () => {
        setSubmitting(true);
        await markComplete();
        setSubmitting(false);
    };

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading challenge...</div>;
    }

    if (!challenge) {
        return <div className="pt-32 px-12 font-data text-2xl">Challenge not found.</div>;
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
                <Link to="/challenges" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-12 interactive-lift">
                    <ArrowLeft className="w-4 h-4" /> Back to Database
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-16">
                        <header>
                            <div className="flex flex-wrap gap-2 items-center mb-6">
                                {challenge.tier && <span className="bg-brutal-dark text-brutal-bg px-3 py-1 font-data text-xs font-bold rounded-full">{challenge.tier}</span>}
                                {challenge.domain && <span className="border border-brutal-dark/20 text-brutal-dark px-3 py-1 font-data text-xs font-bold rounded-full">{challenge.domain}</span>}
                                <span className="flex items-center gap-2 text-brutal-dark/60 font-data text-sm font-bold ml-auto">
                                    <Clock className="w-4 h-4" /> {challenge.time_estimate || 'Varies'}
                                </span>
                            </div>
                            <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight-heading leading-none mb-8">
                                {challenge.title}
                            </h1>
                            {challenge.mystery && (
                                <div className="p-6 bg-brutal-dark text-brutal-bg rounded-[2rem] border-2 border-brutal-dark/10 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 text-brutal-bg font-heading text-9xl font-bold leading-none pointer-events-none group-hover:scale-110 transition-transform duration-700">?</div>
                                    <h3 className="font-heading font-bold text-sm tracking-widest text-brutal-red uppercase mb-2">The Mystery</h3>
                                    <p className="font-data text-lg lg:text-xl relative z-10">{challenge.mystery}</p>
                                </div>
                            )}
                        </header>

                        {challenge.cover_image_url && (
                            <div className="w-full aspect-video rounded-[2rem] overflow-hidden border-2 border-brutal-dark/10">
                                <img src={challenge.cover_image_url} alt={challenge.title} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <section className="space-y-12">
                            <div>
                                <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Mission Brief</h3>
                                <div className="space-y-6">
                                    {challenge.core_idea && (
                                        <div>
                                            <strong className="block font-data text-sm text-brutal-dark/60 uppercase tracking-widest mb-1">Core Idea</strong>
                                            <p className="font-data text-lg">{challenge.core_idea}</p>
                                        </div>
                                    )}
                                    {challenge.mission && (
                                        <div>
                                            <strong className="block font-data text-sm text-brutal-dark/60 uppercase tracking-widest mb-1">Mission</strong>
                                            <p className="font-data text-lg">{challenge.mission}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {challenge.steps.length > 0 && (
                                <div>
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Execution Steps</h3>
                                    <ol className="space-y-4 font-data">
                                        {challenge.steps.map((step, idx) => (
                                            <li key={idx} className="flex gap-4">
                                                <span className="font-bold text-brutal-red w-6 flex-shrink-0">{String(idx + 1).padStart(2, '0')}.</span>
                                                <span className="text-lg">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {challenge.success_criteria && (
                                <div className="p-8 bg-brutal-red/10 border-2 border-brutal-red/20 rounded-[2rem]">
                                    <h3 className="font-heading font-bold text-xl text-brutal-red mb-4 uppercase">Success Criteria</h3>
                                    <p className="font-data text-lg font-bold text-brutal-dark">{challenge.success_criteria}</p>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="space-y-8">
                        <div className="sticky top-32">
                            {completion ? (
                                <div className={`w-full mb-8 p-4 rounded-full text-center font-heading font-bold uppercase ${
                                    completion.status === 'verified' ? 'bg-green-100 text-green-700 border-2 border-green-300' :
                                    completion.status === 'declined' ? 'bg-brutal-red/10 text-brutal-red border-2 border-brutal-red/30' :
                                    'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                                }`}>
                                    {completion.status === 'verified' ? '✓ Verified Complete' :
                                     completion.status === 'declined' ? '✗ Declined' :
                                     '⏳ Pending Verification'}
                                </div>
                            ) : user ? (
                                <Button
                                    size="lg"
                                    className="w-full shadow-lg shadow-brutal-red/20 mb-8"
                                    onClick={handleMarkComplete}
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                    {submitting ? 'Submitting...' : 'Mark as Completed'}
                                </Button>
                            ) : (
                                <Link to="/login">
                                    <Button size="lg" className="w-full shadow-lg shadow-brutal-red/20 mb-8" variant="secondary">
                                        Log in to Track Progress
                                    </Button>
                                </Link>
                            )}

                            <div className="bg-brutal-dark/5 border border-brutal-dark/10 rounded-[2rem] p-8 space-y-8">
                                {challenge.materials.length > 0 && (
                                    <div>
                                        <h4 className="font-data text-xs font-bold text-brutal-dark/50 uppercase tracking-widest mb-3">Required Materials</h4>
                                        <ul className="space-y-2 font-data text-sm">
                                            {challenge.materials.map((m, i) => <li key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brutal-dark/40" /> {m}</li>)}
                                        </ul>
                                    </div>
                                )}

                                {challenge.skills.length > 0 && (
                                    <div>
                                        <h4 className="font-data text-xs font-bold text-brutal-dark/50 uppercase tracking-widest mb-3">Skills Targeted</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {challenge.skills.map((s, i) => <span key={i} className="px-2 py-1 bg-brutal-bg border border-brutal-dark/20 rounded text-xs font-data font-bold">{s}</span>)}
                                        </div>
                                    </div>
                                )}

                                {challenge.vocabulary.length > 0 && (
                                    <div>
                                        <h4 className="font-data text-xs font-bold text-brutal-dark/50 uppercase tracking-widest mb-3">Vocabulary</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {challenge.vocabulary.map((v, i) => <span key={i} className="px-2 py-1 bg-brutal-dark text-brutal-bg rounded text-xs font-data font-bold">{v}</span>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
