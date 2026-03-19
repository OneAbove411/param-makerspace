import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { DiagnosticShuffler } from '../components/home/DiagnosticShuffler';
import { TelemetryTypewriter } from '../components/home/TelemetryTypewriter';
import { CursorProtocolScheduler } from '../components/home/CursorProtocolScheduler';
import { Philosophy } from '../components/home/Philosophy';
import { Protocol } from '../components/home/Protocol';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Home() {
    const navigate = useNavigate();
    const heroRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Animation
            gsap.fromTo('.hero-text',
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, stagger: 0.08, ease: 'power3.out', delay: 0.2 }
            );
        }, heroRef);
        return () => ctx.revert();
    }, []);

    return (
        <div className="flex-1 w-full bg-brutal-bg overflow-hidden relative">
            <div ref={heroRef} className="h-[100dvh] w-full relative flex flex-col justify-end pb-24 px-6 md:px-12 lg:px-24">
                {/* Hero Background with Gradient */}
                    <div className="absolute inset-0 z-0 h-full w-full bg-brutal-dark">
                        <img
                            src="https://images.unsplash.com/photo-1595054320257-2ca671c2ba43?q=80&w=2070&auto=format&fit=crop"
                            alt="Makerspace concrete"
                            className="w-full h-full object-cover object-center"
                            loading="eager"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    <div className="absolute inset-0 bg-gradient-to-t from-brutal-dark via-brutal-dark/60 to-transparent" />
                </div>

                {/* Hero Content positioned bottom-left third */}
                <div className="relative z-10 w-full max-w-4xl text-brutal-bg">
                    <h1 className="flex flex-col gap-2">
                        <span className="hero-text font-heading font-bold text-2xl md:text-3xl lg:text-5xl uppercase tracking-tight-heading">
                            A Platform to build the
                        </span>
                        <span className="hero-text font-drama italic text-7xl md:text-9xl text-brutal-red leading-[0.8]">
                            Future.
                        </span>
                    </h1>
                    <p className="hero-text mt-8 font-data font-medium text-lg text-brutal-bg/80 md:w-2/3">
                        The Param Makerspace is a community-driven platform designed to equally support structured learning, community event participation, and collaborative project execution.
                    </p>
                    <div className="hero-text mt-10">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto uppercase font-bold text-sm tracking-widest shadow-[0_0_40px_rgba(230,59,46,0.3)] hover:shadow-[0_0_60px_rgba(230,59,46,0.5)]"
                            onClick={() => navigate('/register')}
                        >
                            Start As Curious
                        </Button>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <section className="py-32 px-6 md:px-12 lg:px-24 bg-brutal-bg isolate">
                <h2 className="font-heading font-bold text-4xl mb-16 tracking-tight-heading max-w-2xl uppercase">
                    Core Capabilities Overview
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DiagnosticShuffler />
                    <TelemetryTypewriter />
                    <CursorProtocolScheduler />
                </div>
            </section>

            <Philosophy />

            <Protocol />
        </div>
    );
}
