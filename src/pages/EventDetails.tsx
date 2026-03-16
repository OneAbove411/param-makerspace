import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent, useEventRegistration, useComments } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Calendar, MapPin, Users, ArrowLeft, Send } from 'lucide-react';

export function EventDetails() {
    const { id } = useParams();
    const { data: event, loading } = useEvent(id);
    const { user } = useAuth();
    const { isRegistered, register, unregister } = useEventRegistration(id);
    const { comments, addComment, deleteComment } = useComments('event', id);
    const [commentText, setCommentText] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const handleRegister = async () => {
        setActionLoading(true);
        await register();
        setActionLoading(false);
    };

    const handleUnregister = async () => {
        setActionLoading(true);
        await unregister();
        setActionLoading(false);
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(commentText.trim());
        setCommentText('');
    };

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading event...</div>;
    }

    if (!event) {
        return <div className="pt-32 px-12 font-data text-2xl">Event not found.</div>;
    }

    const date = new Date(event.date);
    const capacityRemaining = event.capacity ? event.capacity - event.registration_count : null;

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen">
            <div className="h-[50vh] min-h-[400px] w-full relative">
                {event.cover_image_url && (
                    <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/80 to-brutal-dark/40" />

                <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-24 pb-12 z-10">
                    <Link to="/events" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-8 bg-brutal-bg/90 backdrop-blur px-4 py-2 rounded-full border border-brutal-dark/10 interactive-lift">
                        <ArrowLeft className="w-4 h-4" /> Back to Events
                    </Link>

                    <div className="max-w-5xl">
                        <span className="bg-brutal-dark text-brutal-bg px-3 py-1 font-data text-xs font-bold rounded-full uppercase mb-4 inline-block">{event.event_type.replace(/_/g, ' ')}</span>
                        <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight-heading leading-none mb-6">
                            {event.title}
                        </h1>

                        <div className="flex flex-wrap gap-6 font-data text-lg font-bold text-brutal-dark/80 bg-brutal-bg/80 p-4 rounded-2xl inline-flex backdrop-blur-md">
                            <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-brutal-red" /> {date.toLocaleDateString()}</div>
                            {event.location && <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-brutal-red" /> {event.location}</div>}
                            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-brutal-red" /> {capacityRemaining !== null ? `${capacityRemaining} / ${event.capacity} Spots` : `${event.registration_count} registered`}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 grid grid-cols-1 md:grid-cols-3 gap-16">
                <div className="md:col-span-2 space-y-12">
                    <section>
                        <h3 className="font-heading font-bold text-3xl mb-6 tracking-tight-heading uppercase">About this Event</h3>
                        <p className="font-data text-lg text-brutal-dark/80 whitespace-pre-wrap leading-relaxed">
                            {event.description}
                        </p>
                    </section>

                    {/* Comments Section */}
                    <section>
                        <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Discussion</h3>
                        <div className="space-y-4 mb-6">
                            {comments.map(c => (
                                <div key={c.id} className="p-4 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-data text-sm font-bold">{c.userName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-data text-xs text-brutal-dark/50">{new Date(c.created_at).toLocaleDateString()}</span>
                                            {user && c.user_id === user.id && (
                                                <button onClick={() => deleteComment(c.id)} className="text-brutal-red text-xs font-bold hover:underline">Delete</button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="font-data text-sm text-brutal-dark/80">{c.content}</p>
                                </div>
                            ))}
                            {comments.length === 0 && <p className="font-data text-sm text-brutal-dark/50">No comments yet.</p>}
                        </div>

                        {user && (
                            <form onSubmit={handleComment} className="flex gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-brutal-bg border-2 border-brutal-dark/20 px-4 py-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark"
                                />
                                <Button type="submit" size="md"><Send className="w-4 h-4" /></Button>
                            </form>
                        )}
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="bg-brutal-dark text-brutal-bg rounded-[2rem] p-8 mt-[-8rem] relative z-20 shadow-2xl">
                        <h3 className="font-heading font-bold text-2xl mb-6 text-brutal-bg uppercase">Registration</h3>

                        {isRegistered ? (
                            <div className="space-y-6">
                                <div className="p-4 border-2 border-green-400/50 bg-green-400/10 rounded-xl">
                                    <p className="font-data text-brutal-bg font-bold text-center uppercase">✓ You're Registered</p>
                                </div>
                                <Button
                                    size="lg"
                                    className="w-full bg-brutal-bg/20 text-brutal-bg hover:bg-brutal-red"
                                    onClick={handleUnregister}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Processing...' : 'Unregister'}
                                </Button>
                            </div>
                        ) : event.registration_status === 'open' && (capacityRemaining === null || capacityRemaining > 0) ? (
                            <div className="space-y-6">
                                <p className="font-data text-sm text-brutal-bg/60">Spots are limited. Secure your place now.</p>
                                {user ? (
                                    <Button
                                        size="lg"
                                        className="w-full bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg"
                                        onClick={handleRegister}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Registering...' : 'Register Now'}
                                    </Button>
                                ) : (
                                    <Link to="/login">
                                        <Button size="lg" className="w-full bg-brutal-bg text-brutal-dark hover:bg-brutal-red hover:text-brutal-bg">
                                            Log in to Register
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 border-2 border-brutal-red/50 bg-brutal-bg/10 rounded-xl">
                                <p className="font-data text-brutal-bg font-bold text-center uppercase">Currently Closed</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
