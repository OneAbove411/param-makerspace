import React from 'react';
import { Link } from 'react-router';

const HostedBySection = ({ hosts, variant = 'light' }: { hosts: { id: string; user_id: string; name: string; avatar_url: string | null }[]; variant?: 'light' | 'dark' }) => {
    if (!hosts || hosts.length === 0) return null;
    const isDark = variant === 'dark';
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-data text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-brutal-bg/40' : 'text-brutal-dark/40'}`}>Hosted By</span>
            <div className="flex items-center gap-2 flex-wrap">
                {hosts.map(host => (
                    <Link
                        key={host.id}
                        to={`/makers/${host.user_id}`}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors group ${
                            isDark
                                ? 'bg-brutal-bg/10 text-brutal-bg hover:bg-brutal-red'
                                : 'bg-brutal-dark text-brutal-bg hover:bg-brutal-red'
                        }`}
                    >
                        {host.avatar_url ? (
                            <img src={host.avatar_url} alt={host.name} className="w-5 h-5 rounded-full object-cover border border-brutal-bg/20" />
                        ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${isDark ? 'bg-brutal-bg/20' : 'bg-brutal-bg/20'}`}>
                                {host.name.charAt(0)}
                            </div>
                        )}
                        <span className="font-data text-[10px] font-bold uppercase tracking-wider">{host.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HostedBySection;
