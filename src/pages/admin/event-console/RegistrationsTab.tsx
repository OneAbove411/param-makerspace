import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Download, UserX, Search, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Event } from '../../../lib/database.types';

/**
 * RegistrationsTab — list + CSV export of registrants for this event.
 *
 * Data shape (fetched via two queries, joined in-memory):
 *   event_registration: id, user_id, registered_at
 *   app_user:           id, name, email, role
 *
 * We fetch the two tables separately and merge by user_id rather than
 * relying on a Supabase foreign-key join, because RLS on app_user
 * restricts what mentors/admins can see — a flat select of the rows the
 * caller is allowed to see is both simpler and more resilient.
 *
 * Check-ins live in `event_checkin`; we batch-fetch them and mark rows.
 *
 * Admin-only actions:
 *   - "Remove": deletes the event_registration row. Mentors/admins have
 *     the `event_registration_mentor_all` policy so this works for both.
 *   - "Toggle check-in": inserts / deletes from event_checkin.
 *
 * CSV export is client-side — we assemble a string and trigger a
 * download. No email addresses for attendees whose role blocks visibility
 * (those rows will simply show "—"); that's the existing RLS behavior.
 */

interface RegistrationsTabProps {
    event: Event;
}

interface Row {
    registration_id: string;
    user_id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    registered_at: string;
    checked_in: boolean;
    checkin_id: string | null;
}

