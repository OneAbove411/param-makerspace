import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
import { useAuth } from '../lib/auth';
import { useNavigate, useSearchParams } from 'react-router';
import { useMyProfile, useProfileMutation, useSupabaseQuery, useUserBadges, useRankAccess } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
import { getBadgeIcon } from '../lib/badgeIcons';
import { getProgressToNextRank, getNextRank } from '../lib/xpEngine';
import { RANK_THRESHOLDS } from '../lib/constants';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { toast } from '../lib/toast';
import { LOADING } from '../lib/copy';
import {
    Camera,
    Eye,
    Lock,
    Check,
    AlertTriangle,
    Loader2,
} from 'lucide-react';

// ─── Canonical maker-domain chip set ────────────────────────────────────
// Used by Mentor Domains and Approval Domains multi-selects. Keeps the
// mentor surface honest — free-form comma lists let typos and near-dupes
// leak into the directory.
const MAKER_DOMAINS = [
    'Electronics',
    'Robotics',
    'AI',
    'Software',
    'Web Dev',
    'Game Dev',
    'IoT',
    '3D Printing',
    'CNC',
    'Woodwork',
    'Metalwork',
] as const;

type DomainChip = (typeof MAKER_DOMAINS)[number];

// ─── Predefined skills for the dropdown ────────────────────────────────
const PREDEFINED_SKILLS = [
    'Python',
    'JavaScript',
    'TypeScript',
    'C/C++',
    'Rust',
    'Java',
    'React',
    'Node.js',
    'Arduino',
    'Raspberry Pi',
    'Electronics',
    'PCB Design',
    'Soldering',
    'Embedded Systems',
    'Robotics',
    'ROS',
    'Computer Vision',
    'Machine Learning',
    'Deep Learning',
    'NLP',
    'Data Science',
    '3D Printing',
    'CAD',
    'CNC',
    'Laser Cutting',
    'Woodworking',
    'Metalworking',
    'IoT',
    'Wireless Comms',
    'FPGA',
    'Firmware',
    'Mechanical Design',
    'UI/UX Design',
    'Figma',
    'Graphic Design',
    'Web Development',
    'Mobile Dev',
    'DevOps',
    'Cloud (AWS/GCP)',
    'Docker',
    'Linux',
    'Git',
    'Databases',
    'API Design',
    'Cybersecurity',
    'Quantum Computing',
    'Bioinformatics',
    'Signal Processing',
    'Control Systems',
    'Power Electronics',
] as const;

