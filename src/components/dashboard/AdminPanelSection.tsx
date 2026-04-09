import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Users, Award, Settings } from 'lucide-react';

/**
 * §7 F-324 — Admin Panel lazy-chunked out of Dashboard.tsx so the base
 * dashboard bundle stays small for the overwhelming majority of users
 * who are not admins.
 */
export default function AdminPanelSection({ eyebrowNumber }: { eyebrowNumber?: string }) {
    return (
        <section
            className="db-section"
            aria-labelledby="admin-panel-heading"
        >
            {eyebrowNumber && (
                <div className="font-data text-[10px] text-brutal-dark/30 font-bold uppercase tracking-widest mb-6">
                    {eyebrowNumber} Admin Panel
                </div>
            )}
            <div className="flex items-center gap-3 mb-8 border-b-2 border-brutal-dark/10 pb-4">
                <span className="bg-brutal-red text-brutal-bg px-3 py-1 text-xs font-bold font-data rounded uppercase">
                    Admin-only
                </span>
                <h2
                    id="admin-panel-heading"
                    className="font-heading text-3xl md:text-4xl font-bold uppercase tracking-tight-heading"
                >
                    System Control
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card className="p-5 border-2 border-brutal-red/30 bg-brutal-red/5 shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.25)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-brutal-red" aria-hidden />
                        <h3 className="font-heading font-bold text-lg uppercase">Users</h3>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Manage accounts &amp; roles.</p>
                    <Link to="/admin/users"><Button variant="outline" size="sm" className="w-full">Manage Users</Button></Link>
                </Card>
                <Card className="p-5 border-2 border-brutal-red/30 bg-brutal-red/5 shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.25)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="w-5 h-5 text-brutal-red" aria-hidden />
                        <h3 className="font-heading font-bold text-lg uppercase">Badges</h3>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Mint achievement badges.</p>
                    <Link to="/admin/badges"><Button variant="outline" size="sm" className="w-full">Manage Badges</Button></Link>
                </Card>
                <Card className="p-5 border-2 border-brutal-red/30 bg-brutal-red/5 shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.25)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-brutal-red" aria-hidden />
                        <h3 className="font-heading font-bold text-lg uppercase">Store</h3>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Manage store products.</p>
                    <Link to="/admin/store"><Button variant="outline" size="sm" className="w-full">Manage Store</Button></Link>
                </Card>
                <Card className="p-5 border-2 border-brutal-red/30 bg-brutal-red/5 shadow-[6px_6px_0_0_rgba(196,41,30,0.15)] hover:shadow-[8px_8px_0_0_rgba(196,41,30,0.25)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-150 ease-out motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-brutal-red" aria-hidden />
                        <h3 className="font-heading font-bold text-lg uppercase">Equipment</h3>
                    </div>
                    <p className="font-data text-xs text-brutal-dark/60 mb-4 h-8">Lab tools &amp; inductions.</p>
                    <Link to="/admin/equipment"><Button variant="outline" size="sm" className="w-full">Manage Equipment</Button></Link>
                </Card>
            </div>
        </section>
    );
}
