import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useAuth } from '../lib/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
    const { signIn, user, isLoading } = useAuth();
    const navigate = useNavigate();
    const pageRef = useRef(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

    // Redirect already-authenticated users (e.g. non-incognito with stored session)
    useEffect(() => {
        if (!isLoading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, isLoading, navigate]);

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
        <div ref={pageRef} className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="auth-card w-full max-w-md p-8 border-2 border-brutal-dark/10">
                <h1 className="font-heading font-bold text-3xl uppercase tracking-tight-heading mb-2 text-brutal-dark">System Access</h1>
                <p className="font-data text-xs text-brutal-dark/50 border-l-2 border-brutal-red pl-3 mb-8">Provide credentials to access the Param Makerspace internal network.</p>

                {error && (
                    <div className="mb-6 p-3 bg-brutal-red/5 border border-brutal-red/20 rounded-xl">
                        <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="maker@param.space"
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

                    <div className="flex justify-between items-center">
                        <Link to="/forgot-password" className="font-data text-xs font-bold text-brutal-dark/60 hover:text-brutal-red">Forgot Password?</Link>
                    </div>

                    <Button type="submit" className="w-full text-lg uppercase" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Authenticate'}
                    </Button>

                    <div className="text-center font-data text-xs mt-6">
                        <span className="text-brutal-dark/60">New initialization? </span>
                        <Link to="/register" className="font-bold text-brutal-red hover:underline">Register Here</Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
