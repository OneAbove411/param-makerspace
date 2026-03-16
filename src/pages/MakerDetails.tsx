import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMaker } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Github, Linkedin, ArrowLeft, Globe } from 'lucide-react';

export function MakerDetails() {
    const { id } = useParams();
    const { data: maker, loading } = useMaker(id);

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading maker profile...</div>;
    }

    if (!maker) {
        return <div className="pt-32 px-12 font-data text-2xl">Maker not found.</div>;
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 min-h-screen pb-32">
            <div className="max-w-5xl mx-auto px-6 md:px-12">
                <Link to="/makers" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-12 interactive-lift">
                    <ArrowLeft className="w-4 h-4" /> Back to Directory
                </Link>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Profile Sidebar */}
                    <div className="md:col-span-1 space-y-8">
                        <div className="aspect-square w-full rounded-[2rem] overflow-hidden border-2 border-brutal-dark/10 shadow-xl bg-brutal-dark">
                            {maker.avatar_url ? (
                                <img src={maker.avatar_url} alt={maker.display_name} className="w-full h-full object-cover grayscale" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-heading text-9xl text-brutal-bg/20">
                                    {maker.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>

                        <div>
                            <h1 className="font-heading font-bold text-4xl mb-2">{maker.display_name}</h1>
                            <div className="flex gap-4">
                                {maker.github_url && (
                                    <a href={maker.github_url} target="_blank" rel="noreferrer" className="text-brutal-dark/60 hover:text-brutal-dark">
                                        <Github className="w-6 h-6" />
                                    </a>
                                )}
                                {maker.linkedin_url && (
                                    <a href={maker.linkedin_url} target="_blank" rel="noreferrer" className="text-brutal-dark/60 hover:text-brutal-dark">
                                        <Linkedin className="w-6 h-6" />
                                    </a>
                                )}
                                {maker.website_url && (
                                    <a href={maker.website_url} target="_blank" rel="noreferrer" className="text-brutal-dark/60 hover:text-brutal-dark">
                                        <Globe className="w-6 h-6" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6 bg-brutal-dark/5 rounded-3xl p-6 border border-brutal-dark/10">
                            {maker.skills.length > 0 && (
                                <div>
                                    <h3 className="font-data text-xs font-bold uppercase text-brutal-dark/50 mb-2">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {maker.skills.map(s => (
                                            <span key={s} className="px-2 py-1 bg-brutal-bg border border-brutal-dark/20 rounded text-xs font-data font-bold">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {maker.tags.length > 0 && (
                                <div>
                                    <h3 className="font-data text-xs font-bold uppercase text-brutal-dark/50 mb-2">Tags</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {maker.tags.map(t => (
                                            <span key={t} className="px-2 py-1 bg-brutal-red/10 border border-brutal-red/20 text-brutal-red rounded text-xs font-data font-bold uppercase">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-12">
                        {maker.bio && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">Bio</h2>
                                <p className="font-data text-lg text-brutal-dark/80 whitespace-pre-wrap">{maker.bio}</p>
                            </section>
                        )}

                        {maker.aspirations && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">Aspirations</h2>
                                <p className="font-data text-lg text-brutal-dark/80 italic border-l-4 border-brutal-red pl-4">"{maker.aspirations}"</p>
                            </section>
                        )}

                        {maker.projects.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">Public Projects</h2>
                                <div className="space-y-4">
                                    {maker.projects.map(p => (
                                        <Link key={p.id} to={`/projects/${p.id}`} className="block interactive-lift">
                                            <Card className="flex items-center gap-6 p-4 hover:border-brutal-red transition-colors">
                                                <div className="w-24 h-24 rounded-xl bg-brutal-dark/10 flex items-center justify-center font-heading text-2xl text-brutal-dark/20 flex-shrink-0">
                                                    {p.title?.[0]?.toUpperCase() || 'P'}
                                                </div>
                                                <div>
                                                    <h4 className="font-heading font-bold text-xl">{p.title}</h4>
                                                    <p className="font-data text-sm text-brutal-dark/70 line-clamp-1">{p.summary}</p>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {maker.badges.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">Badges Earned</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {maker.badges.map(b => (
                                        <div key={b.id} className="flex gap-4 items-center bg-brutal-dark/5 p-4 rounded-2xl border border-brutal-dark/10">
                                            {b.image_url ? (
                                                <img src={b.image_url} alt={b.name} className="w-16 h-16 rounded-full object-cover border-2 border-brutal-bg shadow-sm" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-brutal-dark flex items-center justify-center text-brutal-bg font-heading font-bold text-xl">
                                                    {b.name?.[0]?.toUpperCase() || 'B'}
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-heading font-bold text-sm leading-tight">{b.name}</h4>
                                                <span className="font-data text-[10px] uppercase font-bold text-brutal-dark/50">{b.tier} // {b.badge_type}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
