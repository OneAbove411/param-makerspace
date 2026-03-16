import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useProject, useProjectMutations } from '../lib/hooks';
import { supabase } from '../lib/supabase';
import { uploadFile, deleteFile } from '../lib/storage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Settings, Save, ArrowLeft, Image as ImageIcon, FileText, Trash2, Send } from 'lucide-react';
import type { Project } from '../lib/database.types';

export function EditProject() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: project, loading, refetch } = useProject(id);
    const { updateProject } = useProjectMutations();

    const [actionLoading, setActionLoading] = useState(false);
    
    // Core form state
    const [form, setForm] = useState<Partial<Project>>({});
    
    // New media upload states
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        if (project) {
            setForm({
                title: project.title,
                summary: project.summary,
                description: project.description,
                domain: project.domain,
                tier: project.tier,
                github_url: project.github_url,
                duration: project.duration,
            });
        }
    }, [project]);

    if (loading) return <div className="p-24 flex justify-center font-data">Loading project...</div>;
    
    if (!project) return <div className="p-24 font-data">Project not found.</div>;

    // Security check: Only the owner can edit, and generally only if it's not accepted/active (though we'll let them edit drafts & pending)
    if (project.owner_id !== user?.id && user?.role !== 'admin') {
        return <div className="p-24 font-data text-xl text-brutal-red font-bold">Access Denied: You don't own this project.</div>;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setActionLoading(true);
        const { error } = await updateProject(id, form);
        if (error) {
            alert(error);
        } else {
            await refetch();
            alert('Project details saved!');
        }
        setActionLoading(false);
    };

    const handleSubmitForReview = async () => {
        if (!id) return;
        if (!window.confirm("Submit for mentor review? You won't be able to edit core details while it's pending.")) return;
        
        setActionLoading(true);
        const { error } = await updateProject(id, { status: 'pending_review' });
        if (error) {
            alert(error);
        } else {
            alert('Project submitted for review successfully!');
            navigate('/dashboard');
        }
        setActionLoading(false);
    };

    // --- Media Handlers ---

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !id) return;
        
        setUploadingImage(true);
        const path = `${id}/${Date.now()}-${file.name}`;
        const { url, error } = await uploadFile('project-images', path, file);
        
        if (error) {
            alert(error);
        } else if (url) {
            // Add to project_image table
            const { error: dbError } = await supabase.from('project_image').insert({
                project_id: id,
                image_url: url,
                display_order: (project.images?.length || 0) + 1
            });
            if (dbError) alert(dbError.message);
            else await refetch();
        }
        setUploadingImage(false);
    };

    const handleDeleteImage = async (imageId: string, url: string) => {
        if (!window.confirm("Delete this image?")) return;
        setActionLoading(true);
        
        // Extract path from URL to delete from storage
        const pathMatch = url.match(/project-images\/(.+)$/);
        if (pathMatch) {
            await deleteFile('project-images', pathMatch[1]);
        }
        
        // Delete from DB
        await supabase.from('project_image').delete().eq('id', imageId);
        await refetch();
        setActionLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !id) return;
        
        setUploadingFile(true);
        const path = `${id}/${Date.now()}-${file.name}`;
        // We need a new bucket for files, or just use project-files if we created it. 
        // Assuming 'project-files' bucket exists per storage.ts
        const { url, error } = await uploadFile('project-files', path, file);
        
        if (error) {
            alert(error);
        } else if (url) {
            // Add to project_file table
            const { error: dbError } = await supabase.from('project_file').insert({
                project_id: id,
                file_url: url,
                file_name: file.name,
                file_size: file.size
            });
            if (dbError) alert(dbError.message);
            else await refetch();
        }
        setUploadingFile(false);
    };

    const handleDeleteFile = async (fileId: string, url: string) => {
        if (!window.confirm("Delete this attached file?")) return;
        setActionLoading(true);
        
        const pathMatch = url.match(/project-files\/(.+)$/);
        if (pathMatch) {
            await deleteFile('project-files', pathMatch[1]);
        }
        
        await supabase.from('project_file').delete().eq('id', fileId);
        await refetch();
        setActionLoading(false);
    };

    return (
        <div className="flex-1 w-full bg-brutal-bg pt-32 px-6 md:px-12 lg:px-24 min-h-screen pb-32">
            <div className="max-w-4xl mx-auto space-y-8">
                
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-bold font-data rounded uppercase text-white ${
                        project.status === 'draft' ? 'bg-brutal-dark/40' : 
                        project.status === 'pending_review' ? 'bg-yellow-500 text-yellow-900' :
                        project.status === 'active' ? 'bg-green-600' : 'bg-brutal-red'
                    }`}>
                        STATUS: {project.status.replace('_', ' ')}
                    </span>
                    <Link to={`/projects/${id}`} className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto flex items-center gap-1 underline">
                        <ArrowLeft className="w-4 h-4" /> View Public Page
                    </Link>
                </div>

                <div className="flex justify-between items-end border-b-2 border-brutal-dark/10 pb-6">
                    <div>
                        <h1 className="font-heading font-bold text-5xl uppercase tracking-tight-heading flex items-center gap-4">
                            <Settings className="w-10 h-10 text-brutal-dark" />
                            Edit Project 
                        </h1>
                        <p className="font-data text-lg text-brutal-dark/60 mt-2">
                            Update your project thesis, attach CAD files, and upload gallery images.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    {/* Main Form */}
                    <Card className="md:col-span-2 p-8 border-2 border-brutal-dark/20 relative">
                        {project.status === 'pending_review' && (
                            <div className="absolute inset-0 bg-brutal-bg/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-2xl">
                                <div className="bg-white p-6 border-2 border-yellow-500 text-center max-w-sm rounded-xl shadow-xl">
                                    <h3 className="font-heading font-bold text-xl text-yellow-600 uppercase mb-2">Under Review</h3>
                                    <p className="font-data text-sm text-brutal-dark/80">
                                        Your project is currently locked for mentor review. You can't edit core details right now.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <h2 className="font-heading font-bold text-2xl uppercase border-b-2 border-brutal-dark/10 pb-4 mb-6">Core Details</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <Input 
                                label="Project Title" 
                                required 
                                value={form.title || ''} 
                                onChange={e => setForm({...form, title: e.target.value})} 
                            />
                            <Input 
                                label="Summary (One-line pitch)" 
                                required 
                                value={form.summary || ''} 
                                onChange={e => setForm({...form, summary: e.target.value})} 
                            />
                            <div>
                                <label className="font-data text-sm font-bold text-brutal-dark block mb-1">Detailed Description / Instructions</label>
                                <textarea 
                                    required
                                    className="w-full bg-brutal-bg border-2 border-brutal-dark/20 p-3 rounded font-data min-h-[200px]" 
                                    value={form.description || ''} 
                                    onChange={e => setForm({...form, description: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Domain (e.g., Robotics)" 
                                    value={form.domain || ''} 
                                    onChange={e => setForm({...form, domain: e.target.value})} 
                                />
                                <Input 
                                    label="Tier / Complexity" 
                                    value={form.tier || ''} 
                                    onChange={e => setForm({...form, tier: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Duration Est." 
                                    placeholder="e.g. 2 weeks"
                                    value={form.duration || ''} 
                                    onChange={e => setForm({...form, duration: e.target.value})} 
                                />
                                <Input 
                                    label="GitHub URL" 
                                    placeholder="https://github.com/..."
                                    value={form.github_url || ''} 
                                    onChange={e => setForm({...form, github_url: e.target.value})} 
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={actionLoading} className="gap-2">
                                    <Save className="w-5 h-5" /> Save Changes
                                </Button>
                            </div>
                        </form>
                    </Card>

                    {/* Sidebar: Media & Actions */}
                    <div className="space-y-6">
                        {/* Submission Card */}
                        {(project.status === 'draft' || project.status === 'rejected') && (
                            <Card className="p-6 border-2 border-brutal-red bg-brutal-red/5">
                                <h3 className="font-heading font-bold text-xl uppercase text-brutal-red mb-2">Ready to Build?</h3>
                                <p className="font-data text-sm text-brutal-dark/70 mb-4">
                                    Once your documentation is ready, submit to mentors for approval to begin fabrication.
                                </p>
                                <Button 
                                    className="w-full justify-center gap-2 relative overflow-hidden group" 
                                    onClick={handleSubmitForReview}
                                    disabled={actionLoading}
                                >
                                    <Send className="w-4 h-4" /> Submit for Review
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                                </Button>
                            </Card>
                        )}

                        {/* Image Gallery */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <ImageIcon className="w-5 h-5" /> Gallery Images
                            </h3>
                            
                            <div className="space-y-3 mb-4">
                                {project.images?.map((img, i) => (
                                    <div key={img.id} className="relative group rounded-xl overflow-hidden border-2 border-brutal-dark/10 bg-white">
                                        <img src={img.image_url} alt="Gallery" className="w-full h-32 object-cover" />
                                        {i === 0 && (
                                            <div className="absolute top-2 left-2 bg-brutal-dark text-white text-xs font-bold px-2 py-1 rounded font-data">
                                                COVER
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => handleDeleteImage(img.id, img.image_url)}
                                            className="absolute top-2 right-2 bg-brutal-red text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Image"
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {(!project.images || project.images.length === 0) && (
                                    <div className="text-center p-4 border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-xs text-brutal-dark/50">
                                        No images uploaded. Add some to make your project stand out. (First image is Cover)
                                    </div>
                                )}
                            </div>

                            <label className="block w-full">
                                <span className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-brutal-dark/20 border-dashed rounded-xl font-data text-sm font-bold text-brutal-dark/60 hover:bg-brutal-dark/10 hover:text-brutal-dark cursor-pointer transition-colors ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {uploadingImage ? 'Uploading...' : <><ImageIcon className="w-4 h-4" /> Upload Image</>}
                                </span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                            </label>
                        </section>

                        {/* Attached Files */}
                        <section className="bg-brutal-dark/5 rounded-[2rem] p-6 border border-brutal-dark/10">
                            <h3 className="font-heading font-bold text-lg mb-4 uppercase flex items-center gap-2 border-b-2 border-brutal-dark/10 pb-2">
                                <FileText className="w-5 h-5" /> Source Files
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                                {project.files?.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-brutal-dark/10 rounded-xl">
                                        <div className="overflow-hidden">
                                            <div className="font-data text-sm font-bold truncate text-brutal-dark" title={file.file_name}>
                                                {file.file_name}
                                            </div>
                                            <div className="font-data text-xs text-brutal-dark/40">
                                                {file.file_size ? (file.file_size / 1024).toFixed(1) + ' KB' : 'Unknown size'}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteFile(file.id, file.file_url)}
                                            className="p-2 hover:bg-brutal-red/10 hover:text-brutal-red rounded text-brutal-dark/40 transition-colors flex-shrink-0"
                                            title="Delete File"
                                            disabled={actionLoading}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {(!project.files || project.files.length === 0) && (
                                    <div className="text-center p-4 border-2 border-dashed border-brutal-dark/20 rounded-xl font-data text-xs text-brutal-dark/50">
                                        Attach 3D models, code zip, BOM.csv, or PDFs here.
                                    </div>
                                )}
                            </div>

                            <label className="block w-full">
                                <span className={`flex items-center justify-center gap-2 w-full p-3 bg-brutal-dark text-white rounded-xl font-data text-sm font-bold hover:bg-brutal-red cursor-pointer transition-colors ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {uploadingFile ? 'Uploading...' : <><FileText className="w-4 h-4" /> Attach File</>}
                                </span>
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                            </label>
                        </section>
                    </div>

                </div>
            </div>
        </div>
    );
}
