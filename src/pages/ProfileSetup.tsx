import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { useMyProfile, useProfileMutation } from '../lib/hooks';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function ProfileSetup() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: existingProfile, loading: profileLoading } = useMyProfile();
    const { saveProfile } = useProfileMutation();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        display_name: '',
        pronouns: '',
        bio: '',
        skills: '',
        aspirations: '',
        github_url: '',
        linkedin_url: '',
        website_url: '',
    });

    // Pre-fill form when existing profile loads
    useEffect(() => {
        if (existingProfile) {
            setForm({
                display_name: existingProfile.display_name || user?.name || '',
                pronouns: existingProfile.pronouns || '',
                bio: existingProfile.bio || '',
                skills: '', // Will be loaded separately
                aspirations: existingProfile.aspirations || '',
                github_url: existingProfile.github_url || '',
                linkedin_url: existingProfile.linkedin_url || '',
                website_url: existingProfile.website_url || '',
            });
        } else if (user) {
            setForm(prev => ({ ...prev, display_name: user.name || '' }));
        }
    }, [existingProfile, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

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
            skills,
        });

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
                            </div>
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
