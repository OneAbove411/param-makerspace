import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FieldError } from '../components/ui/FieldError';
import { LOADING } from '../lib/copy';
import { ArrowLeft, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';

/**
 * Local unified auth banner. Mirrors the helpers in Login.tsx and Register.tsx
 * so the three auth surfaces stay visually and semantically identical.
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

/** RFC-light email regex — matches the validator used in Register.tsx. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPassword() {
    const { resetPassword } = useAuth();
    const pageRef = useRef<HTMLDivElement>(null);
    const emailErrorId = useId();
    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Real-time email format validation.
    const emailError = useMemo(() => {
        if (!emailTouched || email.length === 0) return '';
        if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
        return '';
    }, [email, emailTouched]);
    const isFormInvalid = !email.trim() || !EMAIL_RE.test(email);

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

    // Resend cooldown ticker.
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailTouched(true);
        if (isFormInvalid) return;
        setLoading(true);
        const { error: err } = await resetPassword(email);
        setLoading(false);
        if (err) {
            setError(err);
        } else {
            setSubmitted(true);
            setResendCooldown(30);
        }
    };

    const handleResend = async () => {
        if (resending || resendCooldown > 0) return;
        setError('');
        setResending(true);
        const { error: err } = await resetPassword(email);
        setResending(false);
        if (err) {
            setError(err);
        } else {
            setResendCooldown(30);
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 min-h-[44px] px-3 -ml-3 mb-6 font-data text-sm font-bold uppercase text-brutal-dark hover:text-brutal-red rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Sign in
                </Link>

                <p className="font-drama italic text-brutal-dark/70 text-base mb-1">Account recovery.</p>
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">Password Reset</h1>

                {submitted ? (
                    <div
                        className="space-y-5 text-center py-4"
                        role="status"
                        aria-live="polite"
                    >
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" aria-hidden="true" />
                        <p className="font-drama italic text-brutal-dark text-xl">Check your inbox.</p>
                        <p className="font-data text-sm text-brutal-dark/80 leading-relaxed">
                            If an account exists for <strong className="font-bold">{email}</strong>, we've sent
                            a recovery link. Check your inbox — and your spam folder.
                        </p>

                        <a
                            href="mailto:"
                            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 mt-2 rounded-full border-2 border-brutal-dark/10 bg-white hover:bg-brutal-dark/5 font-data text-sm font-bold text-brutal-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red transition-colors"
                        >
                            <Mail className="w-4 h-4" aria-hidden="true" /> Open mail app
                        </a>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending || resendCooldown > 0}
                                className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded"
                            >
                                {resending
                                    ? 'Resending…'
                                    : resendCooldown > 0
                                        ? `Resend in ${resendCooldown}s`
                                        : 'Resend recovery link'}
                            </button>
                        </div>

                        {error && (
                            <div className="pt-2">
                                <AuthBanner type="error">{error}</AuthBanner>
                            </div>
                        )}

                        <div className="pt-4">
                            <Link to="/login" className="font-data text-xs font-bold text-brutal-red hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red rounded">
                                Back to Sign in →
                            </Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <p className="font-data text-xs text-brutal-dark/60 border-l-2 border-brutal-red pl-3 mb-6">
                            Enter your registered email address to receive a secure recovery link.
                        </p>

                        {error && <AuthBanner type="error">{error}</AuthBanner>}

                        <div>
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="maker@param.space"
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

                        <Button
                            type="submit"
                            className="w-full text-lg uppercase"
                            disabled={loading || isFormInvalid}
                            title={isFormInvalid ? 'Enter a valid email address.' : undefined}
                        >
                            {loading ? LOADING.loading : 'Send Recovery Link'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
