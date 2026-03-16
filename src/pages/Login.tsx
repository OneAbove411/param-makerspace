import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function Login() {
    const { signIn, user, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
            if (err) {
                setError(err);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err?.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="w-full max-w-md p-8 shadow-2xl border-2 border-brutal-dark/10 bg-white/70 backdrop-blur-sm">
                <h1 className="font-heading font-bold text-4xl mb-2 text-brutal-dark uppercase tracking-tight-heading">System Access</h1>
                <p className="font-data text-sm text-brutal-dark/60 mb-8 border-l-2 border-brutal-red pl-3">Provide credentials to access the Param Makerspace internal network.</p>

                {error && (
                    <div className="mb-6 p-3 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-xl">
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

                    <div className="flex justify-between items-center text-sm font-data font-bold">
                        <Link to="/forgot-password" className="text-brutal-dark/60 hover:text-brutal-red">Forgot Password?</Link>
                    </div>

                    <Button type="submit" className="w-full text-lg shadow-[0_4px_14px_0_rgba(230,59,46,0.39)] uppercase" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Authenticate'}
                    </Button>

                    <div className="text-center font-data text-sm mt-6">
                        <span className="text-brutal-dark/60">New initialization? </span>
                        <Link to="/register" className="text-brutal-red font-bold hover:underline">Register Here</Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