export function RegistrationsTab({ event }: RegistrationsTabProps) {
    const [rows, setRows] = useState<Row[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        setRows(null);

        const regsRes = await supabase
            .from('event_registration')
            .select('id, user_id, registered_at')
            .eq('event_id', event.id)
            .order('registered_at', { ascending: true });

        if (regsRes.error) {
            setError(regsRes.error.message);
            return;
        }
        const regs = (regsRes.data as { id: string; user_id: string; registered_at: string }[]) || [];

        if (regs.length === 0) {
            setRows([]);
            return;
        }

        const userIds = regs.map((r) => r.user_id);

        const [usersRes, checkinsRes] = await Promise.all([
            supabase.from('app_user').select('id, name, email, role').in('id', userIds),
            supabase
                .from('event_checkin')
                .select('id, user_id')
                .eq('event_id', event.id)
                .in('user_id', userIds),
        ]);

        if (usersRes.error) {
            setError(usersRes.error.message);
            return;
        }
        if (checkinsRes.error) {
            setError(checkinsRes.error.message);
            return;
        }

        const usersById = new Map<string, { name: string | null; email: string | null; role: string | null }>();
        for (const u of (usersRes.data as { id: string; name: string | null; email: string | null; role: string | null }[]) || []) {
            usersById.set(u.id, { name: u.name, email: u.email, role: u.role });
        }
        const checkinByUser = new Map<string, string>(); // user_id -> checkin row id
        for (const c of (checkinsRes.data as { id: string; user_id: string }[]) || []) {
            checkinByUser.set(c.user_id, c.id);
        }

        const merged: Row[] = regs.map((r) => {
            const u = usersById.get(r.user_id);
            return {
                registration_id: r.id,
                user_id: r.user_id,
                name: u?.name ?? null,
                email: u?.email ?? null,
                role: u?.role ?? null,
                registered_at: r.registered_at,
                checked_in: checkinByUser.has(r.user_id),
                checkin_id: checkinByUser.get(r.user_id) ?? null,
            };
        });
        setRows(merged);
    }, [event.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // ─── Filtering ─────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!rows) return null;
        const q = query.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            [r.name, r.email, r.role].some((v) => (v ?? '').toLowerCase().includes(q)),
        );
    }, [rows, query]);

    // ─── Actions ───────────────────────────────────────────────
    const handleRemove = useCallback(
        async (row: Row) => {
            const ok = window.confirm(
                `Remove ${row.name || row.email || row.user_id} from this event? Their check-in (if any) will also be removed.`,
            );
            if (!ok) return;
            setBusyId(row.registration_id);
            try {
                if (row.checkin_id) {
                    await supabase.from('event_checkin').delete().eq('id', row.checkin_id);
                }
                const { error: delErr } = await supabase
                    .from('event_registration')
                    .delete()
                    .eq('id', row.registration_id);
                if (delErr) {
                    window.alert(`Remove failed: ${delErr.message}`);
                } else {
                    await load();
                }
            } finally {
                setBusyId(null);
            }
        },
        [load],
    );

    const handleToggleCheckin = useCallback(
        async (row: Row) => {
            setBusyId(row.registration_id);
            try {
                if (row.checked_in && row.checkin_id) {
                    const { error: delErr } = await supabase
                        .from('event_checkin')
                        .delete()
                        .eq('id', row.checkin_id);
                    if (delErr) window.alert(`Check-in toggle failed: ${delErr.message}`);
                } else {
                    const { error: insErr } = await supabase.from('event_checkin').insert({
                        event_id: event.id,
                        user_id: row.user_id,
                    });
                    if (insErr) window.alert(`Check-in toggle failed: ${insErr.message}`);
                }
                await load();
            } finally {
                setBusyId(null);
            }
        },
        [event.id, load],
    );

    // ─── CSV export ────────────────────────────────────────────
    const handleExportCsv = useCallback(() => {
        if (!rows) return;
        const header = ['name', 'email', 'role', 'registered_at', 'checked_in'];
        const lines = [header.join(',')];
        for (const r of rows) {
            lines.push(
                [
                    csvCell(r.name ?? ''),
                    csvCell(r.email ?? ''),
                    csvCell(r.role ?? ''),
                    csvCell(r.registered_at),
                    csvCell(r.checked_in ? 'yes' : 'no'),
                ].join(','),
            );
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `registrations-${safeSlug(event.title)}-${event.id.slice(0, 8)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [event.id, event.title, rows]);

    // ─── Render ────────────────────────────────────────────────
    if (error) {
        return (
            <div className="p-6 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                Failed to load registrations: {error}
            </div>
        );
    }

    if (rows === null) {
        return <div className="p-12 text-center font-data text-brutal-dark/50">Loading registrations…</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brutal-dark/40" />
                    <input
                        type="text"
                        placeholder="Search by name, email, role…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border-2 border-brutal-dark bg-white font-data text-sm focus:outline-none focus:border-brutal-red"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-data text-sm text-brutal-dark/60">
                        {filtered?.length ?? 0} / {rows.length}
                    </span>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark/30 hover:border-brutal-dark font-data text-sm transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={rows.length === 0}
                        className="inline-flex items-center gap-2 px-3 py-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white font-data text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20 font-data text-brutal-dark/50">
                    No registrations yet.
                </div>
            ) : (
                <div className="overflow-x-auto border-2 border-brutal-dark bg-white">
                    <table className="w-full min-w-[640px] font-data text-sm">
                        <thead className="bg-brutal-dark/5 border-b-2 border-brutal-dark/20">
                            <tr className="text-left">
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Name</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Email</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Role</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Registered</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide">Check-in</th>
                                <th className="px-3 py-2 font-bold uppercase text-xs tracking-wide text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(filtered ?? []).map((r) => (
                                <tr key={r.registration_id} className="border-b border-brutal-dark/10 last:border-0">
                                    <td className="px-3 py-2">{r.name || '—'}</td>
                                    <td className="px-3 py-2 break-all">{r.email || '—'}</td>
                                    <td className="px-3 py-2">{r.role || '—'}</td>
                                    <td className="px-3 py-2 text-brutal-dark/70">
                                        {new Date(r.registered_at).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleToggleCheckin(r)}
                                            disabled={busyId === r.registration_id}
                                            className={
                                                'px-2 py-1 border-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50 ' +
                                                (r.checked_in
                                                    ? 'border-green-600 bg-green-50 text-green-800 hover:bg-green-100'
                                                    : 'border-brutal-dark/30 text-brutal-dark/60 hover:border-brutal-dark hover:text-brutal-dark')
                                            }
                                        >
                                            {r.checked_in ? 'Checked in' : 'Mark in'}
                                        </button>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => void handleRemove(r)}
                                            disabled={busyId === r.registration_id}
                                            className="inline-flex items-center gap-1 px-2 py-1 border-2 border-brutal-red/40 text-brutal-red hover:bg-brutal-red hover:text-white text-xs font-bold uppercase transition-colors disabled:opacity-50"
                                        >
                                            <UserX className="w-3 h-3" /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered && filtered.length === 0 && rows.length > 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-brutal-dark/50">
                                        No matches for "{query}".
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── CSV helpers ─────────────────────────────────────────────

function csvCell(v: string): string {
    // Quote the cell if it contains comma, quote, newline, or leading/trailing whitespace.
    if (/[",\n\r]/.test(v) || v !== v.trim()) {
        return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
}

function safeSlug(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'event';
}
