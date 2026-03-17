import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChallenge, useChallengeCompletion } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Clock, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

import { getEmbedUrl } from '../lib/videoUtils';

export function ChallengeDetails() {
    const { id } = useParams();
    const { data: challenge, loading } = useChallenge(id);
    const { user } = useAuth();
    const { completion, markComplete } = useChallengeCompletion(id);
    const [submitting, setSubmitting] = useState(false);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');

    const handleMarkComplete = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        await markComplete(notes, evidenceUrl);
        setSubmitting(false);
        setShowCompleteForm(false);
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
                    <ArrowLeft className="w-4 h-4" /> Back to Explorer Hub
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
                            
                            {challenge.vocabulary.length > 0 && (
                                <div className="bg-brutal-dark/5 rounded-[2rem] p-8 border border-brutal-dark/10">
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Key Concepts</h3>
                                    <dl className="space-y-6">
                                        {challenge.vocabulary.map((vocab, idx) => (
                                            <div key={idx}>
                                                <dt className="font-heading font-bold text-lg text-brutal-dark">{vocab.term}</dt>
                                                <dd className="font-data text-sm text-brutal-dark/70 mt-1">{vocab.definition}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            )}

                            {challenge.skills.length > 0 && (
                                <div>
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Skills You'll Develop</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {challenge.skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1 bg-brutal-dark text-brutal-bg rounded-full font-data text-xs font-bold">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {challenge.levels.length > 0 && (
                                <div>
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Difficulty Levels</h3>
                                    <div className="flex flex-col md:flex-row gap-4">
                                        {challenge.levels.map((lvl, idx) => (
                                            <div key={idx} className="flex-1 border-2 border-brutal-dark/10 rounded-xl p-4">
                                                <strong className="block font-heading font-bold text-lg mb-2">{lvl.level_name}</strong>
                                                <p className="font-data text-sm text-brutal-dark/70">{lvl.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {challenge.images.length > 0 && (
                                <div>
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Gallery</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {challenge.images.map((img, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark/5">
                                                    <img src={img.image_url} alt={img.caption || `Image ${idx + 1}`} className="w-full h-full object-cover" />
                                                </div>
                                                {img.caption && (
                                                    <p className="font-data text-xs text-brutal-dark/60 text-center">{img.caption}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {challenge.videos.length > 0 && (
                                <div>
                                    <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Reference Videos</h3>
                                    <div className="space-y-8">
                                        {challenge.videos.map((vid, idx) => (
                                            <div key={idx} className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark">
                                                <iframe
                                                    src={getEmbedUrl(vid.video_url)}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        ))}
                                    </div>
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
                                <div className="space-y-4 mb-8">
                                    {!showCompleteForm ? (
                                        <Button
                                            size="lg"
                                            className="w-full shadow-lg shadow-brutal-red/20"
                                            onClick={() => setShowCompleteForm(true)}
                                        >
                                            <CheckCircle2 className="w-5 h-5 mr-2" />
                                            Mark as Completed
                                        </Button>
                                    ) : (
                                        <form onSubmit={handleMarkComplete} className="bg-brutal-dark/5 rounded-[2rem] p-6 border-2 border-brutal-red/30 space-y-4">
                                            <h4 className="font-heading font-bold text-xl uppercase mb-2">Submit Evidence</h4>
                                            <div>
                                                <label className="block font-data text-xs font-bold text-brutal-dark/60 uppercase mb-1">Your build notes / reflection</label>
                                                <textarea 
                                                    required
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded-xl font-data min-h-[100px] text-sm"
                                                    placeholder="What did you make? What did you learn?"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-data text-xs font-bold text-brutal-dark/60 uppercase mb-1">Evidence URL (Optional)</label>
                                                <input 
                                                    type="url"
                                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded-xl font-data text-sm"
                                                    placeholder="GitHub link, video link, photo URL..."
                                                    value={evidenceUrl}
                                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowCompleteForm(false)}>Cancel</Button>
                                                <Button type="submit" className="flex-1" disabled={submitting}>
                                                    {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                                    Submit
                                                </Button>
                                            </div>
                                        </form>
                                    )}

                                    <div className="p-4 rounded-xl border-2 border-brutal-dark/10 text-sm font-data">
                                        <div className="flex items-center gap-2 font-bold mb-1">
                                            <span className={`w-3 h-3 rounded-full ${challenge.tier === 'Tier 1' ? 'bg-green-500' : challenge.tier === 'Tier 2' ? 'bg-yellow-500' : 'bg-brutal-red'}`} />
                                            Tier Access Logic
                                        </div>
                                        <p className="text-brutal-dark/70">
                                            {challenge.tier === 'Tier 1' ? 'Open to all — no prerequisites.' :
                                             challenge.tier === 'Tier 2' ? 'Requires Tier 1 completion or direct domain experience.' :
                                             'Requires Tier 2 completion or mentor approval.'}
                                        </p>
                                    </div>
                                </div>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
