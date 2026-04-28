/**
 * ChallengeWizardShell — 4-step create/edit wizard for challenges.
 *
 * Follows event-wizard/WizardShell.tsx pattern:
 *   - AdminPageShell wrapper
 *   - StepIndicator (1–4)
 *   - Autosave via useAutosave (no draft table yet — saves to localStorage fallback)
 *   - Health check on Step 4 with jump-to-fix
 *   - On publish: write challenge + children, navigate to /admin/challenges
 *
 * Step 1: Core (title, tier, domain, status, time, mystery, core_idea, mission, criteria)
 * Step 2: Content (steps, materials, skills, vocabulary, levels — with add/remove/reorder)
 * Step 3: Media (cover image, gallery, videos)
 * Step 4: Review & Publish (preview + health check)
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Zap,
    CheckCircle2,
    Circle,
    X,
    Plus,
    Trash2,
    GripVertical,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';
import { AdminPageShell } from '../../../components/admin/AdminPageShell';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { ImageUploadField } from '../../../components/ui/ImageUploadField';
import { useAuth } from '../../../lib/auth';
import { useChallengeMutations } from '../../../lib/hooks';
import { useChallenge } from '../../../lib/hooks';
import { uploadFile } from '../../../lib/storage';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../lib/toast';
import {
    blankWizardState,
    TIER_FIELD_LABELS,
    DEFAULT_LABELS,
    DOMAIN_OPTIONS,
    TIER_OPTIONS,
    type ChallengeWizardState,
    type StepItem,
    type MaterialItem,
    type VocabItem,
    type SkillItem,
    type LevelItem,
    type VideoItem,
} from './wizardTypes';
import { computeHealth, type HealthAnchor } from './healthCheck';

// ─── Main ──────────────────────────────────────────────────────────────────

export function ChallengeWizardShell() {
    const { id: editId } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { createChallenge, updateChallenge } = useChallengeMutations();

    const isEdit = !!editId;
    const { data: existingChallenge, loading: loadingExisting } = useChallenge(isEdit ? editId : undefined);

    const [state, setState] = useState<ChallengeWizardState | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState<string | null>(null);
    const [focusField, setFocusField] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

    // ─── Hydrate from existing challenge when editing ──────────────
    useEffect(() => {
        if (!isEdit) {
            setState(blankWizardState());
            return;
        }
        if (loadingExisting || !existingChallenge) return;

        const c = existingChallenge;
        setState({
            step: 1,
            title: c.title || '',
            tier: c.tier || 'Tier 1',
            domain: c.domain || 'Interdisciplinary',
            status: c.status || 'draft',
            time_estimate: c.time_estimate || '',
            mystery: c.mystery || '',
            core_idea: c.core_idea || '',
            mission: c.mission || '',
            success_criteria: c.success_criteria || '',
            steps: c.steps.map((s, i) => ({ step_text: s, display_order: i + 1 })),
            materials: c.materials.map((m, i) => ({ name: m, display_order: i + 1 })),
            skills: c.skills.map((s) => ({ skill_name: s })),
            vocabulary: c.vocabulary.map((v) => ({ term: v.term, definition: v.definition || '' })),
            levels: c.levels.map((l) => ({ level_name: l.level_name, description: l.description || '' })),
            cover_image_url: (c as any).cover_image_url || '',
            images: c.images || [],
            videos: (c.videos || []).map((v, i) => ({ title: v.title, video_url: v.video_url, display_order: i + 1 })),
            challengeId: c.id,
            prefillSourceTitle: c.title,
        });
    }, [isEdit, loadingExisting, existingChallenge]);

    // ─── Derived ───────────────────────────────────────────────────
    const health = useMemo(() => (state ? computeHealth(state) : null), [state]);

    // ─── Access guard ──────────────────────────────────────────────
    if (role !== 'admin' && role !== 'mentor') {
        return (
            <AdminPageShell role={role ?? 'viewer'} title="Access Denied" subtitle="Only mentors and admins can create challenges." icon={Zap}>
                <p className="font-data text-brutal-dark/60">You don't have permission to manage challenges.</p>
            </AdminPageShell>
        );
    }

    if (!state) {
        return (
            <AdminPageShell role={role} title={isEdit ? 'Edit Challenge' : 'New Challenge'} subtitle="Loading..." icon={Zap}>
                <p className="font-data text-brutal-dark/60">Loading...</p>
            </AdminPageShell>
        );
    }

    // ─── Handlers ──────────────────────────────────────────────────
    const goto = (step: 1 | 2 | 3 | 4) => {
        setState({ ...state, step });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const canLeaveStep1 = !!state.title.trim() && !!state.tier && !!state.domain;
    const canLeaveStep2 = state.steps.length > 0;
    const canLeaveStep3 = true; // Media is optional

    const handleJumpTo = (anchor: HealthAnchor) => {
        setFocusField(anchor.field);
        goto(anchor.step as 1 | 2 | 3 | 4);
        setTimeout(() => setFocusField(null), 1500);
    };

    const handlePublish = async () => {
        if (!user || !state) return;
        setPublishing(true);
        setPublishError(null);

        try {
            // Upload cover image if a new file was staged
            let coverUrl = state.cover_image_url;
            if (imageFile) {
                const path = `${user.id}/${Date.now()}-${imageFile.name}`;
                const { url, error } = await uploadFile('challenge-images', path, imageFile);
                if (error) throw new Error(error);
                if (url) coverUrl = url;
            }

            const payload = {
                title: state.title.trim(),
                tier: state.tier,
                domain: state.domain,
                status: state.status,
                time_estimate: state.time_estimate.trim() || null,
                mystery: state.mystery.trim() || null,
                core_idea: state.core_idea.trim() || null,
                mission: state.mission.trim() || null,
                success_criteria: state.success_criteria.trim() || null,
                cover_image_url: coverUrl || null,
                created_by: user.id,
            } as any;

            let challengeId = state.challengeId;

            if (isEdit && challengeId) {
                const { error } = await updateChallenge(challengeId, payload);
                if (error) throw new Error(error);
            } else {
                const { data, error } = await createChallenge(payload);
                if (error) throw new Error(error);
                challengeId = (data as any)?.id;
            }

            if (!challengeId) throw new Error('No challenge ID returned');

            // ─── Save child data ───────────────────────────────
            // Delete existing children and re-insert (simplest approach for wizard)
            await Promise.all([
                supabase.from('challenge_step').delete().eq('challenge_id', challengeId).select(),
                supabase.from('challenge_material').delete().eq('challenge_id', challengeId).select(),
                supabase.from('challenge_skill').delete().eq('challenge_id', challengeId).select(),
                supabase.from('challenge_vocabulary').delete().eq('challenge_id', challengeId).select(),
                supabase.from('challenge_level').delete().eq('challenge_id', challengeId).select(),
                supabase.from('challenge_video').delete().eq('challenge_id', challengeId).select(),
            ]);

            const inserts: PromiseLike<any>[] = [];

            if (state.steps.length > 0) {
                inserts.push(
                    supabase.from('challenge_step').insert(
                        state.steps.map((s, i) => ({
                            challenge_id: challengeId,
                            step_text: s.step_text,
                            display_order: i + 1,
                        })),
                    ).select(),
                );
            }

            if (state.materials.length > 0) {
                inserts.push(
                    supabase.from('challenge_material').insert(
                        state.materials.map((m, i) => ({
                            challenge_id: challengeId,
                            name: m.name,
                            display_order: i + 1,
                        })),
                    ).select(),
                );
            }

            if (state.skills.length > 0) {
                inserts.push(
                    supabase.from('challenge_skill').insert(
                        state.skills.map((s) => ({
                            challenge_id: challengeId,
                            skill_name: s.skill_name,
                        })),
                    ).select(),
                );
            }

            if (state.vocabulary.length > 0) {
                inserts.push(
                    supabase.from('challenge_vocabulary').insert(
                        state.vocabulary.map((v) => ({
                            challenge_id: challengeId,
                            term: v.term,
                            definition: v.definition || null,
                        })),
                    ).select(),
                );
            }

            if (state.levels.length > 0) {
                inserts.push(
                    supabase.from('challenge_level').insert(
                        state.levels.map((l) => ({
                            challenge_id: challengeId,
                            level_name: l.level_name,
                            description: l.description || null,
                        })),
                    ).select(),
                );
            }

            if (state.videos.length > 0) {
                inserts.push(
                    supabase.from('challenge_video').insert(
                        state.videos.map((v, i) => ({
                            challenge_id: challengeId,
                            title: v.title,
                            video_url: v.video_url,
                            display_order: i + 1,
                        })),
                    ).select(),
                );
            }

            await Promise.all(inserts);

            toast.success(isEdit ? 'Challenge updated.' : 'Challenge created.');
            navigate('/admin/challenges');
        } catch (err) {
            setPublishError(err instanceof Error ? err.message : 'Failed to save');
            setPublishing(false);
        }
    };

    // ─── Tier-adaptive labels ──────────────────────────────────────
    const labels = TIER_FIELD_LABELS[state.tier] || DEFAULT_LABELS;

    // ─── Render ────────────────────────────────────────────────────
    return (
        <AdminPageShell
            role={role}
            title={isEdit ? 'Edit Challenge' : 'New Challenge'}
            subtitle={isEdit ? `Editing: ${state.prefillSourceTitle}` : 'Create a new challenge for the Explorer Hub.'}
            icon={Zap}
        >
            <StepIndicator step={state.step} />

            <Card className="p-5 md:p-6 border-2 border-brutal-dark border-t-[6px] border-t-brutal-red shadow-[6px_6px_0_0_rgba(17,17,17,1)]">
                {state.step === 1 && (
                    <Step1
                        state={state}
                        onChange={setState}
                        labels={labels}
                        onNext={() => canLeaveStep1 && goto(2)}
                        canNext={canLeaveStep1}
                    />
                )}
                {state.step === 2 && (
                    <Step2
                        state={state}
                        onChange={setState}
                        onBack={() => goto(1)}
                        onNext={() => canLeaveStep2 && goto(3)}
                        canNext={canLeaveStep2}
                    />
                )}
                {state.step === 3 && (
                    <Step3
                        state={state}
                        onChange={setState}
                        imageFile={imageFile}
                        onImageFileChange={setImageFile}
                        onBack={() => goto(2)}
                        onNext={() => goto(4)}
                        canNext={canLeaveStep3}
                    />
                )}
                {state.step === 4 && (
                    <Step4
                        state={state}
                        health={health!}
                        onBack={() => goto(3)}
                        onPublish={handlePublish}
                        publishing={publishing}
                        publishError={publishError}
                        onJumpTo={handleJumpTo}
                        isEdit={isEdit}
                    />
                )}
            </Card>
        </AdminPageShell>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step indicator
// ═══════════════════════════════════════════════════════════════════════════

function StepIndicator({ step }: { step: number }) {
    const steps = [
        { n: 1, label: 'Core' },
        { n: 2, label: 'Content' },
        { n: 3, label: 'Media' },
        { n: 4, label: 'Review' },
    ];
    return (
        <div className="flex items-center gap-3 font-data text-xs font-bold">
            {steps.map((s, i) => (
                <React.Fragment key={s.n}>
                    <div className={`flex items-center gap-2 ${step === s.n ? 'text-brutal-red' : step > s.n ? 'text-brutal-dark' : 'text-brutal-dark/30'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step === s.n ? 'bg-brutal-red text-white' : step > s.n ? 'bg-brutal-dark text-white' : 'bg-brutal-dark/10'}`}>
                            {step > s.n ? '✓' : s.n}
                        </span>
                        <span className="uppercase tracking-widest hidden sm:inline">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <span className="text-brutal-dark/20">—</span>}
                </React.Fragment>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 1: Core
// ═══════════════════════════════════════════════════════════════════════════

function Step1({
    state, onChange, labels, onNext, canNext,
}: {
    state: ChallengeWizardState;
    onChange: (s: ChallengeWizardState) => void;
    labels: typeof DEFAULT_LABELS;
    onNext: () => void;
    canNext: boolean;
}) {
    return (
        <div className="space-y-5">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 1 of 4 — Core</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Challenge Title"
                    required
                    value={state.title}
                    onChange={(e) => onChange({ ...state, title: e.target.value })}
                />
                <Input
                    label="Time Estimate"
                    placeholder="e.g. 45 minutes, 2 hours"
                    value={state.time_estimate}
                    onChange={(e) => onChange({ ...state, time_estimate: e.target.value })}
                />
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        Tier <span className="text-brutal-red ml-0.5">*</span>
                    </label>
                    <select
                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={state.tier}
                        onChange={(e) => onChange({ ...state, tier: e.target.value })}
                    >
                        {TIER_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        Domain <span className="text-brutal-red ml-0.5">*</span>
                    </label>
                    <select
                        className="w-full h-10 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={state.domain}
                        onChange={(e) => onChange({ ...state, domain: e.target.value })}
                    >
                        {DOMAIN_OPTIONS.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark flex justify-between items-end">
                        Status
                        <span className={`text-xs px-2 py-0.5 rounded ${state.status === 'published' ? 'bg-green-100 text-green-800'
                                : state.status === 'review_ready' ? 'bg-blue-100 text-blue-800'
                                    : state.status === 'archived' ? 'bg-gray-100 text-gray-600'
                                        : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {state.status === 'review_ready' ? 'REVIEW READY' : state.status.toUpperCase()}
                        </span>
                    </label>
                    <select
                        className="w-full h-10 mt-1 rounded bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-sm focus:border-brutal-red focus:outline-none"
                        value={state.status}
                        onChange={(e) => onChange({ ...state, status: e.target.value })}
                    >
                        <option value="draft">Draft (Hidden)</option>
                        <option value="review_ready">Ready for Review</option>
                        <option value="published">Published (Public)</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>
            </div>

            {/* Tier-adaptive text fields */}
            <div className="space-y-4">
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Mystery (Hook)</label>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data text-sm min-h-[60px] focus:outline-none focus:border-brutal-red resize-none"
                        placeholder="A teaser that sparks curiosity..."
                        value={state.mystery}
                        onChange={(e) => onChange({ ...state, mystery: e.target.value })}
                    />
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        {labels.core_idea} <span className="text-brutal-red ml-0.5">*</span>
                    </label>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data text-sm min-h-[80px] focus:outline-none focus:border-brutal-red resize-none"
                        placeholder={labels.core_idea_placeholder}
                        value={state.core_idea}
                        onChange={(e) => onChange({ ...state, core_idea: e.target.value })}
                    />
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        {labels.mission} <span className="text-brutal-red ml-0.5">*</span>
                    </label>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data text-sm min-h-[80px] focus:outline-none focus:border-brutal-red resize-none"
                        placeholder={labels.mission_placeholder}
                        value={state.mission}
                        onChange={(e) => onChange({ ...state, mission: e.target.value })}
                    />
                </div>
                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">{labels.success_criteria}</label>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data text-sm min-h-[80px] focus:outline-none focus:border-brutal-red resize-none"
                        placeholder={labels.success_criteria_placeholder}
                        value={state.success_criteria}
                        onChange={(e) => onChange({ ...state, success_criteria: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-2 border-t-2 border-brutal-dark/10">
                <Button onClick={onNext} disabled={!canNext}>Next: Content →</Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 2: Content (steps, materials, skills, vocabulary, levels)
// ═══════════════════════════════════════════════════════════════════════════

function Step2({
    state, onChange, onBack, onNext, canNext,
}: {
    state: ChallengeWizardState;
    onChange: (s: ChallengeWizardState) => void;
    onBack: () => void;
    onNext: () => void;
    canNext: boolean;
}) {
    const [newStep, setNewStep] = useState('');
    const [newMaterial, setNewMaterial] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [newTerm, setNewTerm] = useState('');
    const [newDef, setNewDef] = useState('');
    const [newLevelName, setNewLevelName] = useState('');
    const [newLevelDesc, setNewLevelDesc] = useState('');

    const addStep = () => {
        if (!newStep.trim()) return;
        onChange({
            ...state,
            steps: [...state.steps, { step_text: newStep.trim(), display_order: state.steps.length + 1 }],
        });
        setNewStep('');
    };

    const removeStep = (idx: number) => {
        onChange({ ...state, steps: state.steps.filter((_, i) => i !== idx) });
    };

    const moveStep = (idx: number, dir: -1 | 1) => {
        const arr = [...state.steps];
        const target = idx + dir;
        if (target < 0 || target >= arr.length) return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        onChange({ ...state, steps: arr });
    };

    const addMaterial = () => {
        if (!newMaterial.trim()) return;
        onChange({
            ...state,
            materials: [...state.materials, { name: newMaterial.trim(), display_order: state.materials.length + 1 }],
        });
        setNewMaterial('');
    };

    const removeMaterial = (idx: number) => {
        onChange({ ...state, materials: state.materials.filter((_, i) => i !== idx) });
    };

    const addSkill = () => {
        if (!newSkill.trim()) return;
        onChange({
            ...state,
            skills: [...state.skills, { skill_name: newSkill.trim() }],
        });
        setNewSkill('');
    };

    const removeSkill = (idx: number) => {
        onChange({ ...state, skills: state.skills.filter((_, i) => i !== idx) });
    };

    const addVocab = () => {
        if (!newTerm.trim()) return;
        onChange({
            ...state,
            vocabulary: [...state.vocabulary, { term: newTerm.trim(), definition: newDef.trim() }],
        });
        setNewTerm('');
        setNewDef('');
    };

    const removeVocab = (idx: number) => {
        onChange({ ...state, vocabulary: state.vocabulary.filter((_, i) => i !== idx) });
    };

    const addLevel = () => {
        if (!newLevelName.trim()) return;
        onChange({
            ...state,
            levels: [...state.levels, { level_name: newLevelName.trim(), description: newLevelDesc.trim() }],
        });
        setNewLevelName('');
        setNewLevelDesc('');
    };

    const removeLevel = (idx: number) => {
        onChange({ ...state, levels: state.levels.filter((_, i) => i !== idx) });
    };

    return (
        <div className="space-y-6">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 2 of 4 — Content</h2>

            {/* Steps */}
            <ContentSection title="Steps" count={state.steps.length} required>
                <ol className="space-y-1.5 mb-3">
                    {state.steps.map((s, idx) => (
                        <li key={idx} className="flex items-center gap-2 bg-brutal-dark/5 p-2 px-3 border border-brutal-dark/15 rounded">
                            <span className="font-data text-xs font-bold text-brutal-dark/40 w-5 tabular-nums">{idx + 1}.</span>
                            <span className="font-data text-sm flex-1">{s.step_text}</span>
                            <button type="button" onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="p-1 text-brutal-dark/30 hover:text-brutal-dark disabled:opacity-20"><ChevronUp size={14} /></button>
                            <button type="button" onClick={() => moveStep(idx, 1)} disabled={idx === state.steps.length - 1} className="p-1 text-brutal-dark/30 hover:text-brutal-dark disabled:opacity-20"><ChevronDown size={14} /></button>
                            <button type="button" onClick={() => removeStep(idx)} className="p-1 text-brutal-red/50 hover:text-brutal-red"><X size={14} /></button>
                        </li>
                    ))}
                </ol>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="New step instruction..."
                        value={newStep}
                        onChange={(e) => setNewStep(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                    />
                    <Button type="button" onClick={addStep}><Plus size={14} /></Button>
                </div>
            </ContentSection>

            {/* Materials */}
            <ContentSection title="Materials" count={state.materials.length} required>
                <ul className="space-y-1.5 mb-3">
                    {state.materials.map((m, idx) => (
                        <li key={idx} className="flex items-center gap-2 bg-brutal-dark/5 p-2 px-3 border border-brutal-dark/15 rounded">
                            <span className="font-data text-sm flex-1">{m.name}</span>
                            <button type="button" onClick={() => removeMaterial(idx)} className="p-1 text-brutal-red/50 hover:text-brutal-red"><X size={14} /></button>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="New material..."
                        value={newMaterial}
                        onChange={(e) => setNewMaterial(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMaterial())}
                    />
                    <Button type="button" onClick={addMaterial}><Plus size={14} /></Button>
                </div>
            </ContentSection>

            {/* Skills */}
            <ContentSection title="Skills" count={state.skills.length}>
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {state.skills.map((s, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brutal-dark text-brutal-bg rounded-full font-data text-[10px] font-bold uppercase tracking-wider">
                            {s.skill_name}
                            <button type="button" onClick={() => removeSkill(idx)} className="hover:text-brutal-red"><X size={10} /></button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        className="flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="New skill (e.g. Soldering)"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill}><Plus size={14} /></Button>
                </div>
            </ContentSection>

            {/* Vocabulary */}
            <ContentSection title="Vocabulary" count={state.vocabulary.length}>
                <ul className="space-y-1.5 mb-3">
                    {state.vocabulary.map((v, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-brutal-dark/5 p-2 px-3 border border-brutal-dark/15 rounded">
                            <div className="flex-1">
                                <strong className="font-heading font-bold text-sm">{v.term}</strong>
                                {v.definition && <p className="font-data text-xs text-brutal-dark/60 mt-0.5">{v.definition}</p>}
                            </div>
                            <button type="button" onClick={() => removeVocab(idx)} className="p-1 text-brutal-red/50 hover:text-brutal-red mt-0.5"><X size={14} /></button>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        className="w-full md:w-1/3 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="Term"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                    />
                    <input
                        className="w-full md:flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="Definition"
                        value={newDef}
                        onChange={(e) => setNewDef(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVocab())}
                    />
                    <Button type="button" onClick={addVocab}><Plus size={14} /></Button>
                </div>
            </ContentSection>

            {/* Levels */}
            <ContentSection title="Difficulty Levels" count={state.levels.length}>
                <ul className="space-y-1.5 mb-3">
                    {state.levels.map((l, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-brutal-dark/5 p-2 px-3 border border-brutal-dark/15 rounded">
                            <div className="flex-1">
                                <strong className="font-heading font-bold text-sm">{l.level_name}</strong>
                                {l.description && <p className="font-data text-xs text-brutal-dark/60 mt-0.5">{l.description}</p>}
                            </div>
                            <button type="button" onClick={() => removeLevel(idx)} className="p-1 text-brutal-red/50 hover:text-brutal-red mt-0.5"><X size={14} /></button>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        className="w-full md:w-1/3 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="Level name"
                        value={newLevelName}
                        onChange={(e) => setNewLevelName(e.target.value)}
                    />
                    <input
                        className="w-full md:flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="Description"
                        value={newLevelDesc}
                        onChange={(e) => setNewLevelDesc(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLevel())}
                    />
                    <Button type="button" onClick={addLevel}><Plus size={14} /></Button>
                </div>
            </ContentSection>

            <div className="flex justify-between pt-2 border-t-2 border-brutal-dark/10 gap-3">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
                <Button onClick={onNext} disabled={!canNext}>Next: Media →</Button>
            </div>
        </div>
    );
}

// ─── Content section wrapper ──────────────────────────────────────────────

function ContentSection({ title, count, required, children }: {
    title: string; count: number; required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="bg-brutal-bg border-2 border-brutal-dark/15 rounded-xl p-5">
            <h4 className="font-heading font-bold text-base uppercase mb-3 flex justify-between items-center">
                <span>
                    {title}
                    {required && <span className="text-brutal-red ml-1">*</span>}
                </span>
                <span className="text-brutal-dark/40 text-sm font-data">{count} items</span>
            </h4>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3: Media
// ═══════════════════════════════════════════════════════════════════════════

function Step3({
    state, onChange, imageFile, onImageFileChange, onBack, onNext, canNext,
}: {
    state: ChallengeWizardState;
    onChange: (s: ChallengeWizardState) => void;
    imageFile: File | null;
    onImageFileChange: (f: File | null) => void;
    onBack: () => void;
    onNext: () => void;
    canNext: boolean;
}) {
    const [newVideoTitle, setNewVideoTitle] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');

    const addVideo = () => {
        if (!newVideoUrl.trim()) return;
        onChange({
            ...state,
            videos: [...state.videos, {
                title: newVideoTitle.trim() || 'Video',
                video_url: newVideoUrl.trim(),
                display_order: state.videos.length + 1,
            }],
        });
        setNewVideoTitle('');
        setNewVideoUrl('');
    };

    const removeVideo = (idx: number) => {
        onChange({ ...state, videos: state.videos.filter((_, i) => i !== idx) });
    };

    return (
        <div className="space-y-5">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 3 of 4 — Media</h2>

            <ImageUploadField
                label="Cover Image"
                currentUrl={state.cover_image_url || undefined}
                file={imageFile}
                onChange={(f) => onImageFileChange(f)}
                onClear={() => {
                    onChange({ ...state, cover_image_url: '' });
                    onImageFileChange(null);
                }}
            />

            {/* Videos */}
            <div className="bg-brutal-bg border-2 border-brutal-dark/15 rounded-xl p-5">
                <h4 className="font-heading font-bold text-base uppercase mb-3 flex justify-between items-center">
                    <span>Videos</span>
                    <span className="text-brutal-dark/40 text-sm font-data">{state.videos.length} items</span>
                </h4>
                <ul className="space-y-1.5 mb-3">
                    {state.videos.map((v, idx) => (
                        <li key={idx} className="flex items-center gap-2 bg-brutal-dark/5 p-2 px-3 border border-brutal-dark/15 rounded">
                            <div className="flex-1 min-w-0">
                                <span className="font-data text-sm font-bold block truncate">{v.title}</span>
                                <span className="font-data text-xs text-brutal-dark/50 block truncate">{v.video_url}</span>
                            </div>
                            <button type="button" onClick={() => removeVideo(idx)} className="p-1 text-brutal-red/50 hover:text-brutal-red"><X size={14} /></button>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-col md:flex-row gap-2">
                    <input
                        className="w-full md:w-1/3 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="Video title"
                        value={newVideoTitle}
                        onChange={(e) => setNewVideoTitle(e.target.value)}
                    />
                    <input
                        className="w-full md:flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm focus:outline-none focus:border-brutal-red"
                        placeholder="YouTube or Vimeo URL"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideo())}
                    />
                    <Button type="button" onClick={addVideo}><Plus size={14} /></Button>
                </div>
            </div>

            <div className="flex justify-between pt-2 border-t-2 border-brutal-dark/10 gap-3">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
                <Button onClick={onNext} disabled={!canNext}>Next: Review →</Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 4: Review & Publish
// ═══════════════════════════════════════════════════════════════════════════

function Step4({
    state, health, onBack, onPublish, publishing, publishError, onJumpTo, isEdit,
}: {
    state: ChallengeWizardState;
    health: ReturnType<typeof computeHealth>;
    onBack: () => void;
    onPublish: () => void;
    publishing: boolean;
    publishError: string | null;
    onJumpTo: (anchor: HealthAnchor) => void;
    isEdit: boolean;
}) {
    return (
        <div className="space-y-5">
            <h2 className="font-heading font-bold text-xl uppercase tracking-tight">Step 4 of 4 — Review & {isEdit ? 'Save' : 'Publish'}</h2>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Preview column */}
                <div className="space-y-4">
                    <div className="bg-brutal-dark/5 border-2 border-brutal-dark/10 rounded-xl p-5 space-y-3">
                        <h3 className="font-heading font-bold text-2xl uppercase tracking-tight leading-tight">
                            {state.title || <span className="text-brutal-dark/30">— No title —</span>}
                        </h3>
                        <div className="flex flex-wrap gap-2 font-data text-xs">
                            <span className="px-2 py-0.5 bg-brutal-dark/10 rounded uppercase font-bold">{state.tier}</span>
                            <span className="px-2 py-0.5 bg-brutal-dark/10 rounded uppercase font-bold">{state.domain}</span>
                            {state.time_estimate && <span className="px-2 py-0.5 bg-brutal-dark/10 rounded">{state.time_estimate}</span>}
                            <span className={`px-2 py-0.5 rounded uppercase font-bold ${state.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {state.status}
                            </span>
                        </div>
                        {state.cover_image_url && (
                            <img src={state.cover_image_url} alt="" className="w-full rounded-lg border-2 border-brutal-dark/10 max-h-48 object-cover" />
                        )}
                        {state.core_idea && (
                            <div>
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">Core Idea</p>
                                <p className="font-data text-sm text-brutal-dark/80">{state.core_idea}</p>
                            </div>
                        )}
                        {state.mission && (
                            <div>
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">Mission</p>
                                <p className="font-data text-sm text-brutal-dark/80">{state.mission}</p>
                            </div>
                        )}
                    </div>

                    {/* Content summary */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {[
                            { label: 'Steps', count: state.steps.length },
                            { label: 'Materials', count: state.materials.length },
                            { label: 'Skills', count: state.skills.length },
                            { label: 'Vocab', count: state.vocabulary.length },
                            { label: 'Videos', count: state.videos.length },
                        ].map(({ label, count }) => (
                            <div key={label} className="bg-brutal-dark/5 border border-brutal-dark/10 rounded-lg p-3 text-center">
                                <div className="font-heading font-bold text-lg tabular-nums">{count}</div>
                                <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Health checklist */}
                <aside>
                    <div className="border-2 border-brutal-dark/10 rounded-xl p-4 space-y-3 sticky top-28">
                        <h3 className="font-heading font-bold text-sm uppercase tracking-tight">Health Check</h3>
                        <ul className="space-y-1.5">
                            {health.items.map((item) => (
                                <li key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => item.status === 'fail' && onJumpTo(item.jumpTo)}
                                        className={`w-full flex items-start gap-2 text-left p-2 rounded font-data text-xs ${item.status === 'ok' ? 'text-brutal-dark/70' : 'text-brutal-red hover:bg-brutal-red/5'}`}
                                    >
                                        {item.status === 'ok'
                                            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                                            : <Circle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                                        <span>{item.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {publishError && (
                            <div className="flex items-start gap-2 p-2 bg-brutal-red/10 border border-brutal-red/20 rounded text-brutal-red font-data text-xs">
                                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{publishError}</span>
                            </div>
                        )}
                        <Button
                            onClick={onPublish}
                            disabled={publishing}
                            className="w-full"
                        >
                            {publishing ? 'Saving...' : isEdit ? 'Save Changes' : health.allPassing ? 'Save Challenge' : `Save (${health.items.filter(i => i.status === 'fail').length} warnings)`}
                        </Button>
                        <p className="font-data text-[9px] text-brutal-dark/40 text-center">
                            {health.allPassing ? 'All checks pass.' : 'Warnings won\'t block save but indicate missing content.'}
                        </p>
                    </div>
                </aside>
            </div>

            <div className="flex justify-start pt-2 border-t-2 border-brutal-dark/10">
                <Button variant="ghost" onClick={onBack}>← Back</Button>
            </div>
        </div>
    );
}
