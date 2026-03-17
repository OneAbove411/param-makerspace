import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMaker } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { BadgeIcon } from '../components/ui/BadgeIcon';
import { RankBadge } from '../components/ui/RankBadge';

function SocialIcon({ href, iconId, label }: { href: string; iconId: string; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title={label}
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-brutal-dark/10 hover:border-brutal-dark hover:bg-brutal-dark/5 transition-colors interactive-lift"
        >
            <svg width="16" height="16">
                <use href={`/icons.svg#${iconId}`} />
            </svg>
        </a>
    );
}

export function MakerDetails() {
    const { id } = useParams();
    const { data: maker, loading } = useMaker(id);

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading maker profile...</div>;
    }

    if (!maker) {
        return <div className="pt-32 px-12 font-data text-2xl">Maker not found.</div>;
    }

    const mentorDomains = (maker as any).mentor_domains?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
    const approvalDomains = (maker as any).approval_domains?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];

    const progressionNames = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro'];
    const domainNames = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary'];

    const earnedProgression = maker.badges.filter(b => progressionNames.includes(b.name));
    const earnedDomain = maker.badges.filter(b => domainNames.includes(b.domain) && !progressionNames.includes(b.name));
    const earnedOther = maker.badges.filter(b => !progressionNames.includes(b.name) && !domainNames.includes(b.domain));

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

                            {/* Privacy-gated email */}
                            {(maker as any).show_email && maker.appUser?.email && (
                                <a href={`mailto:${maker.appUser.email}`} className="font-data text-sm text-brutal-dark/60 hover:text-brutal-red block mb-2">
                                    {maker.appUser.email}
                                </a>
                            )}

                            {/* Social Icons */}
                            <div className="flex gap-2 flex-wrap mt-2">
                                {maker.github_url && <SocialIcon href={maker.github_url} iconId="github-icon" label="GitHub" />}
                                {maker.linkedin_url && <SocialIcon href={maker.linkedin_url} iconId="social-icon" label="LinkedIn" />}
                                {(maker as any).x_url && <SocialIcon href={(maker as any).x_url} iconId="x-icon" label="X" />}
                                {(maker as any).bluesky_url && <SocialIcon href={(maker as any).bluesky_url} iconId="bluesky-icon" label="Bluesky" />}
                                {maker.website_url && (
                                    <a href={maker.website_url} target="_blank" rel="noreferrer" title="Website"
                                        className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-brutal-dark/10 hover:border-brutal-dark hover:bg-brutal-dark/5 transition-colors interactive-lift font-data text-xs font-bold text-brutal-dark/60">
                                        www
                                    </a>
                                )}
                                {(maker as any).discord_username && (
                                    <div title={`Discord: ${(maker as any).discord_username}`}
                                        className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-brutal-dark/10 hover:border-brutal-dark/30 transition-colors cursor-default">
                                        <svg width="16" height="16"><use href="/icons.svg#discord-icon" /></svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mentor Identity Block */}
                        {maker.appUser?.role === 'mentor' && (
                            <div className="p-4 bg-brutal-dark text-brutal-bg rounded-2xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-data text-xs font-bold uppercase tracking-widest text-brutal-red">Mentor</span>
                                </div>
                                {mentorDomains.length > 0 && (
                                    <div>
                                        <span className="font-data text-[10px] text-brutal-bg/50 uppercase block mb-2">Guides in</span>
                                        <div className="flex flex-wrap gap-1">
                                            {mentorDomains.map((d: string) => (
                                                <span key={d} className="px-2 py-1 bg-brutal-bg/10 text-brutal-bg rounded font-data text-xs font-bold">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {approvalDomains.length > 0 && (
                                    <div>
                                        <span className="font-data text-[10px] text-brutal-bg/50 uppercase block mb-2">Approves in</span>
                                        <div className="flex flex-wrap gap-1">
                                            {approvalDomains.map((d: string) => (
                                                <span key={d} className="px-2 py-1 bg-brutal-red/30 text-brutal-bg rounded font-data text-xs font-bold">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rank Badge */}
                        <div className="mb-4">
                            <RankBadge rank={maker.appUser?.rank || 'Curious'} xp={maker.appUser?.xp || 0} variant="card" />
                        </div>

                        {/* Domain Levels */}
                        {maker.domainLevels.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-data text-xs font-bold uppercase text-brutal-dark/50 mb-3">Domain Levels</h3>
                                {maker.domainLevels.map(dl => (
                                    <div key={dl.domain} className="flex items-center justify-between p-3 bg-brutal-bg border border-brutal-dark/10 rounded-xl">
                                        <span className="font-data text-sm font-bold text-brutal-dark">{dl.domain}</span>
                                        <span className={`font-data text-xs font-bold px-2 py-1 rounded uppercase ${
                                            dl.tier === 'Tier 3' ? 'bg-brutal-red text-brutal-bg' :
                                            dl.tier === 'Tier 2' ? 'bg-brutal-dark text-brutal-bg' :
                                            'bg-brutal-dark/10 text-brutal-dark'
                                        }`}>{dl.tier}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Skills & Tags */}
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

                        {/* Events Attended */}
                        {maker.eventsAttended.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">
                                    Events
                                </h2>
                                <div className="flex flex-wrap gap-3">
                                    {maker.eventsAttended.map(event => (
                                        <Link
                                            key={event.id}
                                            to={`/events/${event.id}`}
                                            className="flex items-center gap-2 px-4 py-2 bg-brutal-dark/5 border border-brutal-dark/10 rounded-full hover:border-brutal-red hover:bg-brutal-red/5 transition-colors interactive-lift"
                                        >
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                event.event_type === 'build_challenge' ? 'bg-brutal-red' :
                                                event.event_type === 'tech_tuesday' ? 'bg-brutal-dark/40' :
                                                'bg-brutal-dark'
                                            }`} />
                                            <span className="font-data text-sm font-bold">{event.title}</span>
                                            <span className="font-data text-xs text-brutal-dark/40">
                                                {new Date(event.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Projects Mentored */}
                        {maker.appUser?.role === 'mentor' && maker.mentoredProjects.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">
                                    Projects Mentored
                                </h2>
                                <div className="space-y-3">
                                    {maker.mentoredProjects.map(p => (
                                        <Link key={p.id} to={`/projects/${p.id}`} className="block interactive-lift">
                                            <div className="flex items-center gap-4 p-4 bg-brutal-dark/5 border border-brutal-dark/10 rounded-xl hover:border-brutal-red transition-colors">
                                                <div className="w-2 h-2 rounded-full bg-brutal-red flex-shrink-0" />
                                                <div>
                                                    <span className="font-heading font-bold text-lg block">{p.title}</span>
                                                    {p.domain && <span className="font-data text-xs text-brutal-dark/50 uppercase">{p.domain}</span>}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {maker.badges.length > 0 && (
                            <section>
                                <h2 className="font-heading font-bold text-3xl mb-6 uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4">Badges Earned</h2>
                                
                                {earnedProgression.length > 0 && (
                                    <div className="mb-8">
                                        <span className="font-data text-xs font-bold uppercase text-brutal-dark/50 block mb-3">Progression Level</span>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {progressionNames.map((name, i) => {
                                                const earned = earnedProgression.some(b => b.name === name);
                                                const badge = maker.badges.find(b => b.name === name) || { name, badge_type: 'achievement', domain: 'General', tier: 'Tier 1', image_url: null };
                                                return (
                                                    <React.Fragment key={name}>
                                                        <div title={name} className={`transition-all ${earned ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                                            <BadgeIcon badge={badge as any} size="sm" />
                                                        </div>
                                                        {i < 5 && <div className={`w-3 sm:w-6 h-px ${earned ? 'bg-brutal-dark' : 'bg-brutal-dark/20'}`} />}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                        <div className="font-data text-xs text-brutal-dark/50 mt-2">
                                            Current level: <strong>{earnedProgression[earnedProgression.length - 1]?.name || 'Curious'}</strong>
                                        </div>
                                    </div>
                                )}

                                {earnedDomain.length > 0 && (
                                    <div className="mb-8">
                                        <span className="font-data text-xs font-bold uppercase text-brutal-dark/50 block mb-3">Domain Achievements</span>
                                        <div className="flex flex-wrap gap-2">
                                            {earnedDomain.map(badge => (
                                                <div key={badge.id} title={badge.name} className="flex items-center gap-2 px-3 py-2 bg-brutal-dark/5 border border-brutal-dark/10 rounded-xl">
                                                    <BadgeIcon badge={badge as any} size="sm" />
                                                    <div>
                                                        <div className="font-data text-xs font-bold">{badge.name}</div>
                                                        <div className="font-data text-[10px] text-brutal-dark/40 uppercase">{badge.domain}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {earnedOther.length > 0 && (
                                    <div>
                                        <span className="font-data text-xs font-bold uppercase text-brutal-dark/50 block mb-3">Other Badges</span>
                                        <div className="flex flex-wrap gap-2">
                                            {earnedOther.map(badge => (
                                                <div key={badge.id} title={badge.criteria || badge.name} className="flex items-center gap-2 px-3 py-2 bg-brutal-dark/5 border border-brutal-dark/10 rounded-xl hover:bg-brutal-dark/10 transition-colors cursor-default">
                                                    <BadgeIcon badge={badge as any} size="sm" />
                                                    <span className="font-data text-xs font-bold">{badge.name}</span>
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
