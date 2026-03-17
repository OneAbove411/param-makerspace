import React from 'react';
import { useBadges, useUserBadges } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { BadgeIcon } from '../components/ui/BadgeIcon';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function Badges() {
    const { user } = useAuth();
    const { data: badges, loading } = useBadges();
    const { data: myBadges } = useUserBadges(user?.id);
    const earnedIds = new Set((myBadges || []).map(ub => ub.badge_id));

    const progressionNames = ['Curious', 'Tinkerer', 'Builder', 'Maker', 'Innovator', 'Lab Pro'];
    const domainNames = ['Electronics', 'Robotics', 'AI', 'Design', 'Fabrication', 'Bio', 'Interdisciplinary'];

    const progressionBadges = (badges || []).filter(b => progressionNames.includes(b.name));
    const domainBadges = (badges || []).filter(b => domainNames.includes(b.domain) && !progressionNames.includes(b.name));
    const otherBadges = (badges || []).filter(b => !progressionNames.includes(b.name) && !domainNames.includes(b.domain));

    const domainGroups = domainNames.reduce((acc, domain) => {
        acc[domain] = domainBadges.filter(b => b.domain === domain);
        return acc;
    }, {} as Record<string, typeof badges>);

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-7xl uppercase tracking-tight-heading mb-6">
                    Badge Catalog
                </h1>
                <p className="font-data text-xl text-brutal-dark/60 max-w-2xl border-l-4 border-brutal-red pl-4 mb-16">
                    Earn badges by joining inductions and completing specific challenges to unlock store items and equipment access.
                </p>

                {loading ? (
                    <div className="py-20 text-center font-data text-brutal-dark/50">Loading badges...</div>
                ) : (
                    <div className="pb-32">
                        {/* PLATFORM PROGRESSION */}
                        <section className="mb-16">
                            <h2 className="font-heading font-bold text-3xl uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4 mb-8">
                                Platform Progression
                            </h2>
                            <div className="flex items-center gap-2 overflow-x-auto pb-4">
                                {progressionBadges.map((badge, index) => (
                                    <React.Fragment key={badge.id}>
                                        <div className={`flex-shrink-0 relative w-40 p-5 rounded-2xl border-2 text-center transition-all ${
                                            earnedIds.has(badge.id)
                                                ? 'bg-brutal-dark border-brutal-dark text-brutal-bg'
                                                : 'bg-brutal-bg border-brutal-dark/10 text-brutal-dark/50'
                                        }`}>
                                            <div className="flex justify-center mb-3">
                                                <BadgeIcon badge={badge as any} size="md" />
                                            </div>
                                            <div className="font-heading font-bold text-sm uppercase">{badge.name}</div>
                                            <div className="font-data text-[10px] mt-1 opacity-70 line-clamp-2">{badge.criteria}</div>
                                            {earnedIds.has(badge.id) && (
                                                <div className="absolute top-3 right-3 bg-brutal-dark text-brutal-bg px-2 py-0.5 rounded-full font-data text-[10px] font-bold uppercase flex items-center gap-1 border border-brutal-bg/20 shadow-sm z-10">
                                                    <CheckCircle2 size={10} /> Earned
                                                </div>
                                            )}
                                        </div>
                                        {index < progressionBadges.length - 1 && (
                                            <div className="font-data text-brutal-dark/20 text-xl flex-shrink-0">→</div>
                                        )}
                                    </React.Fragment>
                                ))}
                                {progressionBadges.length === 0 && (
                                    <div className="text-brutal-dark/50 font-data italic text-sm">No progression badges found.</div>
                                )}
                            </div>
                        </section>

                        {/* DOMAIN BADGES */}
                        <section className="mb-16">
                            <h2 className="font-heading font-bold text-3xl uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4 mb-8">
                                Domain Badges
                            </h2>
                            <div className="space-y-6">
                                {domainNames.map(domain => {
                                    const domainGroup = domainGroups[domain] || [];
                                    if (domainGroup.length === 0) return null;
                                    return (
                                        <div key={domain} className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 border-b border-brutal-dark/5 pb-6 last:border-0 last:pb-0">
                                            <div className="w-32 flex-shrink-0">
                                                <span className="font-heading font-bold text-lg uppercase">{domain}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4">
                                                {domainGroup.map(badge => (
                                                    <div key={badge.id} className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                                                        earnedIds.has(badge.id)
                                                            ? 'bg-brutal-dark border-brutal-dark'
                                                            : 'bg-brutal-bg border-brutal-dark/10'
                                                    }`}>
                                                        <BadgeIcon badge={badge as any} size="sm" />
                                                        <div>
                                                            <div className={`font-data text-xs font-bold uppercase ${earnedIds.has(badge.id) ? 'text-brutal-bg' : 'text-brutal-dark/50'}`}>
                                                                {badge.tier}
                                                            </div>
                                                            {earnedIds.has(badge.id) && (
                                                                <div className="font-data text-[10px] text-brutal-red font-bold uppercase mt-0.5 leading-none">✓ Earned</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.values(domainGroups).every(g => !g || g.length === 0) && (
                                    <div className="text-brutal-dark/50 font-data italic text-sm">No domain badges found.</div>
                                )}
                            </div>
                        </section>

                        {/* OTHER BADGES */}
                        {otherBadges.length > 0 && (
                            <section className="mb-16">
                                <h2 className="font-heading font-bold text-3xl uppercase tracking-tight-heading border-b-2 border-brutal-dark/10 pb-4 mb-8">
                                    Other Badges
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {otherBadges.map(badge => (
                                        <Card key={badge.id} className="h-full flex flex-col hover:shadow-2xl transition-all duration-300 pointer-events-auto relative">
                                            {earnedIds.has(badge.id) && (
                                                <div className="absolute top-4 right-4 bg-brutal-dark text-brutal-bg px-2 py-0.5 rounded-full font-data text-[10px] font-bold uppercase flex items-center gap-1 z-10">
                                                    <CheckCircle2 size={10} /> Earned
                                                </div>
                                            )}
                                            <div className={`h-40 w-full overflow-hidden relative p-4 flex items-center justify-center ${earnedIds.has(badge.id) ? 'bg-brutal-dark' : 'bg-brutal-dark/5'}`}>
                                                <BadgeIcon badge={badge as any} size="xl" className={earnedIds.has(badge.id) ? '' : 'opacity-50'} />
                                                <div className="absolute top-4 left-4 flex gap-2">
                                                    <span className={`px-2 py-1 text-[10px] uppercase font-bold font-data rounded border shadow-sm ${earnedIds.has(badge.id) ? 'bg-brutal-bg text-brutal-dark border-transparent' : 'bg-brutal-bg/80 text-brutal-dark/70 border-brutal-dark/20'}`}>
                                                        {badge.badge_type}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col">
                                                <h3 className="font-heading font-bold text-xl mb-2 leading-tight">{badge.name}</h3>
                                                <p className="font-data text-sm text-brutal-dark/70 mb-4">{badge.description}</p>
                                                <div className="mt-auto border-t border-brutal-dark/10 pt-4">
                                                    <span className="font-data text-[10px] text-brutal-dark/50 uppercase tracking-widest block mb-1">Criteria</span>
                                                    <p className="font-data text-xs font-bold text-brutal-dark">{badge.criteria}</p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
