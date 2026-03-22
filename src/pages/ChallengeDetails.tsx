import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useChallenge, useChallengeCompletion } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Clock, ArrowLeft, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { getEmbedUrl } from '../lib/videoUtils';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function DetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 min-h-screen animate-pulse">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 space-y-8">
                <div className="h-4 w-32 bg-brutal-dark/5 rounded" />
                <div className="h-10 w-2/3 bg-brutal-dark/5 rounded" />
                <div className="h-64 bg-brutal-dark/[0.03] rounded-2xl" />
            </div>
        </div>
    );
}

export function ChallengeDetails() {
    const { id } = useParams();
    const { data: challenge, loading } = useChallenge(id);
    const { user } = useAuth();
    const { completion, markComplete } = useChallengeCompletion(id);
    const [submitting, setSubmitting] = useState(false);
    const [showCompleteForm, setShowCompleteForm] = useState(false);
    const [notes, setNotes] = useState('');
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const pageRef = useRef<HTMLDivElement>(null);

    const handleMarkComplete = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSubmitting(true);
        await markComplete(notes, evidenceUrl);
        setSubmitting(false);
        setShowCompleteForm(false);
    };

    // GSAP animations
    useEffect(() => {
        if (loading || !challenge) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.cd-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
            );
            gsap.utils.toArray<HTMLElement>('.cd-section').forEach((el) => {
                gsap.fromTo(el,
                    { y: 40, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
                      scrollTrigger: { trigger: el, start: 'top 85%' } }
                );
            });
            gsap.fromTo('.cd-sidebar-card',
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out',
                  scrollTrigger: { trigger: '.cd-sidebar', start: 'top 80%' } }
            );
        }, pageRef);
        return () => ctx.revert();
    }, [loading, challenge?.id]);

    if (loading) return <DetailsSkeleton />;

    if (!challenge) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-12 min-h-screen">
                <div className="max-w-2xl mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading text-brutal-dark/20">Challenge Not Found</h1>
                    <Link to="/challenges" className="inline-flex items-center gap-2 mt-8 font-data text-sm font-bold uppercase text-brutal-dark hover:text-brutal-red transition-colors">
                        <ArrowLeft size={16} /> Back to Explorer Hub
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg pt-28 min-h-screen">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
                <Link to="/challenges" className="cd-hero-text inline-flex items-center gap-2 font-data text-[10px] font-bold uppercase tracking-widest hover:text-brutal-red transition-colors mb-8 text-brutal-dark/50">
                    <ArrowLeft size={12} /> Back to Explorer Hub
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14 pb-32">
                    {/* ─── LEFT: Main Content ─── */}
                    <div className="lg:col-span-2 space-y-10">
                        <header>
                            <div className="cd-hero-text flex flex-wrap gap-2 items-center mb-4">
                                {challenge.tier && (
                                    <span className="bg-brutal-dark text-brutal-bg px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider">
                                        {challenge.tier}
                                    </span>
                                )}
                                {challenge.domain && (
                                    <span className="border border-brutal-dark/15 px-2.5 py-0.5 font-data text-[9px] font-bold rounded-full uppercase tracking-wider text-brutal-dark/60">
                                        {challenge.domain}
                                    </span>
                                )}
                                <span className="flex items-center gap-1.5 text-brutal-dark/40 font-data text-xs font-bold ml-auto">
                                    <Clock size={13} /> {challenge.time_estimate || 'Varies'}
                                </span>
                            </div>
                            <h1 className="cd-hero-text font-heading font-bold text-4xl md:text-5xl lg:text-6xl tracking-tight-heading leading-[0.95] mb-6">
                                {challenge.title}
                            </h1>

                            {challenge.mystery && (
                                <div className="cd-hero-text p-6 bg-brutal-dark text-brutal-bg rounded-2xl border border-brutal-dark relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 text-brutal-bg font-heading text-8xl font-bold leading-none pointer-events-none group-hover:scale-110 transition-transform duration-700">?</div>
                                    <span className="font-data text-[9px] font-bold tracking-[0.2em] text-brutal-red uppercase block mb-2">The Mystery</span>
                                    <p className="font-data text-base lg:text-lg relative z-10 leading-relaxed">{challenge.mystery}</p>
                                </div>
                            )}
                        </header>

                        {challenge.cover_image_url && (
                            <div className="cd-section w-full aspect-video rounded-2xl overflow-hidden border border-brutal-dark/10">
                                <img src={challenge.cover_image_url} alt={challenge.title} className="w-full h-full object-cover" />
                            </div>
                        )}

                        <section className="cd-section space-y-10">
                            {/* Mission Brief */}
                            {(challenge.core_idea || challenge.mission) && (
                                <div>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Mission Brief</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="space-y-5">
                                        {challenge.core_idea && (
                                            <div>
                                                <span className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest block mb-1">Core Idea</span>
                                                <p className="font-data text-base text-brutal-dark/80">{challenge.core_idea}</p>
                                            </div>
                                        )}
                                        {challenge.mission && (
                                            <div>
                                                <span className="font-data text-[10px] text-brutal-dark/40 font-bold uppercase tracking-widest block mb-1">Mission</span>
                                                <p className="font-data text-base text-brutal-dark/80">{challenge.mission}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Execution Steps */}
                            {challenge.steps.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Execution Steps</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <ol className="space-y-3">
                                        {challenge.steps.map((step, idx) => (
                                            <li key={idx} className="flex gap-4 items-start">
                                                <span className="font-data text-sm font-bold text-brutal-red flex-shrink-0 w-6">{String(idx + 1).padStart(2, '0')}</span>
                                                <span className="font-data text-sm text-brutal-dark/80 leading-relaxed">{step}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {/* Success Criteria */}
                            {challenge.success_criteria && (
                                <div className="cd-section p-6 bg-brutal-red/5 border border-brutal-red/15 rounded-2xl">
                                    <span className="font-data text-[9px] font-bold tracking-[0.2em] text-brutal-red uppercase block mb-2">Success Criteria</span>
                                    <p className="font-data text-sm font-bold text-brutal-dark leading-relaxed">{challenge.success_criteria}</p>
                                </div>
                            )}

                            {/* Key Concepts */}
                            {challenge.vocabulary.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Key Concepts</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="bg-brutal-dark/[0.03] rounded-2xl p-6 border border-brutal-dark/8 space-y-4">
                                        {challenge.vocabulary.map((vocab, idx) => (
                                            <div key={idx}>
                                                <dt className="font-heading font-bold text-base">{vocab.term}</dt>
                                                <dd className="font-data text-xs text-brutal-dark/60 mt-0.5 leading-relaxed">{vocab.definition}</dd>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Skills */}
                            {challenge.skills.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Skills You'll Develop</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="flex flex-wrap gap-2">
                                        {challenge.skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1 bg-brutal-dark text-brutal-bg rounded-full font-data text-[10px] font-bold uppercase tracking-wider">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Difficulty Levels */}
                            {challenge.levels.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Difficulty Levels</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {challenge.levels.map((lvl, idx) => (
                                            <div key={idx} className="p-4 border border-brutal-dark/10 rounded-xl">
                                                <strong className="block font-heading font-bold text-sm uppercase mb-1">{lvl.level_name}</strong>
                                                <p className="font-data text-xs text-brutal-dark/60 leading-relaxed">{lvl.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gallery */}
                            {challenge.images.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Gallery</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {challenge.images.map((img, idx) => (
                                            <div key={idx}>
                                                <div className="w-full aspect-video rounded-xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark/5">
                                                    <img src={img.image_url} alt={img.caption || `Image ${idx + 1}`} className="w-full h-full object-cover" />
                                                </div>
                                                {img.caption && <p className="font-data text-[10px] text-brutal-dark/50 text-center mt-1.5">{img.caption}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Videos */}
                            {challenge.videos.length > 0 && (
                                <div className="cd-section">
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading mb-1">Reference Videos</h2>
                                    <div className="w-full h-px bg-brutal-dark/10 mb-5" />
                                    <div className="space-y-6">
                                        {challenge.videos.map((vid, idx) => (
                                            <div key={idx} className="relative w-full aspect-video rounded-2xl overflow-hidden border border-brutal-dark/10 bg-brutal-dark">
                                                <iframe
                                                    src={getEmbedUrl(vid.video_url)}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ─── RIGHT: Sidebar ─── */}
                    <div className="cd-sidebar space-y-6">
                        <div className="sticky top-32 space-y-6">
                            {/* Completion status / CTA */}
                            {completion ? (
                                <div className={`cd-sidebar-card w-full p-4 rounded-xl text-center font-heading font-bold uppercase text-sm ${
                                    completion.status === 'verified' ? 'bg-green-50 text-green-700 border border-green-200' :
                                    completion.status === 'declined' ? 'bg-brutal-red/5 text-brutal-red border border-brutal-red/20' :
                                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                }`}>
                                    {completion.status === 'verified' ? '✓ Verified Complete' :
                                     completion.status === 'declined' ? '✗ Declined' :
                                     '⏳ Pending Verification'}
                                </div>
                            ) : user ? (
                                <div className="cd-sidebar-card space-y-4">
                                    {!showCompleteForm ? (
                                        <Button size="lg" className="w-full" onClick={() => setShowCompleteForm(true)}>
                                            <CheckCircle2 size={16} className="mr-2" /> Mark as Completed
                                        </Button>
                                    ) : (
                                        <form onSubmit={handleMarkComplete} className="bg-brutal-dark/[0.03] rounded-xl p-5 border border-brutal-red/20 space-y-4">
                                            <h4 className="font-heading font-bold text-sm uppercase">Submit Evidence</h4>
                                            <div>
                                                <label className="block font-data text-[10px] font-bold text-brutal-dark/50 uppercase tracking-wider mb-1">Build Notes</label>
                                                <textarea
                                                    required
                                                    className="w-full bg-brutal-bg border border-brutal-dark/15 p-3 rounded-lg font-data min-h-[80px] text-sm
                                                               focus:outline-none focus:border-brutal-red/40 transition-colors"
                                                    placeholder="What did you make? What did you learn?"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-data text-[10px] font-bold text-brutal-dark/50 uppercase tracking-wider mb-1">Evidence URL (Optional)</label>
                                                <input
                                                    type="url"
                                                    className="w-full bg-brutal-bg border border-brutal-dark/15 p-3 rounded-lg font-data text-sm
                                                               focus:outline-none focus:border-brutal-red/40 transition-colors"
                                                    placeholder="GitHub, video, or photo link..."
                                                    value={evidenceUrl}
                                                    onChange={(e) => setEvidenceUrl(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowCompleteForm(false)}>Cancel</Button>
                                                <Button type="submit" className="flex-1" disabled={submitting}>
                                                    {submitting ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <CheckCircle2 size={14} className="mr-1.5" />}
                                                    Submit
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            ) : (
                                <Link to="/login" className="cd-sidebar-card block">
                                    <Button size="lg" className="w-full" variant="secondary">Log in to Track Progress</Button>
                                </Link>
                            )}

                            {/* Tier Access */}
                            <Card className="cd-sidebar-card p-5 border-brutal-dark/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${
                                        challenge.tier === 'Tier 1' ? 'bg-green-500' :
                                        challenge.tier === 'Tier 2' ? 'bg-yellow-500' : 'bg-brutal-red'
                                    }`} />
                                    <span className="font-data text-xs font-bold uppercase tracking-wider">Tier Access</span>
                                </div>
                                <p className="font-data text-xs text-brutal-dark/60 leading-relaxed">
                                    {challenge.tier === 'Tier 1' ? 'Open to all — no prerequisites.' :
                                     challenge.tier === 'Tier 2' ? 'Requires Tier 1 completion or direct domain experience.' :
                                     'Requires Tier 2 completion or mentor approval.'}
                                </p>
                            </Card>

                            {/* Required Materials */}
                            {challenge.materials.length > 0 && (
                                <Card className="cd-sidebar-card p-5 border-brutal-dark/10">
                                    <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-3">Required Materials</h4>
                                    <ul className="space-y-2">
                                        {challenge.materials.map((m, i) => (
                                            <li key={i} className="flex items-center gap-2 font-data text-xs text-brutal-dark/70">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brutal-dark/30 flex-shrink-0" /> {m}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            )}

                            {/* Tags */}
                            {challenge.tags.length > 0 && (
                                <div className="cd-sidebar-card">
                                    <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading mb-3">Tags</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {challenge.tags.map(t => (
                                            <span key={t} className="px-2.5 py-0.5 font-data text-[9px] font-bold uppercase tracking-wider text-brutal-red bg-brutal-red/5 rounded-full border border-brutal-red/15">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