/** Normalize a comma-separated string into a clean chip array. */
function parseChips(raw: string | null | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Serialize a chip array back into the comma-separated DB format. */
function chipsToString(chips: string[]): string {
    return chips.join(', ');
}

/** Best-effort match from `declared_intent` to a canonical domain chip. */
function intentToDomain(intent: string | null | undefined): DomainChip | null {
    if (!intent) return null;
    const i = intent.toLowerCase();
    if (i.includes('robot')) return 'Robotics';
    if (i.includes('iot') || i.includes('sensor')) return 'IoT';
    if (i.includes('game')) return 'Game Dev';
    if (i.includes('lamp') || i.includes('electron')) return 'Electronics';
    if (i.includes('ai') || i.includes('ml')) return 'AI';
    if (i.includes('3d') || i.includes('print')) return '3D Printing';
    if (i.includes('wood')) return 'Woodwork';
    if (i.includes('metal')) return 'Metalwork';
    if (i.includes('cnc')) return 'CNC';
    if (i.includes('web')) return 'Web Dev';
    if (i.includes('software') || i.includes('code')) return 'Software';
    return null;
}

// ─── Section status tracking ────────────────────────────────────────────
type SectionKey = 'basics' | 'privacy' | 'skills' | 'links' | 'mentor';
type SectionStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Small inline save-status badge shown next to each section heading.
 * `idle` renders nothing — we only show the badge when something is
 * actually happening.
 */
function SectionStatusBadge({ status }: { status: SectionStatus }) {
    if (status === 'idle') return null;
    // Per Primer guidance: autosave feedback must be obvious without relying on
    // text alone. Each state has a distinct icon + color, and "saved" gets a
    // subtle motion-safe scale cue so the eye catches the confirmation.
    const map = {
        dirty: { icon: null, text: 'Unsaved', cls: 'bg-brutal-dark/5 text-brutal-dark/60', anim: '' },
        saving: { icon: <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />, text: LOADING.saving, cls: 'bg-brutal-dark/10 text-brutal-dark/70', anim: '' },
        saved: { icon: <Check className="w-3 h-3" aria-hidden="true" />, text: 'Saved', cls: 'bg-green-100 text-green-800', anim: 'motion-safe:animate-[fadeInScale_220ms_ease-out]' },
        error: { icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />, text: 'Save failed', cls: 'bg-brutal-red/10 text-brutal-red', anim: '' },
    }[status];
    return (
        <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-data text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${map.cls} ${map.anim}`}
        >
            {map.icon}
            {map.text}
        </span>
    );
}

/** Privacy toggle — lucide icons replacing the old cross-platform emoji. */
function PrivacyToggle({
    value,
    onChange,
    fieldLabel,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
    fieldLabel: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={value}
            aria-label={`${fieldLabel} visibility: ${value ? 'public' : 'hidden'}. Click to toggle.`}
            onClick={() => onChange(!value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-data text-[11px] font-bold uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red ${
                value
                    ? 'bg-brutal-dark/10 text-brutal-dark border border-brutal-dark/20'
                    : 'bg-brutal-red/10 text-brutal-red border border-brutal-red/30'
            }`}
        >
            {value
                ? <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                : <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
            {value ? 'Public' : 'Hidden'}
        </button>
    );
}

/** Reusable chip selector. Disabled chips render semi-transparent. */
function ChipSelect({
    options,
    selected,
    onToggle,
    isDisabled,
    ariaLabel,
}: {
    options: readonly string[];
    selected: string[];
    onToggle: (chip: string) => void;
    isDisabled?: (chip: string) => boolean;
    ariaLabel: string;
}) {
    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
            {options.map((opt) => {
                const isSelected = selected.includes(opt);
                const disabled = isDisabled?.(opt) ?? false;
                return (
                    <button
                        key={opt}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-disabled={disabled || undefined}
                        disabled={disabled}
                        onClick={() => !disabled && onToggle(opt)}
                        className={`px-3 py-1.5 rounded-full font-data text-xs font-bold uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red disabled:cursor-not-allowed ${
                            isSelected
                                ? 'bg-brutal-red text-brutal-bg border-2 border-brutal-red'
                                : disabled
                                    ? 'bg-brutal-dark/5 text-brutal-dark/30 border-2 border-brutal-dark/10'
                                    : 'bg-brutal-bg text-brutal-dark border-2 border-brutal-dark/20 hover:border-brutal-red'
                        }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

/** Skills selector — dropdown with predefined skills + "Others" for custom entry. */
function SkillsSelector({
    value,
    onChange,
}: {
    value: string;
    onChange: (skills: string) => void;
}) {
    const selected = useMemo(
        () => value.split(',').map((s) => s.trim()).filter(Boolean),
        [value]
    );
    const [showDropdown, setShowDropdown] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleSkill = (skill: string) => {
        const next = selected.includes(skill)
            ? selected.filter((s) => s !== skill)
            : [...selected, skill];
        onChange(next.join(', '));
    };

    const addCustomSkill = () => {
        const trimmed = customInput.trim();
        if (trimmed && !selected.includes(trimmed)) {
            onChange([...selected, trimmed].join(', '));
        }
        setCustomInput('');
        setShowCustom(false);
    };

    const removeSkill = (skill: string) => {
        onChange(selected.filter((s) => s !== skill).join(', '));
    };

    // Skills not in the predefined list (user-added custom ones)
    const customSkills = selected.filter((s) => !PREDEFINED_SKILLS.includes(s as any));

    return (
        <div>
            <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                Skills
            </label>

            {/* Selected skills as removable chips */}
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {selected.map((skill) => (
                        <button
                            key={skill}
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brutal-red text-brutal-bg font-data text-[11px] font-bold uppercase tracking-wide hover:bg-brutal-dark transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            aria-label={`Remove ${skill}`}
                        >
                            {skill}
                            <span aria-hidden className="text-brutal-bg/70 ml-0.5">×</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Dropdown trigger + dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full flex items-center justify-between h-12 rounded-xl bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-2 font-data text-sm text-brutal-dark/60 hover:border-brutal-red/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                >
                    <span>{selected.length > 0 ? `${selected.length} skill${selected.length > 1 ? 's' : ''} selected` : 'Select your skills…'}</span>
                    <svg className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {showDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-brutal-bg border-2 border-brutal-dark/20 rounded-xl shadow-[6px_6px_0_0_rgba(196,41,30,0.18)] max-h-[280px] overflow-y-auto">
                        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                            {PREDEFINED_SKILLS.map((skill) => {
                                const isSelected = selected.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={`px-2.5 py-1.5 rounded-lg font-data text-[11px] font-bold text-left transition-colors ${
                                            isSelected
                                                ? 'bg-brutal-red text-brutal-bg'
                                                : 'bg-brutal-bg text-brutal-dark/70 hover:bg-brutal-dark/5'
                                        }`}
                                    >
                                        {skill}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Others — add custom skill */}
                        <div className="border-t border-brutal-dark/10 p-2">
                            {showCustom ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                                        placeholder="Type a custom skill…"
                                        className="flex-1 h-9 rounded-lg bg-brutal-bg border-2 border-brutal-dark/20 px-3 font-data text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brutal-red"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={addCustomSkill}
                                        className="px-3 h-9 rounded-lg bg-brutal-dark text-brutal-bg font-data text-[11px] font-bold uppercase hover:bg-brutal-red transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCustom(true)}
                                    className="w-full px-2.5 py-1.5 rounded-lg font-data text-[11px] font-bold text-brutal-dark/50 hover:bg-brutal-dark/5 text-left transition-colors"
                                >
                                    + Others (add custom skill)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-xs font-data text-brutal-dark/60 mt-1.5">
                These help others find you in the directory.
            </p>
        </div>
    );
}

export function ProfileSetup() {
    const pageRef = useRef<HTMLDivElement>(null);
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // §1.5: validate `?next=` so we can return the user to wherever
    // useRequireProfile() bounced them from. Open-redirect guard.
    const nextParam = searchParams.get('next');
    const nextTarget =
        nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
            ? nextParam
            : '/dashboard';

    const { data: existingProfile, loading: profileLoading } = useMyProfile();
    const { saveProfile } = useProfileMutation();
    const { data: myBadges } = useUserBadges(user?.id);
    const { data: rankAccess } = useRankAccess();

    const [submitLoading, setSubmitLoading] = useState(false);
    const [topError, setTopError] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [form, setForm] = useState({
        display_name: '',
        bio: '',
        skills: '',
        aspirations: '',
        github_url: '',
        linkedin_url: '',
        website_url: '',
        instagram_url: '',
        mentor_domains: '',
        approval_domains: '',
    });
    const [privacySettings, setPrivacySettings] = useState({ show_email: false });

    // ─── Section save-status tracking ───────────────────────────────
    const [sectionStatus, setSectionStatus] = useState<Record<SectionKey, SectionStatus>>({
        basics: 'idle',
        privacy: 'idle',
        skills: 'idle',
        links: 'idle',
        mentor: 'idle',
    });
    const dirtySectionsRef = useRef<Set<SectionKey>>(new Set());
    const savedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hydratedRef = useRef(false);

    const dirty = Object.values(sectionStatus).some((s) => s === 'dirty' || s === 'saving');
    useUnsavedChanges(dirty);

    // Fetch domain levels for "Your Progress" section
    const { data: myCompletions } = useSupabaseQuery(async () => {
        if (!user) return { data: [], error: null };
        return supabase
            .from('challenge_completion')
            .select('challenge:challenge!challenge_id(domain, tier)')
            .eq('user_id', user.id)
            .eq('status', 'verified');
    }, [user?.id]);

    // Derive domain levels
    const tierOrder: Record<string, number> = { 'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3 };
    const domainMap: Record<string, string> = {};
    ((myCompletions as any[]) || []).forEach((c: any) => {
        const domain = c.challenge?.domain;
        const tier = c.challenge?.tier;
        if (!domain || !tier) return;
        const current = domainMap[domain];
        if (!current || (tierOrder[tier] || 0) > (tierOrder[current] || 0)) {
            domainMap[domain] = tier;
        }
    });
    const domainLevels = Object.entries(domainMap).map(([domain, tier]) => ({ domain, tier }));

    // Track whether we've already populated the form from the DB once.
    // After the initial hydration, subsequent `existingProfile` changes
    // (caused by refetches after autosave → refreshUser) must NOT reset
    // the form — that would wipe whatever the user is currently typing.
    const initialHydrationDoneRef = useRef(false);

    // Pre-fill form when existing profile loads (ONCE only)
    useEffect(() => {
        // Skip re-hydration if the form has already been populated.
        if (initialHydrationDoneRef.current) return;

        if (existingProfile) {
            const ep = existingProfile as any;

            // Load existing skills from entity_tag so autosave doesn't
            // send an empty array and wipe them.
            (async () => {
                const { data: tagRows } = await supabase
                    .from('entity_tag')
                    .select('tag:tag(name)')
                    .eq('target_type', 'maker_profile')
                    .eq('target_id', ep.id);
                const skillNames = (tagRows || [])
                    .map((t: any) => t.tag?.name)
                    .filter(Boolean)
                    .join(', ');

                setForm({
                    display_name: ep.display_name || user?.name || '',
                    bio: ep.bio || '',
                    skills: skillNames,
                    aspirations: ep.aspirations || '',
                    github_url: ep.github_url || '',
                    linkedin_url: ep.linkedin_url || '',
                    website_url: ep.website_url || '',
                    instagram_url: ep.instagram_url || '',
                    mentor_domains: ep.mentor_domains || '',
                    approval_domains: ep.approval_domains || '',
                });
                setPrivacySettings({ show_email: ep.show_email || false });
                setAvatarUrl(ep.avatar_url || null);

                // §1.5 F-101: if the user landed here with a declared_intent but
                // hasn't touched mentor_domains yet, pre-select the matching chip
                // so the Zeigarnik build-intent becomes a visible, committed
                // artifact instead of a one-time eyebrow line.
                const matched = intentToDomain(ep.declared_intent);
                if (matched && !ep.mentor_domains) {
                    setForm((prev) => ({ ...prev, mentor_domains: matched }));
                }

                // Mark initial hydration as complete so this never re-runs.
                initialHydrationDoneRef.current = true;

                // Release the hydration guard next tick so autosave doesn't
                // fire on the initial preload.
                setTimeout(() => { hydratedRef.current = true; }, 0);
            })();
        } else if (user) {
            setForm((prev) => ({ ...prev, display_name: user.name || '' }));
        }
    }, [existingProfile, user]);

    // GSAP entrance animations (respect prefers-reduced-motion)
    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !pageRef.current) return;

        gsap.fromTo(
            '.ps-hero-text',
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }
        );
        gsap.utils.toArray('.ps-section').forEach((element: any) => {
            gsap.fromTo(
                element,
                { y: 40, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: 'power3.out',
                    scrollTrigger: { trigger: element, start: 'top 80%', markers: false },
                }
            );
        });
        return () => { ScrollTrigger.getAll().forEach((trigger: { kill: () => void }) => trigger.kill()); };
    }, []);

    // ─── Section-dirty marker + debounced autosave ──────────────────
    const markDirty = useCallback((section: SectionKey) => {
        if (!hydratedRef.current) return;
        dirtySectionsRef.current.add(section);
        setSectionStatus((prev) => (prev[section] === 'dirty' ? prev : { ...prev, [section]: 'dirty' }));

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { runAutosave(); }, 1500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Build a stable ref for runAutosave so markDirty's closure stays clean.
    const runAutosaveRef = useRef<() => Promise<void>>(async () => {});

    const buildSavePayload = useCallback(() => {
        const skills = form.skills.split(',').map((s) => s.trim()).filter(Boolean);
        return {
            display_name: form.display_name,
            bio: form.bio || undefined,
            aspirations: form.aspirations || undefined,
            github_url: form.github_url || undefined,
            linkedin_url: form.linkedin_url || undefined,
            website_url: form.website_url || undefined,
            avatar_url: avatarUrl || undefined,
            instagram_url: form.instagram_url || undefined,
            mentor_domains: form.mentor_domains || undefined,
            approval_domains: form.approval_domains || undefined,
            show_email: privacySettings.show_email,
            skills,
        };
    }, [form, avatarUrl, privacySettings]);

    const runAutosave = useCallback(async () => {
        if (!user || !hydratedRef.current) return;
        const savingSet = new Set(dirtySectionsRef.current);
        if (savingSet.size === 0) return;
        dirtySectionsRef.current = new Set();

        setSectionStatus((prev) => {
            const next = { ...prev };
            savingSet.forEach((s) => { next[s] = 'saving'; });
            return next;
        });

        const { error: err } = await saveProfile(buildSavePayload());

        if (err) {
            setSectionStatus((prev) => {
                const next = { ...prev };
                savingSet.forEach((s) => { next[s] = 'error'; });
                return next;
            });
            toast.error(`Autosave failed: ${err}`);
            return;
        }

        setSectionStatus((prev) => {
            const next = { ...prev };
            savingSet.forEach((s) => { next[s] = 'saved'; });
            return next;
        });
        // Fade `Saved` pills back to idle after 2 seconds.
        savingSet.forEach((s) => {
            if (savedTimersRef.current[s]) clearTimeout(savedTimersRef.current[s]);
            savedTimersRef.current[s] = setTimeout(() => {
                setSectionStatus((prev) => (prev[s] === 'saved' ? { ...prev, [s]: 'idle' } : prev));
            }, 2000);
        });
    }, [user, saveProfile, buildSavePayload]);

    runAutosaveRef.current = runAutosave;

    // Rewire markDirty to use the latest runAutosave via the ref so we don't
    // capture stale `form` snapshots inside the setTimeout.
    const markDirtyLatest = useCallback((section: SectionKey) => {
        if (!hydratedRef.current) return;
        dirtySectionsRef.current.add(section);
        setSectionStatus((prev) => (prev[section] === 'dirty' ? prev : { ...prev, [section]: 'dirty' }));
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => { runAutosaveRef.current(); }, 1500);
    }, []);

    // Flush pending autosave on unmount.
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            Object.values(savedTimersRef.current).forEach(clearTimeout);
        };
    }, []);

    // ─── Avatar upload ──────────────────────────────────────────────
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setAvatarFile(file);

        // Local preview for instant feedback.
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);

        // Kick the upload immediately — skeleton + toast handle feedback.
        setAvatarUploading(true);
        const path = `${user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
        const { url, error: uploadErr } = await uploadFile('avatars', path, file);
        setAvatarUploading(false);

        if (uploadErr || !url) {
            toast.error(`Avatar upload failed: ${uploadErr || 'Unknown error'}`);
            setAvatarFile(null);
            setAvatarPreview(null);
            return;
        }
        setAvatarUrl(url);
        toast.success('Avatar updated');
        // Persist the new URL with the rest of the profile.
        markDirtyLatest('basics');
    };

    // ─── Required-field progress computation ────────────────────────
    const progress = useMemo(() => {
        const requirements = [
            !!form.display_name.trim(),
            !!form.bio.trim(),
            form.skills.split(',').map((s) => s.trim()).filter(Boolean).length > 0,
            !!(avatarUrl || avatarPreview),
            !!(form.github_url || form.linkedin_url || form.website_url || form.instagram_url),
        ];
        const done = requirements.filter(Boolean).length;
        const total = requirements.length;
        return { done, total, percent: Math.round((done / total) * 100) };
    }, [form, avatarUrl, avatarPreview]);

    // ─── Mentor / approval chip selection (backed by comma strings) ─
    const mentorChips = useMemo(() => parseChips(form.mentor_domains), [form.mentor_domains]);
    const approvalChips = useMemo(() => parseChips(form.approval_domains), [form.approval_domains]);

    const toggleMentorChip = (chip: string) => {
        const next = mentorChips.includes(chip)
            ? mentorChips.filter((c) => c !== chip)
            : [...mentorChips, chip];
        // Drop any approval chips that are no longer in mentor set.
        const nextApproval = approvalChips.filter((c) => next.includes(c));
        setForm((prev) => ({
            ...prev,
            mentor_domains: chipsToString(next),
            approval_domains: chipsToString(nextApproval),
        }));
        markDirtyLatest('mentor');
    };
    const toggleApprovalChip = (chip: string) => {
        if (!mentorChips.includes(chip)) return;
        const next = approvalChips.includes(chip)
            ? approvalChips.filter((c) => c !== chip)
            : [...approvalChips, chip];
        setForm((prev) => ({ ...prev, approval_domains: chipsToString(next) }));
        markDirtyLatest('mentor');
    };

    // ─── Explicit final save (Enter key / Save profile button) ──────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);
        setTopError('');

        // Flush any pending debounce first.
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }

        const { error: err } = await saveProfile(buildSavePayload());

        if (!err && user) {
            try {
                const { checkProfileCompletionXP } = await import('../lib/xpEngine');
                await checkProfileCompletionXP(user.id);
            } catch (e) {
                console.error('Failed to trigger profile completion XP check', e);
            }
        }

        setSubmitLoading(false);
        if (err) {
            setTopError(err);
            toast.error(`Save failed: ${err}`);
            return;
        }

        // Clear all section statuses — everything is saved.
        dirtySectionsRef.current = new Set();
        setSectionStatus({
            basics: 'saved',
            privacy: 'saved',
            skills: 'saved',
            links: 'saved',
            mentor: 'saved',
        });
        toast.success('Profile saved');

        // §1.5: mark the once-per-session bounce as satisfied so the user
        // isn't redirected back to /profile-setup by useRequireProfile() on
        // the next page. (Previously this cleared the flag, which caused an
        // immediate bounce-back loop whenever bio or avatar was left blank.)
        try { sessionStorage.setItem('redirected_to_profile_setup', '1'); } catch { /* ignore */ }
        navigate(nextTarget);
    };

    if (profileLoading) {
        return (
            <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen flex justify-center">
                <div className="w-full max-w-3xl space-y-6 mt-20">
                    <Skeleton variant="line" className="h-10 w-2/3" />
                    <Skeleton variant="line" className="h-4 w-1/2" />
                    <Skeleton variant="card" />
                    <Skeleton variant="card" />
                </div>
            </div>
        );
    }

    // Section heading helper — keeps markup consistent.
    // Red underline accent ties each section visually to the brand without
    // reintroducing numbered prefixes. Status badge sits inline on the right.
    const SectionHeading = ({
        title,
        section,
    }: {
        title: string;
        section: SectionKey;
    }) => (
        <div className="flex items-center justify-between gap-3 mb-3 pb-1.5 border-b border-brutal-dark/10 relative">
            <h3 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                {title}
            </h3>
            <SectionStatusBadge status={sectionStatus[section]} />
            <span className="absolute bottom-[-1px] left-0 h-[2px] w-10 bg-brutal-red" aria-hidden />
        </div>
    );

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen">
            <div className="pt-32 md:pt-36 pb-8 px-4 sm:px-6 md:px-10 lg:px-12 max-w-6xl mx-auto">
                <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h1 className="ps-hero-text font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight-heading text-brutal-dark">
                        Your maker profile.
                    </h1>
                    {(existingProfile as any)?.declared_intent && (
                        <p
                            className="ps-hero-text font-drama italic text-brutal-red text-xs hidden sm:block truncate max-w-[50%]"
                            data-testid="ps-intent-eyebrow"
                        >
                            you said: <span className="font-bold">{(existingProfile as any).declared_intent}</span>
                        </p>
                    )}
                </div>
                <p className="ps-hero-text font-data text-sm text-brutal-dark/60 border-l-2 border-brutal-red pl-3 mb-5">
                    This is what the community sees in the Maker Directory. Changes save automatically.
                </p>

                <Card className="p-4 sm:p-5 md:p-6 lg:p-7 border-2 border-brutal-dark/10">
                    {topError && (
                        <div
                            role="alert"
                            aria-live="assertive"
                            className="mb-6 p-4 bg-brutal-red/5 border-2 border-brutal-red/30 rounded-xl flex items-start gap-3"
                        >
                            <AlertTriangle className="w-5 h-5 text-brutal-red mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <p className="font-data text-sm text-brutal-red font-bold">{topError}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* Identity strip — avatar, live name/progress, privacy pill.
                            Follows research pattern: core identity + progress in one
                            glance so users immediately see who they are and how close
                            to discoverable. Single row on sm+, stacks on mobile. */}
                        <section
                            aria-labelledby="ps-avatar-heading"
                            className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pb-5 border-b-2 border-brutal-dark/10"
                        >
                            <h2 id="ps-avatar-heading" className="sr-only">Identity</h2>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="relative group flex-shrink-0">
                                    {avatarUploading ? (
                                        <Skeleton variant="avatar" className="w-20 h-20" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brutal-dark bg-brutal-dark flex items-center justify-center">
                                            {avatarPreview || avatarUrl ? (
                                                <img
                                                    src={avatarPreview || avatarUrl || ''}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="font-heading font-bold text-2xl text-brutal-bg" aria-hidden="true">
                                                    {form.display_name?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 w-7 h-7 bg-brutal-red text-brutal-bg rounded-full flex items-center justify-center cursor-pointer hover:bg-brutal-dark transition-colors border-2 border-brutal-bg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brutal-red">
                                        <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                                        <span className="sr-only">Upload profile photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="sr-only"
                                            onChange={handleAvatarChange}
                                        />
                                    </label>
                                </div>
                                {/* Name + progress column — fills available space */}
                                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                                    <div className="font-heading font-bold text-lg text-brutal-dark truncate">
                                        {form.display_name || 'Unnamed maker'}
                                    </div>
                                    <p className="font-data text-[11px] text-brutal-dark/60 leading-snug truncate">
                                        {avatarUploading ? 'Uploading photo…' : 'Click the camera to upload a photo.'}
                                    </p>
                                    {/* Inline progress bar with action-oriented copy */}
                                    <div className="mt-1" role="group" aria-label="Profile completion progress">
                                        <div className="flex items-center justify-between mb-1 gap-2">
                                            <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-dark/60 truncate">
                                                {progress.done === progress.total
                                                    ? 'Profile complete — you\'re discoverable'
                                                    : `${progress.done} of ${progress.total} essentials · ${progress.total - progress.done} to go for full visibility`}
                                            </span>
                                            <span
                                                className="font-data text-[10px] font-bold text-brutal-red flex-shrink-0"
                                                aria-live="polite"
                                            >
                                                {progress.percent}%
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-brutal-dark/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-brutal-red transition-all duration-500"
                                                style={{ width: `${progress.percent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy pill — dashboard-style brutalist fun button.
                                Dark fill + red drop shadow. Clicking the eye icon
                                toggles the email visibility in the Maker Directory. */}
                            <div
                                className="sm:ml-auto flex items-center gap-3 px-4 py-3 bg-brutal-dark text-brutal-bg rounded-2xl border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(196,41,30,0.5)] min-w-0 flex-shrink-0"
                                aria-labelledby="ps-privacy-heading"
                            >
                                <h3 id="ps-privacy-heading" className="sr-only">Privacy</h3>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-data text-[10px] font-bold uppercase tracking-wider text-brutal-bg/60">
                                        Email in directory
                                    </span>
                                    <span className="font-data text-xs font-bold truncate max-w-[220px]">
                                        {user?.email}
                                    </span>
                                </div>
                                <PrivacyToggle
                                    fieldLabel="Email"
                                    value={privacySettings.show_email}
                                    onChange={(v) => {
                                        setPrivacySettings((prev) => ({ ...prev, show_email: v }));
                                        markDirtyLatest('privacy');
                                    }}
                                />
                                <SectionStatusBadge status={sectionStatus.privacy} />
                            </div>
                        </section>

                        {/* Two-column grid on lg+ so the whole form fits one screen.
                            Mobile and tablet stay single-column (source order 01→06).
                            On lg, CSS grid auto-flow places sections row-by-row:
                            left = 01, 03, 05/06; right = 02, 04, (05 or 06).
                            Each section uses `self-start` so columns don't stretch. */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                        {/* 01 Basics */}
                        <section aria-labelledby="ps-basics-heading" className="ps-section space-y-4 self-start min-w-0">
                            <div id="ps-basics-heading">
                                <SectionHeading title="Basics" section="basics" />
                            </div>
                            <Input
                                label="Full name"
                                value={form.display_name}
                                onChange={(e) => {
                                    setForm((prev) => ({ ...prev, display_name: e.target.value }));
                                    markDirtyLatest('basics');
                                }}
                                required
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                    Short bio
                                </label>
                                <textarea
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded-xl text-brutal-dark font-data focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red focus-visible:border-brutal-red transition-colors"
                                    rows={3}
                                    placeholder="What do you build? What problems do you like solving?"
                                    value={form.bio}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, bio: e.target.value }));
                                        markDirtyLatest('basics');
                                    }}
                                />
                                <p className="font-data text-xs text-brutal-dark/60 mt-1">
                                    A few sentences. Shows up under your avatar in the directory.
                                </p>
                            </div>
                        </section>

                        {/* Skills & goals (Privacy moved into the avatar strip above) */}
                        <section aria-labelledby="ps-skills-heading" className="ps-section space-y-4 self-start min-w-0">
                            <div id="ps-skills-heading">
                                <SectionHeading title="Skills & goals" section="skills" />
                            </div>
                            <SkillsSelector
                                value={form.skills}
                                onChange={(skills) => {
                                    setForm((prev) => ({ ...prev, skills }));
                                    markDirtyLatest('skills');
                                }}
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                    What are you working toward?
                                </label>
                                <Input
                                    placeholder="Ship an open-source medical device…"
                                    value={form.aspirations}
                                    onChange={(e) => {
                                        setForm((prev) => ({ ...prev, aspirations: e.target.value }));
                                        markDirtyLatest('skills');
                                    }}
                                />
                            </div>
                        </section>

                        {/* Links — full-width row, 3-col inner grid on lg for the 6 fields */}
                        <section aria-labelledby="ps-links-heading" className="ps-section space-y-4 self-start min-w-0 lg:col-span-2">
                            <div id="ps-links-heading">
                                <SectionHeading title="Links" section="links" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {[
                                    { key: 'github_url', label: 'GitHub', placeholder: 'https://github.com/…' },
                                    { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/…' },
                                    { key: 'website_url', label: 'Personal website', placeholder: 'https://…' },
                                    { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/handle' },
                                ].map(({ key, label, placeholder }) => (
                                    <Input
                                        key={key}
                                        label={label}
                                        placeholder={placeholder}
                                        value={(form as any)[key]}
                                        onChange={(e) => {
                                            setForm((prev) => ({ ...prev, [key]: e.target.value }));
                                            markDirtyLatest('links');
                                        }}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* 05 Mentor settings (mentors only) */}
                        {role === 'mentor' && (
                            <section
                                aria-labelledby="ps-mentor-heading"
                                className="ps-section space-y-4 self-start min-w-0 lg:col-span-2 pt-5 border-t-2 border-brutal-dark/10"
                            >
                                <div id="ps-mentor-heading">
                                    <SectionHeading title="Mentor settings" section="mentor" />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                        Mentor domains
                                    </label>
                                    <p className="font-data text-xs text-brutal-dark/60 mb-3">
                                        Domains where you can guide and support makers. Pick as many as apply.
                                    </p>
                                    <ChipSelect
                                        options={MAKER_DOMAINS}
                                        selected={mentorChips}
                                        onToggle={toggleMentorChip}
                                        ariaLabel="Mentor domains"
                                    />
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block">
                                        Approval domains
                                    </label>
                                    <p className="font-data text-xs text-brutal-dark/60 mb-3">
                                        Approval domains must be a subset of your mentor domains — pick from the list.
                                    </p>
                                    <ChipSelect
                                        options={MAKER_DOMAINS}
                                        selected={approvalChips}
                                        onToggle={toggleApprovalChip}
                                        isDisabled={(c) => !mentorChips.includes(c)}
                                        ariaLabel="Approval domains"
                                    />
                                </div>
                            </section>
                        )}

                        {/* 06 Your Progress */}
                        <section aria-labelledby="ps-progress-heading" className="ps-section space-y-3 self-start min-w-0 lg:col-span-2 pt-5 border-t-2 border-brutal-dark/10">
                            <div className="mb-3 pb-1.5 border-b border-brutal-dark/10 relative">
                                <h3 id="ps-progress-heading" className="font-heading font-bold text-sm uppercase tracking-tight-heading text-brutal-dark">
                                    Your progress
                                </h3>
                                <span className="absolute bottom-[-1px] left-0 h-[2px] w-10 bg-brutal-red" aria-hidden />
                            </div>

                            {/* XP + Rank progress bar */}
                            {(() => {
                                const currentXP = rankAccess?.xp ?? 0;
                                const currentRank = rankAccess?.rank ?? 'Curious';
                                const nextRank = getNextRank(currentRank);
                                const progressPercent = getProgressToNextRank(currentXP, currentRank);
                                const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : null;
                                const CurRankIcon = getBadgeIcon({ name: currentRank, badge_type: 'achievement', domain: 'General' });
                                return (
                                    <div className="p-3 bg-brutal-bg border border-brutal-dark/10 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CurRankIcon className="w-4 h-4 text-brutal-red" strokeWidth={2} />
                                                <span className="font-data text-xs font-bold text-brutal-dark uppercase">{currentRank}</span>
                                            </div>
                                            <span className="font-data text-[11px] font-bold text-brutal-dark/50 tabular-nums">
                                                {currentXP} XP
                                            </span>
                                        </div>
                                        {nextRank && nextThreshold != null && (
                                            <>
                                                <div className="w-full h-2 bg-brutal-dark/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brutal-red rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.max(progressPercent, 3)}%` }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-data text-[10px] text-brutal-dark/40">
                                                        {nextThreshold - currentXP} XP to {nextRank}
                                                    </span>
                                                    <span className="font-data text-[10px] text-brutal-dark/40 tabular-nums">
                                                        {nextThreshold} XP
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        {!nextRank && (
                                            <p className="font-data text-[10px] text-brutal-red font-bold uppercase">Max rank reached</p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Earned badges — fallback to Curious if DB badges haven't loaded yet */}
                            {(() => {
                                const hasBadgesFromDB = myBadges && myBadges.length > 0;
                                const badgeList = hasBadgesFromDB
                                    ? myBadges
                                    : [{ id: 'fallback-curious', badge: { name: 'Curious', badge_type: 'achievement', domain: 'General', description: 'Joined the Param Makerspace and started exploring.' } }];
                                return (
                                    <div>
                                        <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 mb-2">
                                            Badges earned
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {badgeList.map((ub: any) => {
                                                const badge = ub.badge;
                                                if (!badge) return null;
                                                const BadgeIcon = getBadgeIcon({ name: badge.name, badge_type: badge.badge_type, domain: badge.domain });
                                                return (
                                                    <div
                                                        key={ub.id}
                                                        title={`${badge.name}: ${badge.description || ''}`}
                                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-brutal-dark/5 border border-brutal-dark/10 rounded-xl"
                                                    >
                                                        <BadgeIcon className="w-3.5 h-3.5 text-brutal-red" strokeWidth={2} />
                                                        <span className="font-data text-[11px] font-bold text-brutal-dark">{badge.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Quick tip for new users */}
                            {(rankAccess?.xp ?? 0) < 60 && progress.percent < 100 && (
                                <div className="p-2.5 bg-brutal-red/5 border border-brutal-red/15 rounded-xl">
                                    <p className="font-data text-[11px] text-brutal-dark/70">
                                        <span className="font-bold text-brutal-red">Tip:</span> Complete your profile to earn <span className="font-bold">+50 XP</span> and unlock project proposals.
                                    </p>
                                </div>
                            )}

                            {/* Domain levels */}
                            {domainLevels.length > 0 && (
                                <div>
                                    <div className="font-data text-[9px] font-bold uppercase tracking-widest text-brutal-dark/35 mb-2 mt-3">
                                        Domain levels
                                    </div>
                                    <div className="space-y-2">
                                        {domainLevels.map((dl) => (
                                            <div
                                                key={dl.domain}
                                                className="flex items-center justify-between p-3 bg-brutal-bg border border-brutal-dark/10 rounded-xl"
                                            >
                                                <span className="font-data text-sm font-bold text-brutal-dark">{dl.domain}</span>
                                                <span
                                                    className={`font-data text-xs font-bold px-2 py-1 rounded uppercase ${
                                                        dl.tier === 'Tier 3'
                                                            ? 'bg-brutal-red text-brutal-bg'
                                                            : dl.tier === 'Tier 2'
                                                                ? 'bg-brutal-dark text-brutal-bg'
                                                                : 'bg-brutal-dark/10 text-brutal-dark'
                                                    }`}
                                                >
                                                    {dl.tier}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                        </div>
                        {/* end of two-column grid */}

                        {/* Footer actions — full width below the grid */}
                        <div className="pt-5 border-t-2 border-brutal-dark/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <p className="font-data text-xs text-brutal-dark/60">
                                Changes save automatically. This button just takes you to the next step.
                            </p>
                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => navigate(nextTarget)}>
                                    Skip for now
                                </Button>
                                <Button type="submit" disabled={submitLoading}>
                                    {submitLoading ? LOADING.saving : 'Save & continue'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
