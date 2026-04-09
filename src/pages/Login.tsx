import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FieldError } from '../components/ui/FieldError';
import { AUTH, LOADING } from '../lib/copy';
import { CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

/**
 * Local unified auth banner. Success → role="status" (polite), error →
 * role="alert" (assertive). Kept inline — only Login/Register consume it,
 * and "simple" beats extracting a shared file for two call sites.
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

// Open-redirect guard. Only same-origin absolute paths starting with a single
// slash are accepted, anything else falls back to /dashboard.
function safeRedirectParam(raw: string | null): string {
    if (!raw) return '/dashboard';
    if (!raw.startsWith('/')) return '/dashboard';
    if (raw.startsWith('//')) return '/dashboard';
    return raw;
}

export function Login() {
    const { signIn, signInWithGoogle, user, isLoading, isRecovery } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // §1.5 F-105: round-trip the deep-link target the user originally wanted.
    const redirectTarget = useMemo(
        () => safeRedirectParam(searchParams.get('redirect')),
        [searchParams]
    );

    // Forward both ?redirect and ?intent through to /register so the
    // Zeigarnik build-intent and the deep-link survive a switch from sign-in
    // to sign-up.
    const registerHref = useMemo(() => {
        const params = new URLSearchParams();
        const r = searchParams.get('redirect');
        if (r && r.startsWith('/') && !r.startsWith('//')) params.set('redirect', r);
        const intent = searchParams.get('intent');
        if (intent) params.set('intent', intent);
        const qs = params.toString();
        return qs ? `/register?${qs}` : '/register';
    }, [searchParams]);
    const pageRef = useRef<HTMLDivElement>(null);
    const passwordHelpId = useId();
    const passwordErrorId = useId();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Live password validation (only after the user has typed at least once).
    const passwordError = useMemo(() => {
        if (!passwordTouched) return '';
        if (password.length === 0) return '';
        if (password.length < 6) return 'Password must be at least 6 characters.';
        return '';
    }, [password, passwordTouched]);

    const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (typeof (e as any).getModifierState === 'function') {
            setCapsLockOn(e.getModifierState('CapsLock'));
        }
    };

    // Check for password reset success flag
    useEffect(() => {
        const resetSuccess = sessionStorage.getItem('password_reset_success');
        if (resetSuccess) {
            sessionStorage.removeItem('password_reset_success');
            setSuccessMsg('Password reset successful. Please sign in with your new password.');
            // Auto-dismiss after 6 seconds
            const timer = setTimeout(() => setSuccessMsg(''), 6000);
            return () => clearTimeout(timer);
        }
    }, []);

    // Surface the "account suspended" message set by auth.tsx when a
    // suspended user's token is evicted by fetchAppUser.
    useEffect(() => {
        try {
            const suspended = sessionStorage.getItem('auth_suspended_message');
            if (suspended) {
                sessionStorage.removeItem('auth_suspended_message');
                setError(suspended);
            }
        } catch { /* ignore */ }
    }, []);

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

    // Redirect to update-password page during recovery flow
    useEffect(() => {
        if (!isLoading && isRecovery) {
            navigate('/update-password', { replace: true });
        }
    }, [isLoading, isRecovery, navigate]);

    // Post-auth navigation — navigate immediately. The old fade-out was a
    // 200ms perceptible stall; snappier to just jump.
    const navigateWithTransition = (target: string) => {
        navigate(target, { replace: true });
    };

    // Redirect already-authenticated users (e.g. non-incognito with stored session).
    // §1.5 F-105: honor the original deep-link target instead of always
    // dumping the user on /dashboard.
    useEffect(() => {
        if (!isLoading && user && !isRecovery) {
            navigateWithTransition(redirectTarget);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isLoading, isRecovery, redirectTarget]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { error: err } = await signIn(email, password);
            if (err) setError(err);
            // ✅ Don't navigate here — useEffect watches user and will redirect
        } catch (err: any) {
            setError(err?.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-gradient-to-br from-brutal-dark via-brutal-dark to-brutal-red/40 min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 bg-white border-4 border-brutal-dark shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <p className="font-drama italic text-brutal-dark/70 text-base mb-1">Welcome back.</p>
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">Sign In</h1>
                <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3 mb-8">Provide credentials to access the Param Makerspace internal network.</p>

                {successMsg && <AuthBanner type="success">{successMsg}</AuthBanner>}
                {error && <AuthBanner type="error">{error}</AuthBanner>}

                <form onSubmit={handleLogin} className="space-y-6">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="maker@param.space"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <div>
                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (!passwordTouched) setPasswordTouched(true);
                                }}
                                onKeyDown={handlePasswordKey}
                                onKeyUp={handlePasswordKey}
                                onBlur={() => setCapsLockOn(false)}
                                required
                                aria-invalid={passwordError ? true : undefined}
                                aria-describedby={passwordError ? passwordErrorId : passwordHelpId}
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                aria-pressed={showPassword}
                                className="absolute right-3 top-[34px] h-9 w-9 inline-flex items-center justify-center rounded-md text-brutal-dark/60 hover:text-brutal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                            </button>
                        </div>
                        {passwordError ? (
                            <FieldError id={passwordErrorId}>{passwordError}</FieldError>
                        ) : (
                            <p id={passwordHelpId} className="mt-1 font-data text-xs text-brutal-dark/50">
                                Min. 6 characters.
                            </p>
                        )}
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

                    <div className="flex justify-between items-center">
                        <Link to="/forgot-password" className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded">Forgot Password?</Link>
                    </div>

                    <Button type="submit" className="w-full text-lg uppercase" disabled={loading || googleLoading || !!passwordError}>
                        {loading ? `${AUTH.signIn}…` : AUTH.signIn}
                    </Button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-brutal-dark/10" />
                        <span className="font-data text-xs text-brutal-dark/40 uppercase">or</span>
                        <div className="flex-1 h-px bg-brutal-dark/10" />
                    </div>

                    {/* Google Sign-In */}
                    <button
                        type="button"
                        onClick={async () => {
                            setGoogleLoading(true);
                            setError('');
                            // §1.5 F-103: let /dashboard show the one-time
                            // intent picker after OAuth if declared_intent is
                            // still null. The dashboard reads + clears this.
                            try {
                                sessionStorage.setItem('intent_picker_pending', '1');
                            } catch { /* storage may be blocked; non-fatal */ }
                            const { error: err } = await signInWithGoogle(redirectTarget);
                            if (err) {
                                setError(err);
                                setGoogleLoading(false);
                                try { sessionStorage.removeItem('intent_picker_pending'); } catch { /* noop */ }
                            }
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
                        <span className="text-brutal-dark/60">Don't have an account? </span>
                        <Link to={registerHref} className="font-bold text-brutal-red hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red">Sign Up Here</Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
