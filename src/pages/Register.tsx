import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle2 } from 'lucide-react';

export function Register() {
    const { signUp, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const pageRef = useRef<HTMLDivElement>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

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

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        const { error: err } = await signUp(email, password, name);
        setLoading(false);

        if (err) {
            setError(err);
        } else {
            setSuccess(true);
        }
    };

    return (
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">Initialize</h1>
                <p className="font-data text-xs text-brutal-dark/50 border-l-2 border-brutal-red pl-3 mb-8">Create a new identity within the Param Ecosystem.</p>

                {success ? (
                    <div className="space-y-6 text-center py-6">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <p className="font-data text-brutal-dark">
                            Account created! Check your email at <strong className="font-bold">{email}</strong> to verify your account, then log in.
                        </p>
                        <Link to="/login">
                            <Button className="w-full uppercase mt-4">Go to Login</Button>
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="mb-6 p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl">
                                <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <Input
                                label="Full Name"
                                type="text"
                                placeholder="Ada Lovelace"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="ada@param.space"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <Button type="submit" className="w-full text-lg uppercase bg-brutal-dark hover:bg-brutal-red" disabled={loading || googleLoading}>
                                {loading ? 'Creating...' : 'Create Identity'}
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
                                    const { error: err } = await signInWithGoogle();
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
                                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
                            </button>

                            <div className="text-center font-data text-xs mt-6">
                                <span className="text-brutal-dark/60">Already registered? </span>
                                <Link to="/login" className="font-bold text-brutal-dark hover:underline">Authenticate Here</Link>
                            </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}
