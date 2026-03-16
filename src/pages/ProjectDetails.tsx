import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useReaction, useComments } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Heart, ArrowUpCircle, Bookmark, Github, ArrowLeft, Send } from 'lucide-react';

// Utility to convert YouTube/Vimeo links to embeds
const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
        return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes('vimeo.com/')) {
        return url.replace('vimeo.com/', 'player.vimeo.com/video/');
    }
    return url;
};

export function ProjectDetails() {
    const { id } = useParams();
    const { data: project, loading } = useProject(id);
    const { user } = useAuth();
    const { counts, myReactions, toggle } = useReaction('project', id);
    const { comments, addComment, deleteComment } = useComments('project', id);
    const [commentText, setCommentText] = useState('');

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(commentText.trim());
        setCommentText('');
    };

    if (loading) {
        return <div className="pt-32 px-12 font-data text-2xl">Loading project...</div>;
    }

    if (!project) {
        return <div className="pt-32 px-12 font-data text-2xl">Project not found.</div>;
    }

    const coverImage = project.images?.find((_, i) => i === 0)?.image_url || project.image_url || (project as any).cover_image_url;

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-24 min-h-screen">
            {/* Cover Image Header */}
            <div className="h-[50vh] min-h-[400px] w-full relative">
                {coverImage && (
                    <img src={coverImage} alt={project.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg via-brutal-bg/40 to-transparent" />

                <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 lg:px-24 translate-y-1/3 z-10">
                    <Link to="/projects" className="inline-flex items-center gap-2 font-data text-sm font-bold uppercase hover:text-brutal-red mb-8 bg-brutal-bg/90 backdrop-blur px-4 py-2 rounded-full border border-brutal-dark/10 interactive-lift">
                        <ArrowLeft className="w-4 h-4" /> Back to Archive
                    </Link>

                    <div className="max-w-5xl mx-auto bg-brutal-bg border-2 border-brutal-dark/10 rounded-[2rem] p-8 md:p-12 shadow-2xl">
                        <div className="flex flex-wrap gap-2 items-center mb-6">
                            {project.tier && <span className="bg-brutal-dark text-brutal-bg px-3 py-1 font-data text-xs font-bold rounded-full">{project.tier}</span>}
                            {project.domain && <span className="border border-brutal-dark/20 text-brutal-dark px-3 py-1 font-data text-xs font-bold rounded-full">{project.domain}</span>}
                            <div className="h-4 w-[1px] bg-brutal-dark/20 mx-2" />
                            <span className="font-data text-sm font-bold text-brutal-dark/60">By {project.ownerName}</span>
                        </div>

                        <h1 className="font-heading font-bold text-4xl md:text-6xl tracking-tight-heading leading-none mb-6">
                            {project.title}
                        </h1>

                        <p className="font-data text-lg md:text-xl text-brutal-dark/80 max-w-3xl">
                            {project.summary}
                        </p>

                        <div className="flex gap-4 mt-8 flex-wrap">
                            <Button
                                size="md"
                                className={`gap-2 ${myReactions.includes('like') ? 'bg-brutal-red text-brutal-bg' : ''}`}
                                onClick={() => toggle('like')}
                            >
                                <Heart className={`w-5 h-5 ${myReactions.includes('like') ? 'fill-current' : ''}`} /> {counts.likes}
                            </Button>
                            <Button
                                size="md"
                                variant="secondary"
                                className={`gap-2 ${myReactions.includes('upvote') ? 'bg-brutal-red text-brutal-bg' : ''}`}
                                onClick={() => toggle('upvote')}
                            >
                                <ArrowUpCircle className="w-5 h-5" /> {counts.upvotes}
                            </Button>
                            <Button
                                size="md"
                                variant="ghost"
                                className={`gap-2 ${myReactions.includes('bookmark') ? 'text-brutal-red' : ''}`}
                                onClick={() => toggle('bookmark')}
                            >
                                <Bookmark className={`w-5 h-5 ${myReactions.includes('bookmark') ? 'fill-current' : ''}`} /> Save
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 md:px-12 mt-48 lg:mt-56 pb-32 grid grid-cols-1 md:grid-cols-3 gap-16">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-16">
                    <section>
                        <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Description</h3>
                        <p className="font-data text-brutal-dark/80 leading-relaxed whitespace-pre-wrap text-lg">
                            {project.description}
                        </p>
                    </section>

                    {(project.image_url || (project.images && project.images.length > 0)) && (
                        <section>
                            <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Gallery</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {project.image_url && (
                                    <img src={project.image_url} className="rounded-2xl w-full h-48 md:h-64 object-cover border border-brutal-dark/10 shadow-sm" alt="Primary visual" />
                                )}
                                {project.images?.map((img, i) => (
                                    <img key={i} src={img.image_url} className="rounded-2xl w-full h-48 md:h-64 object-cover border border-brutal-dark/10 shadow-sm" alt="Gallery item" />
                                ))}
                            </div>
                        </section>
                    )}

                    {(project.video_url || (project.videos && project.videos.length > 0)) && (
                        <section>
                            <h3 className="font-heading font-bold text-2xl border-b-2 border-brutal-dark/10 pb-4 mb-6 uppercase">Video Content</h3>
                            <div className="space-y-8">
                                {project.video_url && (
                                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark">
                                        <iframe
                                            src={getEmbedUrl(project.video_url)}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}
                                {project.videos?.map(vid => (
                                    <div key={vid.id} className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-brutal-dark/10 bg-brutal-dark">
                                        <iframe
                                            src={getEmbedUrl(vid.video_url)}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

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
                            {comments.length === 0 && (
                                <p className="font-data text-sm text-brutal-dark/50">No comments yet. Be the first!</p>
                            )}
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

                {/* Sidebar */}
                <div className="space-y-12">
                    <section className="bg-brutal-dark/5 rounded-[2rem] p-8 border border-brutal-dark/10">
                        <h3 className="font-heading font-bold text-xl mb-6 uppercase text-brutal-dark">Details</h3>
                        <ul className="space-y-4 font-data text-sm">
                            <li className="flex justify-between border-b border-brutal-dark/10 pb-2">
                                <span className="text-brutal-dark/60">Duration</span>
                                <span className="font-bold">{project.duration || '—'}</span>
                            </li>
                            <li className="flex justify-between border-b border-brutal-dark/10 pb-2">
                                <span className="text-brutal-dark/60">Status</span>
                                <span className="font-bold text-green-600 uppercase">{project.status}</span>
                            </li>
                            {project.github_url && (
                                <li className="pt-4">
                                    <a href={project.github_url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full p-3 bg-brutal-dark text-brutal-bg rounded-xl hover:bg-brutal-red transition-colors font-bold uppercase">
                                        <Github className="w-5 h-5" /> Source Code
                                    </a>
                                </li>
                            )}
                        </ul>
                    </section>

                    {project.tags && project.tags.length > 0 && (
                        <section>
                            <h3 className="font-heading font-bold text-xl mb-4 uppercase">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map(t => (
                                    <span key={t} className="px-3 py-1 font-data text-xs font-bold uppercase tracking-wider text-brutal-red bg-brutal-red/10 rounded border border-brutal-red/20">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
