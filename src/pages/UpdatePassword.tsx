import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { supabase, clearAppAuth } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

export function UpdatePassword() {
    const pageRef = useRef<HTMLDivElement>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // GSAP entrance animation
    useEffect(() => {
        const cardElement = pageRef.current?.querySelector('.auth-card');
        if (cardElement) {
            gsap.fromTo(
                cardElement,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
            );
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password,
            });

            if (updateError) {
                setLoading(false);
                setError(updateError.message);
                return;
            }

            // Password updated — immediately nuke the session and redirect
            // Don't wait for React state or onAuthStateChange — go straight to login
            clearAppAuth();
            // Store a flag so the Login page can show the success popup
            sessionStorage.setItem('password_reset_success', 'true');
            // Fire-and-forget signout, then hard redirect regardless
            supabase.auth.signOut().catch(() => {});
            window.location.replace('/login');
        } catch (err: any) {
            setLoading(false);
            setError(err?.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <a href="/login" className="inline-flex items-center gap-2 font-data text-xs font-bold uppercase hover:text-brutal-red mb-8 text-brutal-dark/60">
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </a>

                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">
                    Set New Password
                </h1>

                {success ? (
                    <div className="space-y-6 text-center py-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <p className="font-data text-brutal-dark">
                            Your password has been updated successfully. Redirecting to login...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <p className="font-data text-xs text-brutal-dark/50 border-l-2 border-brutal-red pl-3 mb-8">
                            Enter your new password below. It must be at least 8 characters long.
                        </p>

                        {error && (
                            <div className="p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-brutal-red mt-0.5 flex-shrink-0" />
                                <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                            </div>
                        )}

                        <Input
                            label="New Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Input
                            label="Confirm New Password"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button type="submit" className="w-full text-lg uppercase" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
