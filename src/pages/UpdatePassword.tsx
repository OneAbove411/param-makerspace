import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { gsap } from 'gsap';
import { Link, useSearchParams } from 'react-router';
import { supabase, clearAppAuth } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FieldError } from '../components/ui/FieldError';
import { toast } from '../lib/toast';
import { LOADING, AUTH } from '../lib/copy';
import {
    ArrowLeft,
    CheckCircle2,
    AlertTriangle,
    Eye,
    EyeOff,
    Check,
    X,
} from 'lucide-react';

/**
 * Local unified auth banner. Mirrors the helpers in Login / Register /
 * ForgotPassword so all four auth surfaces stay visually + semantically
 * identical.
 */
function AuthBanner({ type, children }: { type: 'success' | 'error'; children: React.ReactNode }) {
    const isSuccess = type === 'success';
    const Icon = isSuccess ? CheckCircle2 : AlertTriangle;
    return (
        <div
            role={isSuccess ? 'status' : 'alert'}
            aria-live={isSuccess ? 'polite' : 'assertive'}
            className={
                'mb-6 p-4 rounded-xl border-2 flex items-start gap-3 ' +
                (isSuccess
                    ? 'bg-green-50 border-green-200'
                    : 'bg-brutal-red/5 border-brutal-red/30')
            }
        >
            <Icon
                className={'w-5 h-5 flex-shrink-0 mt-0.5 ' + (isSuccess ? 'text-green-600' : 'text-brutal-red')}
                aria-hidden="true"
            />
            <p className={'font-data text-sm font-bold ' + (isSuccess ? 'text-green-800' : 'text-brutal-red')}>
                {children}
            </p>
        </div>
    );
}

// Open-redirect guard — same rule used by Login.tsx.
function safeRedirectParam(raw: string | null): string | null {
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    return raw;
}

