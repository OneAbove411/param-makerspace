import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useMyProfile, useProfileMutation, useSupabaseQuery } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import { checkProfileCompletionXP } from '../lib/xpEngine';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Camera } from 'lucide-react';

// --- DB Migration Notes (run manually in Supabase SQL editor) ---
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS x_url TEXT;
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS bluesky_url TEXT;
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS discord_username TEXT;
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS mentor_domains TEXT;
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS approval_domains TEXT;
// ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;

function PrivacyToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full font-data text-[10px] font-bold uppercase transition-colors ${
                value
                    ? 'bg-brutal-dark/10 text-brutal-dark/50'
                    : 'bg-brutal-red/10 text-brutal-red border border-brutal-red/20'
            }`}
        >
            {value ? '👁 Public' : '🔒 Hidden'}
        </button>
    );
}

export function ProfileSetup() {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const { data: existingProfile, loading: profileLoading } = useMyProfile();
    const { saveProfile } = useProfileMutation();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [form, setForm] = useState({
        display_name: '',
        pronouns: '',
        bio: '',
        skills: '',
        aspirations: '',
        github_url: '',
        linkedin_url: '',
        website_url: '',
        x_url: '',
        bluesky_url: '',
        discord_username: '',
        mentor_domains: '',
        approval_domains: '',
    });
    const [privacySettings, setPrivacySettings] = useState({
        show_email: false,
    });

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

    // Pre-fill form when existing profile loads
    useEffect(() => {
        if (existingProfile) {
            const ep = existingProfile as any;
            setForm({
                display_name: ep.display_name || user?.name || '',
                pronouns: ep.pronouns || '',
                bio: ep.bio || '',
                skills: '', // Will be loaded separately via tags
                aspirations: ep.aspirations || '',
                github_url: ep.github_url || '',
                linkedin_url: ep.linkedin_url || '',
                website_url: ep.website_url || '',
                x_url: ep.x_url || '',
                bluesky_url: ep.bluesky_url || '',
                discord_username: ep.discord_username || '',
                mentor_domains: ep.mentor_domains || '',
                approval_domains: ep.approval_domains || '',
            });
            setPrivacySettings({
                show_email: ep.show_email || false,
            });
        } else if (user) {
            setForm(prev => ({ ...prev, display_name: user.name || '' }));
        }
    }, [existingProfile, user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setAvatarPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Upload avatar if new file selected
        let avatarUrl: string | undefined = undefined;
        if (avatarFile && user) {
            const path = `${user.id}/avatar-${Date.now()}.${avatarFile.name.split('.').pop()}`;
            const { url, error: uploadErr } = await uploadFile('avatars', path, avatarFile);
            if (uploadErr) {
                setError(`Avatar upload failed: ${uploadErr}`);
                setLoading(false);
                return;
            }
            avatarUrl = url || undefined;
        }

        const skills = form.skills
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const { error: err } = await saveProfile({
            display_name: form.display_name,
            pronouns: form.pronouns || undefined,
            bio: form.bio || undefined,
            aspirations: form.aspirations || undefined,
            github_url: form.github_url || undefined,
            linkedin_url: form.linkedin_url || undefined,
            website_url: form.website_url || undefined,
            avatar_url: avatarUrl,
            x_url: form.x_url || undefined,
            bluesky_url: form.bluesky_url || undefined,
            discord_username: form.discord_username || undefined,
            mentor_domains: form.mentor_domains || undefined,
            approval_domains: form.approval_domains || undefined,
            show_email: privacySettings.show_email,
            skills,
        });

        if (!err && user) {
            try {
                const { checkProfileCompletionXP } = await import('../lib/xpEngine');
                await checkProfileCompletionXP(user.id);
            } catch (e) {
                console.error('Failed to trigger profile completion XP check', e);
            }
        }

        setLoading(false);
        if (err) {
            setError(err);
        } else {
            navigate('/dashboard');
        }
    };

    if (profileLoading) {
        return <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 min-h-screen flex justify-center"><p className="font-data text-xl mt-20">Loading profile...</p></div>;
    }

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-3xl mx-auto">
                <h1 className="font-heading font-bold text-5xl md:text-6xl uppercase tracking-tight-heading mb-4">
                    Identity Configuration
                </h1>
                <p className="font-data text-xl text-brutal-dark/60 mb-12 border-l-4 border-brutal-red pl-4">
                    Customize your public presence in the Maker Directory.
                </p>

                <Card className="p-8 md:p-12 border-2 border-brutal-dark/10 shadow-xl">
                    {error && (
                        <div className="mb-6 p-3 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-xl">
                            <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-4 pb-8 border-b-2 border-brutal-dark/10 mb-8">
                            <div className="relative group">
                                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-brutal-dark bg-brutal-dark flex items-center justify-center">
                                    {avatarPreview || (existingProfile as any)?.avatar_url ? (
                                        <img
                                            src={avatarPreview || (existingProfile as any)?.avatar_url || ''}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="font-heading font-bold text-4xl text-brutal-bg">
                                            {form.display_name?.[0]?.toUpperCase() || '?'}
                                        </span>
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 w-8 h-8 bg-brutal-red text-brutal-bg rounded-full flex items-center justify-center cursor-pointer hover:bg-brutal-dark transition-colors border-2 border-brutal-bg">
                                    <Camera className="w-4 h-4" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleAvatarChange}
                                    />
                                </label>
                            </div>
                            <p className="font-data text-xs text-brutal-dark/50">Click the camera icon to upload your photo</p>
                        </div>

                        {/* Basic Telemetry */}
                        <div className="space-y-6">
                            <h3 className="font-heading font-bold text-2xl border-b border-brutal-dark/10 pb-2 uppercase tracking-tight-heading text-brutal-red">Basic Telemetry</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="Full Name"
                                    value={form.display_name}
                                    onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="Pronouns"
                                    placeholder="they/them"
                                    value={form.pronouns}
                                    onChange={(e) => setForm(prev => ({ ...prev, pronouns: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-wider">Bio (Short)</label>
                                <textarea
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded text-brutal-dark font-data focus:outline-none focus:border-brutal-dark focus:ring-1 focus:ring-brutal-dark transition-colors"
                                    rows={4}
                                    placeholder="Tell the community what you build..."
                                    value={form.bio}
                                    onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Privacy Controls */}
                        <div className="space-y-4">
                            <h3 className="font-heading font-bold text-2xl border-b border-brutal-dark/10 pb-2 uppercase tracking-tight-heading text-brutal-red">Privacy</h3>
                            <div className="flex items-center justify-between p-4 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                                <div>
                                    <span className="font-data text-sm font-bold block">{user?.email}</span>
                                    <span className="font-data text-xs text-brutal-dark/50">Your account email</span>
                                </div>
                                <PrivacyToggle
                                    label="Email"
                                    value={privacySettings.show_email}
                                    onChange={v => setPrivacySettings(prev => ({...prev, show_email: v}))}
                                />
                            </div>
                        </div>

                        {/* Capabilities */}
                        <div className="space-y-6">
                            <h3 className="font-heading font-bold text-2xl border-b border-brutal-dark/10 pb-2 uppercase tracking-tight-heading text-brutal-red">Capabilities</h3>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-wider">Tags & Skills (Comma Separated)</label>
                                <Input
                                    placeholder="Hardware, Python, 3D Printing, Electronics"
                                    value={form.skills}
                                    onChange={(e) => setForm(prev => ({ ...prev, skills: e.target.value }))}
                                />
                                <p className="text-xs font-data text-brutal-dark/50 mt-2">These will help others find you in the directory.</p>
                            </div>
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-wider">Aspirations</label>
                                <Input
                                    placeholder="To build an open-source medical device..."
                                    value={form.aspirations}
                                    onChange={(e) => setForm(prev => ({ ...prev, aspirations: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Links */}
                        <div className="space-y-6">
                            <h3 className="font-heading font-bold text-2xl border-b border-brutal-dark/10 pb-2 uppercase tracking-tight-heading text-brutal-red">Links</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Input
                                    label="GitHub URL"
                                    placeholder="https://github.com/..."
                                    value={form.github_url}
                                    onChange={(e) => setForm(prev => ({ ...prev, github_url: e.target.value }))}
                                />
                                <Input
                                    label="LinkedIn URL"
                                    placeholder="https://linkedin.com/in/..."
                                    value={form.linkedin_url}
                                    onChange={(e) => setForm(prev => ({ ...prev, linkedin_url: e.target.value }))}
                                />
                                <Input
                                    label="Personal Website"
                                    placeholder="https://..."
                                    value={form.website_url}
                                    onChange={(e) => setForm(prev => ({ ...prev, website_url: e.target.value }))}
                                />
                                <Input
                                    label="X (Twitter) URL"
                                    placeholder="https://x.com/yourhandle"
                                    value={form.x_url}
                                    onChange={(e) => setForm(prev => ({ ...prev, x_url: e.target.value }))}
                                />
                                <Input
                                    label="Bluesky URL"
                                    placeholder="https://bsky.app/profile/yourhandle"
                                    value={form.bluesky_url}
                                    onChange={(e) => setForm(prev => ({ ...prev, bluesky_url: e.target.value }))}
                                />
                                <Input
                                    label="Discord Username"
                                    placeholder="username#0000 or just username"
                                    value={form.discord_username}
                                    onChange={(e) => setForm(prev => ({ ...prev, discord_username: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Mentor Configuration (only for mentors) */}
                        {role === 'mentor' && (
                            <div className="space-y-6 pt-8 border-t-2 border-brutal-dark/10">
                                <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading text-brutal-red">
                                    Mentor Configuration
                                </h3>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-wider">
                                        Mentor Domains (comma separated)
                                    </label>
                                    <Input
                                        placeholder="Electronics, Robotics, AI"
                                        value={form.mentor_domains}
                                        onChange={e => setForm(prev => ({...prev, mentor_domains: e.target.value}))}
                                    />
                                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                                        Domains where you can guide and support makers.
                                    </p>
                                </div>
                                <div>
                                    <label className="font-data text-sm font-bold text-brutal-dark mb-2 block uppercase tracking-wider">
                                        Approval Domains (comma separated)
                                    </label>
                                    <Input
                                        placeholder="Electronics, Robotics"
                                        value={form.approval_domains}
                                        onChange={e => setForm(prev => ({...prev, approval_domains: e.target.value}))}
                                    />
                                    <p className="font-data text-xs text-brutal-dark/50 mt-1">
                                        Domains where you have authority to approve projects and T3 access. Must be a subset of mentor domains.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Your Progress (Domain Levels) */}
                        <div className="space-y-4 pt-8 border-t-2 border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-2xl uppercase tracking-tight-heading text-brutal-red">Your Progress</h3>
                            {domainLevels.length > 0 ? (
                                <div className="space-y-2">
                                    {domainLevels.map(dl => (
                                        <div key={dl.domain} className="flex items-center justify-between p-3 bg-brutal-bg border border-brutal-dark/10 rounded-xl">
                                            <span className="font-data text-sm font-bold text-brutal-dark">{dl.domain}</span>
                                            <span className={`font-data text-xs font-bold px-2 py-1 rounded uppercase ${
                                                dl.tier === 'Tier 3' ? 'bg-brutal-red text-brutal-bg' :
                                                dl.tier === 'Tier 2' ? 'bg-brutal-dark text-brutal-bg' :
                                                'bg-brutal-dark/10 text-brutal-dark'
                                            }`}>{dl.tier}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="font-data text-xs text-brutal-dark/50 italic">Complete challenges to earn domain levels.</p>
                            )}
                        </div>

                        <div className="pt-8 border-t-2 border-brutal-dark/10 flex justify-end gap-4">
                            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Saving Parameters...' : 'Save Configuration'}
                            </Button>
                        </div>

                    </form>
                </Card>
            </div>
        </div>
    );
}
