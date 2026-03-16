import React from 'react';
import { useBadges } from '../lib/hooks';
import { Card } from '../components/ui/Card';

export function Badges() {
    const { data: badges, loading } = useBadges();

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                        {(badges || []).map(badge => (
                            <Card key={badge.id} className="h-full flex flex-col hover:shadow-2xl transition-all duration-300 pointer-events-auto">
                                <div className="h-40 w-full overflow-hidden bg-brutal-dark relative p-4 flex items-center justify-center">
                                    {badge.image_url ? (
                                        <img
                                            src={badge.image_url}
                                            alt={badge.name}
                                            className="w-24 h-24 object-cover rounded-full border-4 border-brutal-bg shadow-lg"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-brutal-bg/20 flex items-center justify-center font-heading text-3xl text-brutal-bg font-bold">
                                            {badge.name?.[0]?.toUpperCase() || 'B'}
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <span className="bg-brutal-bg text-brutal-dark px-2 py-1 text-[10px] uppercase font-bold font-data rounded border shadow-sm">{badge.badge_type}</span>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex gap-2 flex-wrap mb-4">
                                        <span className="text-[10px] bg-brutal-dark/5 px-2 py-1 rounded font-data font-bold uppercase tracking-wider text-brutal-dark/70">
                                            {badge.tier}
                                        </span>
                                        <span className="text-[10px] bg-brutal-dark/5 px-2 py-1 rounded font-data font-bold uppercase tracking-wider text-brutal-dark/70">
                                            {badge.domain}
                                        </span>
                                    </div>
                                    <h3 className="font-heading font-bold text-xl mb-2 leading-tight">{badge.name}</h3>
                                    <p className="font-data text-sm text-brutal-dark/70 mb-4">{badge.description}</p>
                                    <div className="mt-auto border-t border-brutal-dark/10 pt-4">
                                        <span className="font-data text-[10px] text-brutal-dark/50 uppercase tracking-widest block mb-1">Criteria</span>
                                        <p className="font-data text-xs font-bold text-brutal-dark">{badge.criteria}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {(badges || []).length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center font-data text-brutal-dark/50 border-2 border-dashed border-brutal-dark/20 rounded-2xl">
                                No badges available yet.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
