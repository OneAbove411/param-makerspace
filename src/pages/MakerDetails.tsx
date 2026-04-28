import React, { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useMaker } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { BadgeIcon } from '../components/ui/BadgeIcon';
import { RankBadge } from '../components/ui/RankBadge';
import { computeDomainLevels } from '../lib/domainLevel';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function SocialIcon({ href, iconId, label }: { href: string; iconId: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title={label}
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-brutal-dark/10 hover:border-brutal-dark hover:bg-brutal-dark/5 transition-colors"
        >
            <svg width="16" height="16">
                <use href={`/icons.svg#${iconId}`} />
            </svg>
        </a>
    );
}

function MakerDetailsSkeleton() {
    return (
        <div className="flex-1 w-full bg-brutal-bg pt-36 min-h-screen pb-32">
            <div className="max-w-5xl mx-auto px-6 md:px-12">
                <div className="h-4 w-32 bg-brutal-dark/5 rounded mb-12 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-6 animate-pulse">
                        <div className="aspect-square w-full rounded-2xl bg-brutal-dark/5" />
                        <div className="h-8 w-3/4 bg-brutal-dark/5 rounded" />
                        <div className="h-4 w-1/2 bg-brutal-dark/[0.03] rounded" />
                    </div>
                    <div className="md:col-span-2 space-y-8 animate-pulse">
                        <div className="h-6 w-1/3 bg-brutal-dark/5 rounded" />
                        <div className="h-4 w-full bg-brutal-dark/[0.03] rounded" />
                        <div className="h-4 w-5/6 bg-brutal-dark/[0.03] rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MakerDetails() {
    const { id } = useParams();
    const { data: maker, loading } = useMaker(id);
    const pageRef = useRef<HTMLDivElement>(null);

    const mentorDomains = (maker as any)?.mentor_domains?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
    const approvalDomains = (maker as any)?.approval_domains?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

    const progressionNames = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro'];
    const domainNames = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary'];

    const earnedProgression = maker ? maker.badges.filter(b => progressionNames.includes(b.name)) : [];
    const earnedDomain = maker ? maker.badges.filter(b => domainNames.includes(b.domain) && !progressionNames.includes(b.name)) : [];
    const earnedOther = maker ? maker.badges.filter(b => !progressionNames.includes(b.name) && !domainNames.includes(b.domain)) : [];

    // Compute per-domain level summary from earned domain badges
    const domainLevels = maker ? computeDomainLevels(maker.badges, false) : [];

    // GSAP
    useEffect(() => {
        if (loading || !maker) return;
        const ctx = gsap.context(() => {
            gsap.fromTo('.md-hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.1 }
            );
            gsap.utils.toArray<HTMLElement>('.md-section').forEach(el => {
                gsap.fromTo(el,
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out',
                      scrollTrigger: { trigger: el, start: 'top 85%' } }
                );
            });
        }, pageRef);
        return () => ctx.revert();
    }, [loading, maker]);

    if (loading) return <MakerDetailsSkeleton />;

    if (!maker) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-36 px-6 md:px-12 min-h-screen">
                <div className="max-w-5xl mx-auto">
                    <Link to="/makers" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-8">
                        <ArrowLeft size={14} /> Back to Directory
                    </Link>
                    <p className="font-data text-lg text-brutal-dark/50">Maker not found.</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            <section className="pt-36 pb-8 px-6 md:px-12 lg:px-24 max-w-5xl mx-auto">
                <Link to="/makers" className="md-hero-text inline-flex items-center gap-2 font-data text-xs font-bold uppercase text-brutal-dark/50 hover:text-brutal-red mb-10 transition-colors">
                    <ArrowLeft size={14} /> Back to Directory
                </Link>
            </section>

            <div className="px-6 md:px-12 lg:px-24 max-w-5xl mx-auto pb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {/* Profile Sidebar */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="md-hero-text aspect-square w-full rounded-2xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark">
                            {maker.avatar_url ? (
                                <img src={maker.avatar_url} alt={maker.display_name} loading="lazy" className="w-full h-full object-cover grayscale" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-heading text-8xl text-brutal-bg/20">
                                    {maker.display_name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                        </div>

                        <div className="md-hero-text">
                            <h1 className="font-heading font-bold text-3xl mb-2">{maker.display_name}</h1>

                            {(maker as any).show_email && maker.appUser?.email && (
                                <a href={`mailto:${maker.appUser.email}`} className="font-data text-xs text-brutal-dark/50 hover:text-brutal-red block mb-2">
                                    {maker.appUser.email}
                                </a>
                            )}

                            <div className="flex gap-2 flex-wrap mt-2">
                                {maker.github_url && <SocialIcon href={maker.github_url} iconId="github-icon" label="GitHub" />}
                                {maker.linkedin_url && <SocialIcon href={maker.linkedin_url} iconId="social-icon" label="LinkedIn" />}
                                {(maker as any).instagram_url && <SocialIcon href={(maker as any).instagram_url} iconId="social-icon" label="Instagram" />}
                                {maker.website_url && (
                                    <a href={maker.website_url} target="_blank" rel="noreferrer" title="Website"
                                        className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-brutal-dark/10 hover:border-brutal-dark hover:bg-brutal-dark/5 transition-colors font-data text-xs font-bold text-brutal-dark/60">
                                        www
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Mentor Identity Block */}
                        {maker.appUser?.role === 'mentor' && (
                            <div className="md-hero-text p-4 bg-brutal-dark text-brutal-bg rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-data text-[10px] font-bold uppercase tracking-widest text-brutal-red">Mentor</span>
                                </div>
                                {mentorDomains.length > 0 && (
                                    <div>
                                        <span className="font-data text-[9px] text-brutal-bg/40 uppercase block mb-1.5 tracking-widest">Guides in</span>
                                        <div className="flex flex-wrap gap-1">
                                            {mentorDomains.map((d: string) => (
                                                <span key={d} className="px-2 py-0.5 bg-brutal-bg/10 text-brutal-bg rounded font-data text-[10px] font-bold">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {approvalDomains.length > 0 && (
                                    <div>
                                        <span className="font-data text-[9px] text-brutal-bg/40 uppercase block mb-1.5 tracking-widest">Approves in</span>
                                        <div className="flex flex-wrap gap-1">
                                            {approvalDomains.map((d: string) => (
                                                <span key={d} className="px-2 py-0.5 bg-brutal-red/30 text-brutal-bg rounded font-data text-[10px] font-bold">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rank Badge */}
                        <div className="md-hero-text">
                            <RankBadge rank={maker.appUser?.rank || 'Curious'} xp={maker.appUser?.xp || 0} variant="card" />
                        </div>

                        {/* Domain Levels */}
                        {maker.domainLevels.length > 0 && (
                            <div className="md-section space-y-2">
                                <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 tracking-widest block mb-2">Domain Levels</span>
                                {maker.domainLevels.map(dl => (
                                    <div key={dl.domain} className="flex items-center justify-between p-2.5 bg-brutal-bg border border-brutal-dark/8 rounded-xl">
                                        <span className="font-data text-xs font-bold text-brutal-dark">{dl.domain}</span>
                                        <span className={`font-data text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                            dl.tier === 'Tier 3' ? 'bg-brutal-red text-brutal-bg' :
                                            dl.tier === 'Tier 2' ? 'bg-brutal-dark text-brutal-bg' :
                                            'bg-brutal-dark/10 text-brutal-dark'
                                        }`}>{dl.tier}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Skills & Tags */}
                        {(maker.skills.length > 0 || maker.tags.length > 0) && (
                            <div className="md-section space-y-4 bg-brutal-dark/[0.03] rounded-2xl p-5 border border-brutal-dark/8">
                                {maker.skills.length > 0 && (
                                    <div>
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 tracking-widest block mb-2">Skills</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {maker.skills.map(s => (
                                                <span key={s} className="px-2 py-0.5 bg-brutal-bg border border-brutal-dark/15 rounded text-[10px] font-data font-bold">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {maker.tags.length > 0 && (
                                    <div>
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 tracking-widest block mb-2">Tags</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {maker.tags.map(t => (
                                                <span key={t} className="px-2 py-0.5 bg-brutal-red/10 border border-brutal-red/15 text-brutal-red rounded text-[10px] font-data font-bold uppercase">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-10">
                        {maker.bio && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">01</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Bio</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />
                                <p className="font-data text-sm text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">{maker.bio}</p>
                            </section>
                        )}

                        {maker.aspirations && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">02</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Aspirations</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />
                                <p className="font-data text-sm text-brutal-dark/70 italic border-l-2 border-brutal-red pl-4">"{maker.aspirations}"</p>
                            </section>
                        )}

                        {maker.projects.length > 0 && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">03</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Public Projects</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />
                                <div className="space-y-3">
                                    {maker.projects.map(p => (
                                        <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                                            <Card className="flex items-center gap-5 p-4 hover:border-brutal-dark/25 transition-colors">
                                                <div className="w-16 h-16 rounded-xl bg-brutal-dark/5 flex items-center justify-center font-heading text-xl text-brutal-dark/15 flex-shrink-0">
                                                    {p.title?.[0]?.toUpperCase() || 'P'}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h4 className="font-heading font-bold text-base group-hover:text-brutal-red transition-colors">{p.title}</h4>
                                                    <p className="font-data text-xs text-brutal-dark/55 line-clamp-1">{p.summary}</p>
                                                </div>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Events Attended */}
                        {maker.eventsAttended.length > 0 && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">04</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Events</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />
                                <div className="flex flex-wrap gap-2">
                                    {maker.eventsAttended.map(event => (
                                        <Link
                                            key={event.id}
                                            to={`/events/${event.id}`}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-full hover:border-brutal-red/30 hover:bg-brutal-red/5 transition-colors"
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                event.event_type === 'build_challenge' ? 'bg-brutal-red' :
                                                event.event_type === 'tech_tuesday' ? 'bg-brutal-dark/40' :
                                                'bg-brutal-dark'
                                            }`} />
                                            <span className="font-data text-xs font-bold">{event.title}</span>
                                            <span className="font-data text-[10px] text-brutal-dark/35">
                                                {new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Projects Mentored */}
                        {maker.appUser?.role === 'mentor' && maker.mentoredProjects.length > 0 && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">05</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Projects Mentored</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />
                                <div className="space-y-2">
                                    {maker.mentoredProjects.map(p => (
                                        <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                                            <div className="flex items-center gap-3 p-3 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl hover:border-brutal-red/30 transition-colors">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brutal-red flex-shrink-0" />
                                                <div>
                                                    <span className="font-heading font-bold text-sm block group-hover:text-brutal-red transition-colors">{p.title}</span>
                                                    {p.domain && <span className="font-data text-[10px] text-brutal-dark/40 uppercase">{p.domain}</span>}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {maker.badges.length > 0 && (
                            <section className="md-section">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest">06</span>
                                    <h2 className="font-heading font-bold text-lg uppercase tracking-tight-heading">Badges Earned</h2>
                                </div>
                                <div className="w-12 h-px bg-brutal-dark/10 mb-4" />

                                {earnedProgression.length > 0 && (
                                    <div className="mb-6">
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 block mb-3 tracking-widest">Progression Level</span>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {progressionNames.map((name, i) => {
                                                const earned = earnedProgression.some(b => b.name === name);
                                                const badge = maker.badges.find(b => b.name === name) || { name, badge_type: 'achievement', domain: 'General', tier: 'Tier 1', image_url: null };
                                                return (
                                                    <React.Fragment key={name}>
                                                        <div title={name} className={`transition-all ${earned ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                                            <BadgeIcon badge={badge as any} size="sm" />
                                                        </div>
                                                        {i < 5 && <div className={`w-3 sm:w-5 h-px ${earned ? 'bg-brutal-dark' : 'bg-brutal-dark/15'}`} />}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                        <div className="font-data text-[10px] text-brutal-dark/40 mt-2">
                                            Current level: <strong className="text-brutal-dark/60">{earnedProgression[earnedProgression.length - 1]?.name || 'Curious'}</strong>
                                        </div>
                                    </div>
                                )}

                                {domainLevels.length > 0 && (
                                    <div className="mb-6">
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 block mb-3 tracking-widest">Domain Levels</span>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {domainLevels.map(dl => (
                                                <div
                                                    key={dl.domain}
                                                    className="flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/10 rounded-xl bg-brutal-bg"
                                                >
                                                    <div
                                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                            dl.tierRank >= 3 ? 'bg-brutal-red' :
                                                            dl.tierRank >= 2 ? 'bg-yellow-500' :
                                                            dl.tierRank >= 1 ? 'bg-green-500' :
                                                            'bg-brutal-dark/20'
                                                        }`}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="font-data text-[10px] font-bold truncate">{dl.domain}</div>
                                                        <div className="font-data text-[9px] text-brutal-dark/45">{dl.level}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {earnedDomain.length > 0 && (
                                    <div className="mb-6">
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 block mb-3 tracking-widest">Domain Achievements</span>
                                        <div className="flex flex-wrap gap-2">
                                            {earnedDomain.map(badge => (
                                                <div key={badge.id} title={badge.name} className="flex items-center gap-2 px-3 py-1.5 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl">
                                                    <BadgeIcon badge={badge as any} size="sm" />
                                                    <div>
                                                        <div className="font-data text-[10px] font-bold">{badge.name}</div>
                                                        <div className="font-data text-[9px] text-brutal-dark/35 uppercase">{badge.domain}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {earnedOther.length > 0 && (
                                    <div>
                                        <span className="font-data text-[9px] font-bold uppercase text-brutal-dark/30 block mb-3 tracking-widest">Other Badges</span>
                                        <div className="flex flex-wrap gap-2">
                                            {earnedOther.map(badge => (
                                                <div key={badge.id} title={badge.criteria || badge.name} className="flex items-center gap-2 px-3 py-1.5 bg-brutal-dark/[0.03] border border-brutal-dark/8 rounded-xl">
                                                    <BadgeIcon badge={badge as any} size="sm" />
                                                    <span className="font-data text-[10px] font-bold">{badge.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
