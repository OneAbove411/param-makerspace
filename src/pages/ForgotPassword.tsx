import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
    const { resetPassword } = useAuth();
    const pageRef = useRef(null);
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
        setLoading(true);
        const { error: err } = await resetPassword(email);
        setLoading(false);
        if (err) {
            setError(err);
        } else {
            setSubmitted(true);
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <Link to="/login" className="inline-flex items-center gap-2 font-data text-xs font-bold uppercase hover:text-brutal-red mb-8 text-brutal-dark/60">
                    <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>

                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">Password Reset</h1>

                {submitted ? (
                    <div className="space-y-6 text-center py-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <p className="font-data text-brutal-dark">
                            If an account exists for <strong className="font-bold">{email}</strong>, you will receive reset instructions shortly.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <p className="font-data text-xs text-brutal-dark/50 border-l-2 border-brutal-red pl-3 mb-8">
                            Enter your registered email address to receive a secure recovery link.
                        </p>

                        {error && (
                            <div className="p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl">
                                <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                            </div>
                        )}

                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="maker@param.space"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <Button type="submit" className="w-full text-lg uppercase" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Recovery Link'}
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
