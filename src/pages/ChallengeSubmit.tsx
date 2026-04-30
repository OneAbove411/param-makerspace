/**
 * ChallengeSubmit — guided submission page for challenge completion.
 *
 * Route: /challenges/:id/submit (protected: viewer+)
 *
 * 3-step flow:
 *   1. Evidence — file upload + URL field
 *   2. Reflection — tier-specific prompts (notes textarea)
 *   3. Preview & Submit
 *
 * Uses existing useChallengeCompletion hook for the insert.
 * Checks T3 gate (must have verified T2 completion).
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { smoothScrollToTop } from '../lib/scroll';
import {
    ArrowLeft,
    ArrowRight,
    Upload,
    FileText,
    Eye,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    Target,
    Zap,
    LinkIcon,
} from 'lucide-react';
import { useChallenge, useChallengeCompletion } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';
import { XP_REWARDS } from '../lib/constants';

// ─── Tier-specific reflection prompts ──────────────────────────────────────

const REFLECTION_PROMPTS: Record<string, string[]> = {
    'Tier 1': [
        'What changed during your experiment?',
        'What stayed the same?',
        'What do you think is happening and why?',
    ],
    'Tier 2': [
        'What worked in your solution?',
        'What failed or didn\'t go as planned?',
        'Why did you choose this approach?',
        'What would you change next time?',
    ],
    'Tier 3': [
        'Why did you choose this architecture?',
        'What assumptions did you make?',
        'What are the potential failure points?',
        'What evidence supports your design decisions?',
    ],
};

type SubmitStep = 1 | 2 | 3;

export function ChallengeSubmit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: challenge, loading: loadingChallenge } = useChallenge(id);
    const { completion, markComplete } = useChallengeCompletion(id);

    const [step, setStep] = useState<SubmitStep>(1);
    const [evidenceUrl, setEvidenceUrl] = useState('');
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // T3 gate
    const [hasT2Completion, setHasT2Completion] = useState<boolean | null>(null);
    useEffect(() => {
        if (!user) return;
        (async () => {
            const { count } = await supabase
                .from('challenge_completion')
                .select('id, challenge!inner(tier)', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'verified')
                .eq('challenge.tier', 'Tier 2');
            setHasT2Completion((count || 0) > 0);
        })();
    }, [user?.id]);

    const bountyXP = useMemo(() => {
        if (!challenge) return 0;
        return challenge.tier === 'Tier 3' ? XP_REWARDS.tier3_challenge
            : challenge.tier === 'Tier 2' ? XP_REWARDS.tier2_challenge
                : XP_REWARDS.tier1_challenge;
    }, [challenge]);

    const prompts = challenge?.tier ? (REFLECTION_PROMPTS[challenge.tier] || REFLECTION_PROMPTS['Tier 1']) : REFLECTION_PROMPTS['Tier 1'];

    // ─── Handlers ──────────────────────────────────────────────────
    const goto = (s: SubmitStep) => {
        setStep(s);
        smoothScrollToTop();
    };

    const canLeaveStep1 = !!(evidenceUrl.trim() || evidenceFile);
    const canLeaveStep2 = !!notes.trim();

    const handleSubmit = async () => {
        if (!user || !id) return;
        setSubmitting(true);

        try {
            let finalEvidenceUrl = evidenceUrl.trim();

            // Upload file if provided
            if (evidenceFile) {
                const path = `${user.id}/${Date.now()}-${evidenceFile.name}`;
                const { url, error } = await uploadFile('project-files', path, evidenceFile);
                if (error) throw new Error(error);
                if (url) finalEvidenceUrl = url;
            }

            await markComplete(notes.trim(), finalEvidenceUrl || undefined);
            toast.success('Submission sent! Pending review.');
            navigate(`/challenges/${id}`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Submission failed');
            setSubmitting(false);
        }
    };

    // ─── Loading ───────────────────────────────────────────────────
    if (loadingChallenge) {
        return (
            <div className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-brutal-dark/30" size={32} />
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen">
                <div className="max-w-lg mx-auto text-center py-32">
                    <h1 className="font-heading font-bold text-2xl uppercase text-brutal-dark/20">Challenge Not Found</h1>
                    <Link to="/challenges" className="inline-flex items-center gap-2 mt-6 font-data text-sm text-brutal-dark hover:text-brutal-red">
                        <ArrowLeft size={14} /> Back to challenges
                    </Link>
                </div>
            </div>
        );
    }

    // Already submitted
    if (completion) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen">
                <div className="max-w-lg mx-auto text-center py-16">
                    <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                    <h1 className="font-heading font-bold text-2xl uppercase">Already Submitted</h1>
                    <p className="font-data text-sm text-brutal-dark/60 mt-2">
                        Your submission is <strong>{completion.status === 'verified' ? 'verified' : 'pending review'}</strong>.
                    </p>
                    <Link to={`/challenges/${id}`} className="inline-flex items-center gap-2 mt-6 font-data text-sm text-brutal-red hover:underline">
                        <ArrowLeft size={14} /> Back to challenge
                    </Link>
                </div>
            </div>
        );
    }

    // T3 gate
    if (challenge.tier === 'Tier 3' && hasT2Completion === false) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen">
                <div className="max-w-lg mx-auto text-center py-16">
                    <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
                    <h1 className="font-heading font-bold text-2xl uppercase">Tier 3 Locked</h1>
                    <p className="font-data text-sm text-brutal-dark/60 mt-2">
                        Complete at least one Tier 2 challenge to unlock Tier 3 submissions.
                    </p>
                    <Link to="/challenges?tier=Tier+2" className="inline-flex items-center gap-2 mt-6 rounded-xl bg-yellow-500 text-brutal-dark px-4 py-2.5 font-data text-[10px] font-bold uppercase tracking-widest">
                        <Target size={11} /> Browse Tier 2
                    </Link>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────
    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen">
            {/* Header */}
            <div className="border-b-2 border-brutal-dark/10 bg-brutal-bg px-4 md:px-8 pt-24 md:pt-28 pb-4">
                <div className="max-w-3xl mx-auto">
                    <Link to={`/challenges/${id}`} className="inline-flex items-center gap-2 font-data text-xs text-brutal-dark/50 hover:text-brutal-dark mb-2">
                        <ArrowLeft size={12} /> {challenge.title}
                    </Link>
                    <h1 className="font-heading font-bold text-xl md:text-2xl uppercase tracking-tight">
                        Claim Bounty
                    </h1>
                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                        Submit your build to earn <span className="text-brutal-red font-bold">+{bountyXP} XP</span>
                    </p>
                </div>
            </div>

            {/* Step indicator */}
            <div className="border-b border-brutal-dark/8 bg-brutal-bg px-4 md:px-8 py-3">
                <div className="max-w-3xl mx-auto">
                    <SubmitStepIndicator step={step} />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">

                {/* Step 1: Evidence */}
                {step === 1 && (
                    <div className="space-y-5">
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight">Step 1 — Evidence</h2>
                        <p className="font-data text-sm text-brutal-dark/60">
                            Share proof of your work. Upload a file (photo, document, zip) or paste a link (GitHub repo, video, blog post).
                        </p>

                        {/* File upload */}
                        <div className="border-2 border-dashed border-brutal-dark/20 rounded-xl p-6 text-center hover:border-brutal-dark/40 transition-colors">
                            <Upload size={28} className="mx-auto text-brutal-dark/25 mb-3" />
                            <label className="cursor-pointer">
                                <span className="font-data text-sm text-brutal-dark/70">
                                    {evidenceFile ? (
                                        <span className="text-brutal-red font-bold">{evidenceFile.name}</span>
                                    ) : (
                                        'Drag & drop or click to upload'
                                    )}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                                    accept="image/*,video/*,.pdf,.zip,.rar,.7z,.doc,.docx,.pptx"
                                />
                            </label>
                            {evidenceFile && (
                                <button type="button" onClick={() => setEvidenceFile(null)} className="mt-2 font-data text-xs text-brutal-red hover:underline">
                                    Remove file
                                </button>
                            )}
                            <p className="font-data text-[9px] text-brutal-dark/40 mt-2">Max 10 MB. Images, videos, PDFs, or archives.</p>
                        </div>

                        {/* OR divider */}
                        <div className="flex items-center gap-3">
                            <hr className="flex-1 border-brutal-dark/10" />
                            <span className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/30">or paste a link</span>
                            <hr className="flex-1 border-brutal-dark/10" />
                        </div>

                        {/* URL input */}
                        <div className="flex items-center gap-2">
                            <LinkIcon size={14} className="text-brutal-dark/30 flex-shrink-0" />
                            <input
                                type="url"
                                className="flex-1 bg-brutal-bg border-2 border-brutal-dark/15 p-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-red transition-colors"
                                placeholder="https://github.com/... or YouTube link"
                                value={evidenceUrl}
                                onChange={(e) => setEvidenceUrl(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-4 border-t-2 border-brutal-dark/10">
                            <button
                                type="button"
                                onClick={() => canLeaveStep1 && goto(2)}
                                disabled={!canLeaveStep1}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-xl px-5 py-3 font-data text-[11px] font-bold uppercase tracking-widest transition-all',
                                    canLeaveStep1
                                        ? 'bg-brutal-dark text-brutal-bg hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[4px_4px_0_0_rgba(196,41,30,0.9)]'
                                        : 'bg-brutal-dark/20 text-brutal-dark/40 cursor-not-allowed',
                                )}
                            >
                                Next: Reflection <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Reflection */}
                {step === 2 && (
                    <div className="space-y-5">
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight">Step 2 — Reflection</h2>
                        <p className="font-data text-sm text-brutal-dark/60">
                            Write about your experience. Consider these prompts:
                        </p>

                        {/* Tier-specific prompts */}
                        <div className="rounded-xl border border-brutal-dark/10 bg-brutal-dark/[0.03] p-4">
                            <ul className="space-y-1.5">
                                {prompts.map((p, i) => (
                                    <li key={i} className="flex items-start gap-2 font-data text-xs text-brutal-dark/60">
                                        <span className="w-1 h-1 rounded-full bg-brutal-red mt-1.5 flex-shrink-0" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <textarea
                            className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-4 rounded-xl font-data text-sm min-h-[160px] focus:outline-none focus:border-brutal-red transition-colors resize-none"
                            placeholder="What did you make? What did you learn? What would you do differently?"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <p className="font-data text-[9px] text-brutal-dark/35 text-right">
                            {notes.length} characters
                        </p>

                        <div className="flex justify-between pt-4 border-t-2 border-brutal-dark/10">
                            <button type="button" onClick={() => goto(1)} className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-dark">
                                ← Back
                            </button>
                            <button
                                type="button"
                                onClick={() => canLeaveStep2 && goto(3)}
                                disabled={!canLeaveStep2}
                                className={cn(
                                    'inline-flex items-center gap-2 rounded-xl px-5 py-3 font-data text-[11px] font-bold uppercase tracking-widest transition-all',
                                    canLeaveStep2
                                        ? 'bg-brutal-dark text-brutal-bg hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[4px_4px_0_0_rgba(196,41,30,0.9)]'
                                        : 'bg-brutal-dark/20 text-brutal-dark/40 cursor-not-allowed',
                                )}
                            >
                                Next: Review <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preview & Submit */}
                {step === 3 && (
                    <div className="space-y-5">
                        <h2 className="font-heading font-bold text-lg uppercase tracking-tight">Step 3 — Review & Submit</h2>

                        <div className="rounded-2xl border-2 border-brutal-dark/15 bg-brutal-bg p-5 space-y-4 shadow-[4px_4px_0_0_rgba(196,41,30,0.18)]">
                            {/* Challenge info */}
                            <div className="flex items-center gap-2 pb-3 border-b border-brutal-dark/10">
                                <Zap size={14} className="text-brutal-red" />
                                <span className="font-heading font-bold text-sm uppercase">{challenge.title}</span>
                                <span className="ml-auto font-data text-xs text-brutal-red font-bold">+{bountyXP} XP</span>
                            </div>

                            {/* Evidence summary */}
                            <div>
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">Evidence</p>
                                {evidenceFile && (
                                    <p className="font-data text-sm text-brutal-dark/80">
                                        <Upload size={12} className="inline mr-1.5" />
                                        {evidenceFile.name} ({(evidenceFile.size / 1024).toFixed(0)} KB)
                                    </p>
                                )}
                                {evidenceUrl && (
                                    <p className="font-data text-sm text-brutal-dark/80 break-all">
                                        <LinkIcon size={12} className="inline mr-1.5" />
                                        {evidenceUrl}
                                    </p>
                                )}
                            </div>

                            {/* Notes summary */}
                            <div>
                                <p className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/45 mb-1">Reflection</p>
                                <p className="font-data text-sm text-brutal-dark/70 whitespace-pre-wrap">{notes}</p>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 border-t-2 border-brutal-dark/10">
                            <button type="button" onClick={() => goto(2)} className="font-data text-xs font-bold uppercase tracking-widest text-brutal-dark/50 hover:text-brutal-dark">
                                ← Back
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brutal-red text-brutal-bg hover:bg-brutal-dark transition-colors px-6 py-3 font-data text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0_0_rgba(20,20,20,0.5)]"
                            >
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                {submitting ? 'Submitting...' : 'Submit for Review'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Step indicator ────────────────────────────────────────────────────────

function SubmitStepIndicator({ step }: { step: SubmitStep }) {
    const steps = [
        { n: 1 as const, label: 'Evidence', icon: <Upload size={10} /> },
        { n: 2 as const, label: 'Reflection', icon: <FileText size={10} /> },
        { n: 3 as const, label: 'Submit', icon: <Eye size={10} /> },
    ];

    return (
        <div className="flex items-center gap-3 font-data text-xs font-bold">
            {steps.map((s, i) => (
                <span key={s.n} className="contents">
                    <div className={`flex items-center gap-1.5 ${step === s.n ? 'text-brutal-red' : step > s.n ? 'text-brutal-dark' : 'text-brutal-dark/30'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${step === s.n ? 'bg-brutal-red text-white' : step > s.n ? 'bg-brutal-dark text-white' : 'bg-brutal-dark/10'}`}>
                            {step > s.n ? '✓' : s.n}
                        </span>
                        <span className="uppercase tracking-widest">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <span className="text-brutal-dark/20">—</span>}
                </span>
            ))}
        </div>
    );
}
