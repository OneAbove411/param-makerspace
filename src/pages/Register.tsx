import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { Link, useSearchParams } from 'react-router';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FieldError } from '../components/ui/FieldError';
import { toast } from '../lib/toast';
import { AUTH, LOADING } from '../lib/copy';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

/**
 * Local unified auth banner. Mirrors the one in Login.tsx so the two pages
 * stay visually and semantically identical. Success → polite status,
 * error → assertive alert.
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

/** RFC-light email regex — covers the realistic cases without going wild. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Password strength scoring → 0..4 (None, Weak, Fair, Good, Strong). */
function scorePassword(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
    if (!pw) return { score: 0, label: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
    const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][clamped];
    return { score: clamped, label };
}

// Open-redirect guard — match the same rule used by Login.
function safeRedirectParam(raw: string | null): string | null {
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    return raw;
}

export function Register() {
    const { signUp, signInWithGoogle } = useAuth();
    const [searchParams] = useSearchParams();

    // §1.5 F-101: read the Zeigarnik build-intent the hero passed through.
    const intent = useMemo(() => {
        const raw = searchParams.get('intent');
        return raw && raw.trim() ? raw.trim() : null;
    }, [searchParams]);

    // §1.5 F-105: forward the deep-link redirect target through to Login too.
    const redirect = useMemo(
        () => safeRedirectParam(searchParams.get('redirect')),
        [searchParams]
    );

    const loginHref = useMemo(() => {
        const params = new URLSearchParams();
        if (redirect) params.set('redirect', redirect);
        const qs = params.toString();
        return qs ? `/login?${qs}` : '/login';
    }, [redirect]);
    const pageRef = useRef<HTMLDivElement>(null);
    const emailErrorId = useId();
    const passwordErrorId = useId();
    const confirmErrorId = useId();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Real-time field validators.
    const emailError = useMemo(() => {
        if (!emailTouched || email.length === 0) return '';
        if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
        return '';
    }, [email, emailTouched]);

    const passwordError = useMemo(() => {
        if (!passwordTouched || password.length === 0) return '';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (!/\d/.test(password)) return 'Add at least one number.';
        return '';
    }, [password, passwordTouched]);

    const confirmError = useMemo(() => {
        if (!confirmTouched || confirmPassword.length === 0) return '';
        if (confirmPassword !== password) return 'Passwords do not match.';
        return '';
    }, [confirmPassword, password, confirmTouched]);

    const strength = useMemo(() => scorePassword(password), [password]);

    // The form is valid when every required field is filled, every live
    // validator is clean, and there's no password mismatch.
    const formInvalidReason = useMemo(() => {
        if (!name.trim()) return 'Enter your full name.';
        if (!email.trim()) return 'Enter your email address.';
        if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        if (!/\d/.test(password)) return 'Password must include at least one number.';
        if (confirmPassword !== password) return 'Passwords do not match.';
        return '';
    }, [name, email, password, confirmPassword]);
    const isFormInvalid = !!formInvalidReason;

    // Resend cooldown ticker.
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Force-touch every field so any latent error becomes visible if the
        // user somehow submits via Enter before blurring.
        setEmailTouched(true);
        setPasswordTouched(true);
        setConfirmTouched(true);

        if (isFormInvalid) {
            setError(formInvalidReason);
            return;
        }

        setLoading(true);
        try {
            const { error: err } = await signUp(email, password, name, intent);
            if (err) {
                setError(typeof err === 'string' ? err : JSON.stringify(err));
            } else {
                setSuccess(true);
                toast.success(`Verification email sent to ${email}`);
                setResendCooldown(30);
            }
        } catch (e: any) {
            setError(e?.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resending || resendCooldown > 0) return;
        setResending(true);
        try {
            const { error: err } = await supabase.auth.resend({ type: 'signup', email });
            if (err) {
                toast.error(err.message || 'Could not resend verification email.');
            } else {
                toast.success('Verification email re-sent.');
                setResendCooldown(30);
            }
        } catch (e: any) {
            toast.error(e?.message || 'Could not resend verification email.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-gradient-to-br from-brutal-dark via-brutal-dark to-brutal-red/40 min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 bg-white border-4 border-brutal-dark shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-drama italic text-brutal-dark/70 text-base mb-1">Pick up where you left off.</p>
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">Sign Up</h1>
                <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3 mb-8">Create a new account within the Param Ecosystem.</p>

                {intent && !success && (
                    <p
                        className="font-drama italic text-brutal-red text-sm mb-6"
                        data-testid="intent-eyebrow"
                    >
                        you said: <span className="font-bold">{intent}</span>
                    </p>
                )}

                {success ? (
                    <div
                        className="space-y-6 text-center py-6"
                        role="status"
                        aria-live="polite"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" aria-hidden="true" />
                        <p className="font-drama italic text-brutal-dark text-xl">Check your inbox.</p>
                        <p className="font-data text-sm text-brutal-dark/80">
                            We've sent a verification link to <strong className="font-bold">{email}</strong>.
                            Click it to activate your account, then sign in.
                        </p>
                        <Link to={loginHref} className="block">
                            <Button className="w-full uppercase">{AUTH.signIn}</Button>
                        </Link>
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending || resendCooldown > 0}
                            className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded"
                        >
                            {resending
                                ? 'Resending…'
                                : resendCooldown > 0
                                    ? `Resend verification email (${resendCooldown}s)`
                                    : 'Resend verification email'}
                        </button>
                    </div>
                ) : (
                    <>
                        {error && <AuthBanner type="error">{error}</AuthBanner>}

                        <form onSubmit={handleRegister} className="space-y-6" noValidate>
                            <Input
                                label="Full Name"
                                type="text"
                                placeholder="Ada Lovelace"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <div>
                                <Input
                                    label="Email Address"
                                    type="email"
                                    placeholder="ada@param.space"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (!emailTouched) setEmailTouched(true);
                                    }}
                                    onBlur={() => setEmailTouched(true)}
                                    required
                                    aria-invalid={emailError ? true : undefined}
                                    aria-describedby={emailError ? emailErrorId : undefined}
                                />
                                {emailError && <FieldError id={emailErrorId}>{emailError}</FieldError>}
                            </div>

                            <div>
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (!passwordTouched) setPasswordTouched(true);
                                    }}
                                    onBlur={() => setPasswordTouched(true)}
                                    required
                                    aria-invalid={passwordError ? true : undefined}
                                    aria-describedby={passwordError ? passwordErrorId : undefined}
                                />
                                {/* Four-block brutalist strength meter. */}
                                <div className="mt-2" aria-hidden="true">
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map((i) => {
                                            const active = strength.score >= i;
                                            return (
                                                <div
                                                    key={i}
                                                    className={
                                                        'h-1.5 flex-1 rounded-sm border border-brutal-dark/20 transition-colors ' +
                                                        (active ? 'bg-brutal-red' : 'bg-brutal-dark/5')
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                                <p
                                    className="mt-1 font-data text-[11px] uppercase tracking-wide text-brutal-dark/60"
                                    aria-live="polite"
                                >
                                    {strength.label
                                        ? `Strength: ${strength.label}`
                                        : 'Min. 6 characters, at least one number.'}
                                </p>
                                {passwordError && <FieldError id={passwordErrorId}>{passwordError}</FieldError>}
                            </div>

                            <div>
                                <Input
                                    label="Confirm Password"
                                    type="password"
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
                                />
                                {confirmError && <FieldError id={confirmErrorId}>{confirmError}</FieldError>}
                                {!confirmError && confirmPassword.length > 0 && confirmPassword === password && (
                                    <p className="mt-1 font-data text-xs text-green-600 font-bold">Passwords match.</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className="w-full text-lg uppercase bg-brutal-dark hover:bg-brutal-red"
                                disabled={loading || googleLoading || isFormInvalid}
                                title={isFormInvalid ? formInvalidReason : undefined}
                            >
                                {loading ? `${AUTH.signUp}…` : AUTH.signUp}
                            </Button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-brutal-dark/10" />
                                <span className="font-data text-xs text-brutal-dark/40 uppercase">or</span>
                                <div className="flex-1 h-px bg-brutal-dark/10" />
                            </div>

                            {/* Google Sign-Up */}
                            <button
                                type="button"
                                onClick={async () => {
                                    setGoogleLoading(true);
                                    setError('');
                                    // Forward the deep-link target so the OAuth
                                    // callback can resume to it. The intent is
                                    // already stashed by signUp() but Google
                                    // skips signUp(), so stash it here too.
                                    if (intent) {
                                        try { sessionStorage.setItem('pending_declared_intent', intent); } catch { /* ignore */ }
                                    }
                                    const { error: err } = await signInWithGoogle(redirect);
                                    if (err) { setError(err); setGoogleLoading(false); }
                                }}
                                disabled={loading || googleLoading}
                                className="w-full flex items-center justify-center gap-3 h-12 border-2 border-brutal-dark/10 rounded-xl bg-white hover:bg-brutal-dark/5 transition-colors font-data text-sm font-bold text-brutal-dark disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58Z" fill="#EA4335"/>
                                </svg>
                                {googleLoading ? LOADING.redirecting : AUTH.continueWithGoogle}
                            </button>

                            <div className="text-center font-data text-xs mt-6">
                                <span className="text-brutal-dark/60">Already have an account? </span>
                                <Link to={loginHref} className="font-bold text-brutal-red hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red">Sign In Here</Link>
                            </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}
