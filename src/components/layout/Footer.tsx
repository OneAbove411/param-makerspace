import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="bg-brutal-dark text-brutal-bg rounded-t-[4rem] px-8 pt-20 pb-12 mt-32 relative overflow-hidden">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
                <div className="col-span-1 md:col-span-2">
                    <h2 className="font-heading font-bold text-4xl mb-4">PARAM.</h2>
                    <p className="font-data text-brutal-bg/60 max-w-md">
                        The Param Makerspace is a community-driven platform designed to equally support structured learning, community event participation, and collaborative project execution.
                    </p>
                </div>

                <div className="flex flex-col gap-4 font-data">
                    <h3 className="text-brutal-bg/40 text-sm mb-2 uppercase">Platform</h3>
                    <Link to="/projects" className="hover:text-brutal-red transition-colors">Projects</Link>
                    <Link to="/challenges" className="hover:text-brutal-red transition-colors">Challenges</Link>
                    <Link to="/events" className="hover:text-brutal-red transition-colors">Events</Link>
                    <Link to="/makers" className="hover:text-brutal-red transition-colors">Makers Directory</Link>
                </div>

                <div className="flex flex-col gap-4 font-data">
                    <h3 className="text-brutal-bg/40 text-sm mb-2 uppercase">Legal</h3>
                    <Link to="/privacy" className="hover:text-brutal-red transition-colors">Privacy Policy</Link>
                    <Link to="/terms" className="hover:text-brutal-red transition-colors">Terms of Service</Link>
                    <Link to="/safety" className="hover:text-brutal-red transition-colors">Safety Guidelines</Link>
                </div>
            </div>
        </footer>
    );
}
