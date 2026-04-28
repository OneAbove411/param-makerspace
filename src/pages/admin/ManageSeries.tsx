/**
 * /admin/series — CRUD for recurring-event templates (Prompt 10).
 *
 * The "90-second Tech Tuesday" loop depends on having at least one
 * event_series row with sensible defaults (location, duration, capacity,
 * cover image). This page exists so mentors/admins can create & tune
 * those templates once, then forget about them.
 *
 * Supported event_type values are intentionally limited to the three
 * first-class types today — the enum is declared in the migration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../lib/auth';
import { AdminPageShell } from '../../components/admin/AdminPageShell';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmDeleteCard } from '../../components/admin/ConfirmDeleteCard';
import { CalendarClock, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { EventSeries, EventType } from '../../lib/database.types';
import {
    listSeries,
    createSeries,
    updateSeries,
    deleteSeries,
} from '../../lib/api/eventSeries';
import { EVENT_TYPE_LABELS } from './event-wizard/wizardTypes';

interface FormData {
    event_type: EventType;
    title_template: string;
    default_location: string;
    default_duration_min: string; // kept as string for controlled input
    default_capacity: string;
    default_cover_image_url: string;
}

const EMPTY_FORM: FormData = {
    event_type: 'tech_tuesday',
    title_template: '',
    default_location: '',
    default_duration_min: '',
    default_capacity: '',
    default_cover_image_url: '',
};

function parseIntOrNull(v: string): number | null {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : null;
}

export function ManageSeries() {
    const { role } = useAuth();
    const [rows, setRows] = useState<EventSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<EventSeries | null>(null);
    const [form, setForm] = useState<FormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<EventSeries | null>(null);

    const reload = useCallback(async () => {
        setLoading(true);
        const { data, error } = await listSeries();
        if (error) {
            setError(error.message);
            setRows([]);
        } else {
            setRows((data as EventSeries[]) ?? []);
            setError(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    if (role !== 'mentor' && role !== 'admin') {
        return (
            <div className="p-24 text-center font-data text-2xl">
                Access Denied: Mentor or Admin only.
            </div>
        );
    }

    const openEdit = (s: EventSeries) => {
        setEditing(s);
        setShowAdd(false);
        setForm({
            event_type: s.event_type,
            title_template: s.title_template,
            default_location: s.default_location ?? '',
            default_duration_min: s.default_duration_min?.toString() ?? '',
            default_capacity: s.default_capacity?.toString() ?? '',
            default_cover_image_url: s.default_cover_image_url ?? '',
        });
    };

    const openAdd = () => {
        setEditing(null);
        setShowAdd(true);
        setForm(EMPTY_FORM);
    };

    const closeForm = () => {
        setShowAdd(false);
        setEditing(null);
        setForm(EMPTY_FORM);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title_template.trim()) return;
        setSaving(true);
        const payload = {
            title_template: form.title_template.trim(),
            default_location: form.default_location.trim() || null,
            default_duration_min: parseIntOrNull(form.default_duration_min),
            default_capacity: parseIntOrNull(form.default_capacity),
            default_cover_image_url: form.default_cover_image_url.trim() || null,
        };
        if (editing) {
            const { error } = await updateSeries(editing.id, payload);
            if (error) {
                window.alert(`Update failed: ${error.message}`);
                setSaving(false);
                return;
            }
        } else {
            const { error } = await createSeries({
                event_type: form.event_type,
                ...payload,
            });
            if (error) {
                window.alert(`Create failed: ${error.message}`);
                setSaving(false);
                return;
            }
        }
        setSaving(false);
        closeForm();
        await reload();
    };

    const handleDelete = async (s: EventSeries) => {
        setSaving(true);
        const { error } = await deleteSeries(s.id);
        setSaving(false);
        if (error) {
            window.alert(`Delete failed: ${error.message}`);
            return;
        }
        setDeleteTarget(null);
        await reload();
    };

    return (
        <AdminPageShell
            role={role}
            title="Event Series"
            subtitle="Reusable templates for recurring events. One series per cadence — e.g. weekly Tech Tuesday."
            icon={CalendarClock}
            headerAction={
                !showAdd && !editing ? (
                    <Button onClick={openAdd}>
                        <Plus className="w-5 h-5 mr-2" /> New series
                    </Button>
                ) : undefined
            }
        >
            {error && (
                <div className="p-4 border-2 border-brutal-red/40 bg-brutal-red/5 font-data text-sm">
                    Failed to load: {error}
                </div>
            )}

            {(showAdd || editing) && (
                <Card className="p-6 border-2 border-brutal-dark border-t-8 border-t-brutal-red">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-heading font-bold text-xl uppercase">
                            {editing ? `Edit "${editing.title_template}"` : 'New series'}
                        </h3>
                        <button type="button" onClick={closeForm} className="p-2 hover:bg-brutal-dark/10">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="font-data text-sm font-bold block mb-2">Event type</label>
                                <select
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark p-3 font-data"
                                    value={form.event_type}
                                    disabled={!!editing}
                                    onChange={(e) => setForm({ ...form, event_type: e.target.value as EventType })}
                                >
                                    <option value="tech_tuesday">{EVENT_TYPE_LABELS.tech_tuesday}</option>
                                    <option value="maker_meetup">{EVENT_TYPE_LABELS.maker_meetup}</option>
                                    <option value="build_challenge">{EVENT_TYPE_LABELS.build_challenge}</option>
                                </select>
                                {editing && (
                                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                                        Event type is locked after creation.
                                    </p>
                                )}
                            </div>
                            <Input
                                label="Title template"
                                placeholder="Tech Tuesday: {topic}"
                                value={form.title_template}
                                onChange={(e) => setForm({ ...form, title_template: e.target.value })}
                                required
                            />
                            <Input
                                label="Default location"
                                placeholder="Param Makerspace — Main Hall"
                                value={form.default_location}
                                onChange={(e) => setForm({ ...form, default_location: e.target.value })}
                            />
                            <Input
                                label="Default duration (min)"
                                type="number"
                                min={0}
                                placeholder="90"
                                value={form.default_duration_min}
                                onChange={(e) => setForm({ ...form, default_duration_min: e.target.value })}
                            />
                            <Input
                                label="Default capacity"
                                type="number"
                                min={0}
                                placeholder="40"
                                value={form.default_capacity}
                                onChange={(e) => setForm({ ...form, default_capacity: e.target.value })}
                            />
                            <Input
                                label="Default cover image URL"
                                placeholder="https://…"
                                value={form.default_cover_image_url}
                                onChange={(e) => setForm({ ...form, default_cover_image_url: e.target.value })}
                            />
                        </div>
                        <div className="pt-4 border-t-2 border-brutal-dark/10 flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={closeForm}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create series'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {deleteTarget && (
                <ConfirmDeleteCard
                    entityName={deleteTarget.title_template}
                    message={`Delete series "${deleteTarget.title_template}"? Existing events stay — their series_id is set to NULL.`}
                    cascadeItems={[]}
                    onConfirm={() => handleDelete(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                    loading={saving}
                />
            )}

            {loading ? (
                <div className="p-12 text-center font-data text-brutal-dark/50">Loading series…</div>
            ) : rows.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-brutal-dark/20">
                    <CalendarClock className="w-12 h-12 text-brutal-dark/20 mx-auto mb-4" />
                    <h3 className="font-heading font-bold text-2xl text-brutal-dark/50">No series yet</h3>
                    <p className="font-data text-brutal-dark/40 mt-2">
                        Create one to enable "New Tech Tuesday" fast-publish.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rows.map((s) => (
                        <Card key={s.id} className="p-5 border-2 border-brutal-dark/20">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-heading font-bold text-lg leading-tight">
                                            {s.title_template}
                                        </span>
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold font-data bg-brutal-dark/10 uppercase">
                                            {EVENT_TYPE_LABELS[s.event_type as EventType] ?? s.event_type}
                                        </span>
                                    </div>
                                    <div className="font-data text-xs text-brutal-dark/60 space-y-0.5">
                                        <div>
                                            <strong>Location:</strong>{' '}
                                            {s.default_location || <em className="text-brutal-dark/40">none</em>}
                                        </div>
                                        <div>
                                            <strong>Duration:</strong>{' '}
                                            {s.default_duration_min
                                                ? `${s.default_duration_min} min`
                                                : <em className="text-brutal-dark/40">none</em>}
                                            {' · '}
                                            <strong>Capacity:</strong>{' '}
                                            {s.default_capacity ?? <em className="text-brutal-dark/40">none</em>}
                                        </div>
                                        {s.default_cover_image_url && (
                                            <div className="truncate">
                                                <strong>Cover:</strong> {s.default_cover_image_url}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEdit(s)}
                                        className="p-2 border-2 border-brutal-dark hover:bg-brutal-dark hover:text-white"
                                        title="Edit series"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(s)}
                                        className="p-2 border-2 border-brutal-red/30 text-brutal-red hover:bg-brutal-red hover:text-white"
                                        title="Delete series"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </AdminPageShell>
    );
}

export default ManageSeries;
