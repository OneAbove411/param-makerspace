import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CheckCircle2 } from 'lucide-react';

export function Register() {
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

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
        <div className="flex-1 w-full bg-brutal-bg min-h-screen flex items-center justify-center p-6 pt-32">
            <Card className="w-full max-w-md p-8 shadow-2xl relative overflow-hidden border-2 border-brutal-dark/10 bg-white/70 backdrop-blur-sm">
                {/* Decorative elements */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-brutal-red/10 rounded-full blur-3xl pointer-events-none" />

                <h1 className="font-heading font-bold text-4xl mb-2 text-brutal-dark uppercase tracking-tight-heading">Initialize</h1>
                <p className="font-data text-sm text-brutal-dark/60 mb-8 border-l-2 border-brutal-dark pl-3">Create a new identity within the Param Ecosystem.</p>

                {success ? (
                    <div className="space-y-6 text-center py-6 relative z-10">
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
                            <div className="mb-6 p-3 bg-brutal-red/10 border-2 border-brutal-red/30 rounded-xl relative z-10">
                                <p className="font-data text-sm text-brutal-red font-bold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6 relative z-10">
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

                            <Button type="submit" className="w-full text-lg uppercase bg-brutal-dark hover:bg-brutal-red" disabled={loading}>
                                {loading ? 'Creating...' : 'Create Identity'}
                            </Button>

                            <div className="text-center font-data text-sm mt-6">
                                <span className="text-brutal-dark/60">Already registered? </span>
                                <Link to="/login" className="text-brutal-dark font-bold hover:underline">Authenticate Here</Link>
                            </div>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}