export function UpdatePassword() {
    const pageRef = useRef<HTMLDivElement>(null);
    const passwordErrorId = useId();
    const confirmErrorId = useId();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [stillWorking, setStillWorking] = useState(false);
    const [success, setSuccess] = useState(false);

    // §1.5 F-105: honor an upstream deep-link target if one survived the
    // recovery loop. Otherwise the existing post-success redirect target
    // (the `/login` re-handshake) wins, because the Supabase JS client's
    // updateUser() can hang and the safest recovery is a full reload.
    const redirectTarget = useMemo(
        () => safeRedirectParam(searchParams.get('redirect')),
        [searchParams]
    );

    // Real-time validators.
    const passwordError = useMemo(() => {
        if (!passwordTouched || password.length === 0) return '';
        if (password.length < 8) return 'Password must be at least 8 characters.';
        return '';
    }, [password, passwordTouched]);

    const confirmError = useMemo(() => {
        if (!confirmTouched || confirmPassword.length === 0) return '';
        if (confirmPassword !== password) return 'Passwords do not match.';
        return '';
    }, [confirmPassword, password, confirmTouched]);

    const passwordsMatch =
        confirmPassword.length > 0 && confirmPassword === password && password.length >= 8;

    const isFormInvalid =
        password.length < 8 || confirmPassword.length === 0 || confirmPassword !== password;

    const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof (e as any).getModifierState === 'function') {
            setCapsLockOn(e.getModifierState('CapsLock'));
        }
    };

    // Honor prefers-reduced-motion: skip the GSAP entrance fade entirely.
    useEffect(() => {
        const reduce =
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
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

        // Force-touch so latent errors show on Enter-submit.
        setPasswordTouched(true);
        setConfirmTouched(true);

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setStillWorking(false);

        // Non-blocking "still working" note at 4 s. The full 8 s timeout
        // race is preserved below — this just keeps the user informed.
        const stillWorkingTimer = setTimeout(() => setStillWorking(true), 4000);

        try {
            // supabase.auth.updateUser() can hang because the internal
            // onAuthStateChange listener blocks promise resolution.
            // Race it with a timeout so the UI never gets stuck.
            const updatePromise = supabase.auth.updateUser({ password });
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
                setTimeout(() => resolve({ data: null, error: { message: '__timeout__' } }), 8000)
            );

            const { error: updateError } = await Promise.race([updatePromise, timeoutPromise]);

            // If we got a real error (not timeout), show it
            if (updateError && updateError.message !== '__timeout__') {
                clearTimeout(stillWorkingTimer);
                setStillWorking(false);
                setLoading(false);
                setError(updateError.message);
                return;
            }

            // If we timed out, the password was likely updated (DB confirms it
            // works) but the Supabase JS client's internal event chain hung.
            // Either way, show success and redirect.
            clearTimeout(stillWorkingTimer);
            setStillWorking(false);
            setLoading(false);
            setSuccess(true);
            toast.success('Password updated.');

            // Store a flag so the Login page can show the success popup if
            // we end up routing through /login.
            sessionStorage.setItem('password_reset_success', 'true');

            // §1.5 F-105 + section-5 [FLOW]: if a ?redirect= survived the
            // recovery loop, honor it; otherwise force a clean re-handshake
            // through /login. The signOut + reload is a workaround for the
            // Supabase JS client hang documented above, NOT auth backend
            // logic — leaving it intact per the implementation contract.
            setTimeout(() => {
                clearAppAuth();
                supabase.auth.signOut().catch(() => {});
                const target = redirectTarget ?? '/login';
                window.location.replace(target);
            }, 600);
        } catch (err: any) {
            clearTimeout(stillWorkingTimer);
            setStillWorking(false);
            setLoading(false);
            setError(err?.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 mb-6 font-data text-sm font-bold uppercase text-brutal-dark hover:text-brutal-red rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to {AUTH.signIn}
                </Link>

                <p className="font-drama italic text-brutal-dark/70 text-base mb-1">Account recovery.</p>
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">
                    Set New Password
                </h1>

                {success ? (
                    <div
                        className="space-y-6 text-center py-6"
                        role="status"
                        aria-live="polite"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" aria-hidden="true" />
                        <p className="font-drama italic text-brutal-dark text-xl">Password updated.</p>
                        <p className="font-data text-sm text-brutal-dark/80">
                            {LOADING.redirecting}
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3 mb-6">
                            Enter your new password below. It must be at least 8 characters long.
                        </p>

                        {error && <AuthBanner type="error">{error}</AuthBanner>}

                        {/* Paired password fields — fieldset communicates the
                            grouping to AT, the left border does it visually. */}
                        <fieldset className="border-0 p-0 m-0 pl-4 border-l-2 border-brutal-red/40 space-y-5">
                            <legend className="sr-only">New password</legend>

                            <div>
                                <div className="relative">
                                    <Input
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (!passwordTouched) setPasswordTouched(true);
                                        }}
                                        onKeyDown={handlePasswordKey}
                                        onKeyUp={handlePasswordKey}
                                        onBlur={() => {
                                            setPasswordTouched(true);
                                            setCapsLockOn(false);
                                        }}
                                        required
                                        aria-invalid={passwordError ? true : undefined}
                                        aria-describedby={passwordError ? passwordErrorId : undefined}
                                        className="pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                        className="absolute right-3 top-[34px] h-9 w-9 inline-flex items-center justify-center rounded-md text-brutal-dark/60 hover:text-brutal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                    >
                                        {showPassword
                                            ? <EyeOff className="w-5 h-5" aria-hidden="true" />
                                            : <Eye className="w-5 h-5" aria-hidden="true" />}
                                    </button>
                                </div>
                                {passwordError && <FieldError id={passwordErrorId}>{passwordError}</FieldError>}
                                {capsLockOn && (
                                    <p
                                        role="status"
                                        aria-live="polite"
                                        className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-brutal-red/10 border border-brutal-red/30 font-data text-[11px] font-bold text-brutal-red uppercase tracking-wide"
                                    >
                                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                        Caps Lock is on
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="relative">
                                    <Input
                                        label="Confirm New Password"
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            if (!confirmTouched) setConfirmTouched(true);
                                        }}
                                        onBlur={() => setConfirmTouched(true)}
                                        required
                                        aria-invalid={confirmError ? true : undefined}
                                        aria-describedby={confirmError ? confirmErrorId : undefined}
                                        className="pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((v) => !v)}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        aria-pressed={showConfirm}
                                        className="absolute right-3 top-[34px] h-9 w-9 inline-flex items-center justify-center rounded-md text-brutal-dark/60 hover:text-brutal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                                    >
                                        {showConfirm
                                            ? <EyeOff className="w-5 h-5" aria-hidden="true" />
                                            : <Eye className="w-5 h-5" aria-hidden="true" />}
                                    </button>
                                </div>
                                {/* Live match indicator. */}
                                {confirmPassword.length > 0 && (
                                    passwordsMatch ? (
                                        <p className="mt-1 inline-flex items-center gap-1 font-data text-xs font-bold text-green-600">
                                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                            Passwords match.
                                        </p>
                                    ) : confirmError ? (
                                        <p className="mt-1 inline-flex items-center gap-1 font-data text-xs font-bold text-brutal-red" id={confirmErrorId} role="alert">
                                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                                            {confirmError}
                                        </p>
                                    ) : null
                                )}
                            </div>
                        </fieldset>

                        <Button
                            type="submit"
                            className="w-full text-lg uppercase"
                            disabled={loading || isFormInvalid}
                            title={isFormInvalid ? 'Enter a matching password of at least 8 characters.' : undefined}
                        >
                            {loading ? `${LOADING.saving}` : 'Update Password'}
                        </Button>

                        {/* Non-blocking 4-second "still working" note. */}
                        {stillWorking && (
                            <p
                                role="status"
                                aria-live="polite"
                                className="font-data text-xs text-brutal-dark/60 text-center"
                            >
                                Still working… this can take a few seconds.
                            </p>
                        )}
                    </form>
                )}
            </Card>
        </div>
    );
}
