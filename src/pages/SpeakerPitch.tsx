import React from 'react';
import { Mic2 } from 'lucide-react';
import { PitchForm } from '../components/speakers/PitchForm';

/**
 * SpeakerPitch — standalone /speak route.
 *
 * Hosts the same PitchForm used in the event-detail footer, but with
 * a hero framing so people arriving from a shared link know exactly
 * what they're about to fill out.
 */

export function SpeakerPitch() {
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* ── HERO ── */}
            <section className="relative min-h-[32vh] md:min-h-[36vh] flex items-end bg-brutal-dark">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(245,243,238,0.04) 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/85 to-brutal-dark/50" />

                <div className="relative z-10 w-full px-6 md:px-12 lg:px-24 pb-10 md:pb-12 pt-32 md:pt-36 max-w-5xl mx-auto">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-brutal-red text-brutal-bg px-2.5 py-0.5 font-data text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <Mic2 className="w-3 h-3" /> Pitch a talk
                        </span>
                    </div>
                    <h1 className="font-heading font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight-heading leading-[0.95] text-brutal-bg max-w-3xl">
                        Got something you'd love to share with the Param community?
                    </h1>
                    <p className="font-data text-sm md:text-base text-brutal-bg/60 mt-4 max-w-2xl">
                        Fill out the pitch below. We review every submission and reach out within a week — whether to slot you into an upcoming event or to explain why we're passing for now.
                    </p>
                </div>
            </section>

            {/* ── BODY ── */}
            <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-14">
                <PitchForm />

                <div className="mt-8 p-5 bg-brutal-dark/[0.03] border border-brutal-dark/10 rounded-xl">
                    <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-brutal-dark mb-2">
                        What happens next
                    </h3>
                    <ol className="font-data text-sm text-brutal-dark/75 space-y-1.5 list-decimal list-inside">
                        <li>Your pitch lands in our triage queue.</li>
                        <li>A Param admin reviews it within 7 days.</li>
                        <li>If it's a fit, we'll email you to lock a date — otherwise we'll let you know why and what would help next time.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default SpeakerPitch;
