import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { PageTransition } from './PageTransition';
import { RankUpModal } from '../ui/RankUpModal';
import { Toaster } from '../ui/Toaster';
import { SessionGuard } from './SessionGuard';
import { CommandPalette } from '../CommandPalette';

export function RootLayout() {
    const [rankUp, setRankUp] = useState<{
        previousRank: string; newRank: string; newXP: number
    } | null>(null);

    useEffect(() => {
        const handler = (e: CustomEvent) => setRankUp(e.detail);
        window.addEventListener('rankup', handler as EventListener);
        return () => window.removeEventListener('rankup', handler as EventListener);
    }, []);

    return (
        <div className="min-h-screen flex flex-col relative">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <PageTransition>
                    <Outlet />
                </PageTransition>
            </main>
            <Footer />
            <SessionGuard />
            <CommandPalette />
            <Toaster />
            {rankUp && (
                <RankUpModal
                    previousRank={rankUp.previousRank}
                    newRank={rankUp.newRank}
                    newXP={rankUp.newXP}
                    onDismiss={() => setRankUp(null)}
                />
            )}
        </div>
    );
}
