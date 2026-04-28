import React from 'react';
import { Input } from '../../../components/ui/Input';
import type {
    BuildChallengeFields,
    MakerMeetupFields,
    TechTuesdayFields,
    TypeFields,
} from './wizardTypes';

/**
 * Step 2 per-type fields — fast-path only.
 *
 * Each type exposes exactly 5 fields (Prompt 2). The Advanced drawer
 * sits below this component in the wizard shell, so long-form and
 * rarely-touched inputs never clutter the hot-path form.
 *
 * Accepts a narrow setter so the parent can keep a single form reducer
 * with a discriminated union and still let this component stay typed.
 */

export interface Step2TypeFieldsProps {
    /** The current fields block. */
    fields: TypeFields;
    /** Replace the fields block (discriminated union preserved). */
    onChange: (next: TypeFields) => void;
    /** Jump target set by the health-check click-through. */
    focusField?: string | null;
}

const inputClass =
    'w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none';

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
            {children}
            {required && <span className="text-brutal-red ml-0.5">*</span>}
        </label>
    );
}

export function Step2TypeFields({ fields, onChange, focusField }: Step2TypeFieldsProps) {
    switch (fields.kind) {
        case 'build_challenge':
            return <BuildChallengeStep fields={fields} onChange={onChange} focusField={focusField} />;
        case 'maker_meetup':
            return <MakerMeetupStep fields={fields} onChange={onChange} focusField={focusField} />;
        case 'tech_tuesday':
            return <TechTuesdayStep fields={fields} onChange={onChange} focusField={focusField} />;
    }
}

// ─── Build Challenge ───────────────────────────────────────────────

function BuildChallengeStep({
    fields,
    onChange,
    focusField,
}: {
    fields: BuildChallengeFields;
    onChange: (f: TypeFields) => void;
    focusField?: string | null;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <Input
                    label="Prize summary"
                    required
                    autoFocus={focusField === 'prize_summary'}
                    placeholder="e.g. ₹50k pool + PCB credits + certificates"
                    value={fields.prize_summary}
                    onChange={(e) => onChange({ ...fields, prize_summary: e.target.value })}
                />
            </div>
            <div>
                <FieldLabel>Team size (max)</FieldLabel>
                <input
                    type="number" min={1} max={10}
                    className={inputClass}
                    value={fields.team_size_max}
                    onChange={(e) => onChange({ ...fields, team_size_max: parseInt(e.target.value, 10) || 1 })}
                />
            </div>
            <div>
                <FieldLabel>Shortlist deadline</FieldLabel>
                <input
                    type="datetime-local"
                    className={inputClass}
                    value={fields.shortlist_deadline}
                    onChange={(e) => onChange({ ...fields, shortlist_deadline: e.target.value })}
                />
            </div>
            <div>
                <FieldLabel required>Submission deadline</FieldLabel>
                <input
                    type="datetime-local"
                    autoFocus={focusField === 'submission_deadline'}
                    className={inputClass}
                    value={fields.submission_deadline}
                    onChange={(e) => onChange({ ...fields, submission_deadline: e.target.value })}
                />
            </div>
            <div>
                <Input
                    label="Submission URL pattern"
                    placeholder="e.g. https://devpost.com/hackwire-2"
                    value={fields.submission_url_pattern}
                    onChange={(e) => onChange({ ...fields, submission_url_pattern: e.target.value })}
                />
            </div>
        </div>
    );
}

// ─── Maker Meetup ──────────────────────────────────────────────────

function MakerMeetupStep({
    fields,
    onChange,
    focusField,
}: {
    fields: MakerMeetupFields;
    onChange: (f: TypeFields) => void;
    focusField?: string | null;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <FieldLabel>Capacity (0 = unlimited)</FieldLabel>
                <input
                    type="number" min={0}
                    className={inputClass}
                    value={fields.capacity}
                    onChange={(e) => onChange({ ...fields, capacity: parseInt(e.target.value, 10) || 0 })}
                />
            </div>
            <div>
                <FieldLabel required>Application deadline</FieldLabel>
                <input
                    type="datetime-local"
                    autoFocus={focusField === 'application_deadline'}
                    className={inputClass}
                    value={fields.application_deadline}
                    onChange={(e) => onChange({ ...fields, application_deadline: e.target.value })}
                />
            </div>
            <div>
                <FieldLabel required>Interview slot length (minutes)</FieldLabel>
                <input
                    type="number" min={5} max={120}
                    autoFocus={focusField === 'interview_slot_length_min'}
                    className={inputClass}
                    value={fields.interview_slot_length_min}
                    onChange={(e) => onChange({ ...fields, interview_slot_length_min: parseInt(e.target.value, 10) || 15 })}
                />
            </div>
            <div>
                <FieldLabel>Selection published by</FieldLabel>
                <input
                    type="datetime-local"
                    className={inputClass}
                    value={fields.selection_deadline}
                    onChange={(e) => onChange({ ...fields, selection_deadline: e.target.value })}
                />
            </div>
            <div>
                <FieldLabel>Event starts at</FieldLabel>
                <input
                    type="datetime-local"
                    className={inputClass}
                    value={fields.start_date}
                    onChange={(e) => onChange({ ...fields, start_date: e.target.value })}
                />
                <p className="font-data text-[10px] text-brutal-dark/40 mt-1">Mirrors Step 1's start date — kept here for per-type validation.</p>
            </div>
        </div>
    );
}

// ─── Tech Tuesday ──────────────────────────────────────────────────

function TechTuesdayStep({
    fields,
    onChange,
    focusField,
}: {
    fields: TechTuesdayFields;
    onChange: (f: TypeFields) => void;
    focusField?: string | null;
}) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <Input
                    label="External RSVP URL (Luma)"
                    required
                    autoFocus={focusField === 'external_rsvp_url'}
                    placeholder="https://lu.ma/your-event"
                    value={fields.external_rsvp_url}
                    onChange={(e) => onChange({ ...fields, external_rsvp_url: e.target.value })}
                />
                <p className="font-data text-[10px] text-brutal-dark/40 mt-1">
                    Must start with https://lu.ma/ or https://luma.com/.
                </p>
            </div>
            <div>
                <Input
                    label="Speaker name"
                    required
                    autoFocus={focusField === 'speaker_name'}
                    value={fields.speaker_name}
                    onChange={(e) => onChange({ ...fields, speaker_name: e.target.value })}
                />
            </div>
            <div>
                <FieldLabel>Duration (minutes)</FieldLabel>
                <input
                    type="number" min={30} max={240}
                    className={inputClass}
                    value={fields.duration_min}
                    onChange={(e) => onChange({ ...fields, duration_min: parseInt(e.target.value, 10) || 120 })}
                />
            </div>
            <div className="md:col-span-2">
                <FieldLabel>Speaker bio (1–2 sentences)</FieldLabel>
                <textarea
                    className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm min-h-[70px] focus:border-brutal-red focus:outline-none"
                    value={fields.speaker_bio_short}
                    onChange={(e) => onChange({ ...fields, speaker_bio_short: e.target.value })}
                />
            </div>
            <div className="md:col-span-2">
                <Input
                    label="Topic summary (one line)"
                    value={fields.topic_summary}
                    onChange={(e) => onChange({ ...fields, topic_summary: e.target.value })}
                />
            </div>
        </div>
    );
}
