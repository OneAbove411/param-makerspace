import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, X, Eye, EyeOff, Code, Users, Plus, Trash2, FileCode, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { IFRAME_SUBMISSION_STYLE } from './WebsiteShowcaseWall';

interface WebsiteUploadPanelProps {
    eventId: string;
    userId: string;
    userName: string;
    existingSubmission: any | null;
    onSubmit: (data: {
        title: string;
        description: string;
        html_content: string | null;
        file_url: string | null;
        host_names: string[];
    }) => Promise<void>;
    onDelete?: () => Promise<void>;
    isRegistered: boolean;
    /**
     * When true, this panel is shown to a mentor/admin who owns the event page.
     * Removes "review / showcase wall" language and treats submissions as immediate publishes.
     */
    mentorMode?: boolean;
}

type Step = 'upload' | 'details' | 'preview';

export function WebsiteUploadPanel({
    eventId,
    userId,
    userName,
    existingSubmission,
    onSubmit,
    onDelete,
    isRegistered,
    mentorMode = false,
}: WebsiteUploadPanelProps) {
    // ─── Step state ───
    const [step, setStep] = useState<Step>('upload');

    // ─── Content state ───
    const [htmlContent, setHtmlContent] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [showCodeEditor, setShowCodeEditor] = useState(false);

    // ─── Details state ───
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [hostNames, setHostNames] = useState<string[]>([userName]);
    const [newHostName, setNewHostName] = useState('');

    // ─── UI state ───
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ─── Size calculation ───
    const MAX_HTML_SIZE = 500 * 1024;
    const htmlSizeBytes = useMemo(() => htmlContent ? new Blob([htmlContent]).size : 0, [htmlContent]);
    const htmlSizeKB = (htmlSizeBytes / 1024).toFixed(1);
    const isOverLimit = htmlSizeBytes > MAX_HTML_SIZE;
    const sizePercent = Math.min(100, (htmlSizeBytes / MAX_HTML_SIZE) * 100);

    // ─── File handlers ───
    const processFile = useCallback((f: File) => {
        if (!f.name.endsWith('.html') && !f.name.endsWith('.htm')) {
            setError('Please upload an .html or .htm file. For multi-file sites, combine everything into a single HTML file.');
            return;
        }
        if (f.size > MAX_HTML_SIZE) {
            setError(`File is too large (${(f.size / 1024).toFixed(1)} KB). Maximum is 500 KB.`);
            return;
        }
        setFile(f);
        setError(null);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string || '';
            setHtmlContent(content);
            // Auto-extract title from HTML if possible
            const match = content.match(/<title[^>]*>([^<]+)<\/title>/i);
            if (match && match[1].trim()) {
                setTitle(match[1].trim());
            }
        };
        reader.readAsText(f);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
    const handleDragLeave = useCallback(() => { setDragOver(false); }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) processFile(f);
    }, [processFile]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) processFile(f);
    };

    // ─── Host name handlers ───
    const addHost = () => {
        const name = newHostName.trim();
        if (name && !hostNames.includes(name)) {
            setHostNames(prev => [...prev, name]);
            setNewHostName('');
        }
    };
    const removeHost = (index: number) => {
        setHostNames(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Navigation ───
    const canProceedToDetails = htmlContent.trim().length > 0 && !isOverLimit;
    const canProceedToPreview = title.trim().length > 0 && hostNames.length > 0;

    const goToDetails = () => { if (canProceedToDetails) { setError(null); setStep('details'); } };
    const goToPreview = () => { if (canProceedToPreview) { setError(null); setStep('preview'); } };
    const goBack = (to: Step) => { setError(null); setStep(to); };

    // ─── Submit ───
    // Note: we embed the HTML inline via html_content — no storage upload needed.
    // The raw file is only used client-side to read its text content in processFile().
    const handleSubmit = async () => {
        if (!canProceedToDetails || !canProceedToPreview) return;
        setUploading(true);
        setError(null);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                html_content: htmlContent,
                file_url: null,
                host_names: hostNames,
            });
            setJustSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setUploading(false);
        }
    };

    // ═══════════════════════════════════════════
    // EXISTING SUBMISSION VIEW
    // ═══════════════════════════════════════════
    if (existingSubmission || justSubmitted) {
        const sub = existingSubmission;
        if (justSubmitted && !sub) {
            // Just submitted — show success message
            return (
                <div className="p-8 bg-green-50 border border-green-200 rounded-xl text-center">
                    <div className="w-14 h-14 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-green-600" />
                    </div>
                    <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading text-green-800">
                        {mentorMode ? 'Page Published!' : 'Website Submitted!'}
                    </h4>
                    <p className="font-data text-xs text-green-600 mt-2 max-w-sm mx-auto">
                        {mentorMode
                            ? 'Your event page is now live at the top of this event for all visitors.'
                            : 'Your website has been sent for mentor review. Once approved, it will appear on the showcase wall above.'}
                    </p>
                </div>
            );
        }
        if (!sub) return null;

        return (
            <div className="p-6 bg-brutal-dark/5 rounded-xl border border-brutal-dark/10">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                            {mentorMode ? 'Your Event Page' : 'Your Submission'}
                        </h4>
                        <p className="font-data text-xs text-brutal-dark/60 mt-1">{sub.title}</p>
                    </div>
                    {mentorMode ? (
                        <span className="px-3 py-1 text-[10px] font-bold font-data rounded-full uppercase bg-green-100 text-green-700 border border-green-300">
                            Live
                        </span>
                    ) : (
                        <span className={`px-3 py-1 text-[10px] font-bold font-data rounded-full uppercase ${
                            sub.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' :
                            sub.status === 'rejected' ? 'bg-brutal-red/10 text-brutal-red border border-brutal-red/30' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}>
                            {sub.status}
                        </span>
                    )}
                </div>

                {!mentorMode && sub.status === 'pending' && (
                    <p className="font-data text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        Awaiting mentor review. Once approved, it will appear on the showcase wall.
                    </p>
                )}
                {!mentorMode && sub.status === 'rejected' && (
                    <p className="font-data text-xs text-brutal-red bg-brutal-red/5 border border-brutal-red/20 rounded-lg p-3 mb-4">
                        Your submission was not approved. You can delete it and resubmit.
                    </p>
                )}

                {sub.html_content && (
                    <div className="relative border border-brutal-dark/20 rounded-lg overflow-hidden bg-white mb-4" style={{ height: '180px' }}>
                        <iframe
                            srcDoc={sub.html_content}
                            title="Your submission preview"
                            className="w-full h-full pointer-events-none"
                            sandbox="allow-scripts"
                            style={IFRAME_SUBMISSION_STYLE}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brutal-bg/60 to-transparent pointer-events-none" />
                    </div>
                )}

                <div className="flex items-center gap-3 font-data text-xs text-brutal-dark/50 mb-4">
                    <Users className="w-3 h-3" />
                    <span>By: {sub.host_names?.join(', ')}</span>
                </div>

                {mentorMode && onDelete && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                // Reset state so user can upload a new page
                                setJustSubmitted(false);
                                setHtmlContent('');
                                setFile(null);
                                setTitle('');
                                setDescription('');
                                setStep('upload');
                                onDelete();
                            }}
                        >
                            <Upload className="w-3 h-3" /> Replace Page
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-brutal-red text-brutal-red hover:bg-brutal-red/5"
                            onClick={onDelete}
                        >
                            <Trash2 className="w-3 h-3" /> Delete
                        </Button>
                    </div>
                )}
                {!mentorMode && (sub.status === 'pending' || sub.status === 'rejected') && onDelete && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-brutal-red text-brutal-red hover:bg-brutal-red/5 w-full"
                        onClick={onDelete}
                    >
                        <Trash2 className="w-3 h-3" /> Delete & Resubmit
                    </Button>
                )}
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // NOT REGISTERED
    // ═══════════════════════════════════════════
    if (!isRegistered) {
        return (
            <div className="p-8 bg-brutal-dark/5 border border-dashed border-brutal-dark/20 rounded-xl text-center">
                <FileCode className="w-8 h-8 text-brutal-dark/30 mx-auto mb-3" />
                <p className="font-data text-sm font-bold text-brutal-dark/60 uppercase">Register for this event to submit your website.</p>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // STEP INDICATOR
    // ═══════════════════════════════════════════
    const steps: { key: Step; label: string }[] = [
        { key: 'upload', label: 'Upload' },
        { key: 'details', label: 'Details' },
        { key: 'preview', label: 'Review' },
    ];
    const stepIndex = steps.findIndex(s => s.key === step);

    const StepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
                <React.Fragment key={s.key}>
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-data text-[10px] font-bold transition-all ${
                            i < stepIndex ? 'bg-green-500 text-white' :
                            i === stepIndex ? 'bg-brutal-dark text-brutal-bg' :
                            'bg-brutal-dark/10 text-brutal-dark/40'
                        }`}>
                            {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                        </div>
                        <span className={`font-data text-[10px] font-bold uppercase tracking-widest ${
                            i === stepIndex ? 'text-brutal-dark' : 'text-brutal-dark/40'
                        }`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-8 h-px ${i < stepIndex ? 'bg-green-500' : 'bg-brutal-dark/10'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    // ═══════════════════════════════════════════
    // STEP 1: UPLOAD
    // ═══════════════════════════════════════════
    if (step === 'upload') {
        return (
            <div className="space-y-5">
                <StepIndicator />

                {/* Primary: Drag & Drop zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-brutal-red bg-brutal-red/5 scale-[1.01]' :
                        htmlContent ? 'border-green-400 bg-green-50/50' :
                        'border-brutal-dark/20 hover:border-brutal-dark/40 bg-brutal-dark/[0.02]'
                    }`}
                >
                    <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileSelect} className="hidden" />

                    {htmlContent ? (
                        <>
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
                            <p className="font-data text-sm font-bold text-green-700">
                                {file ? file.name : 'HTML content loaded'}
                            </p>
                            <p className="font-data text-[10px] text-green-600/60 mt-1 uppercase tracking-widest">
                                {htmlSizeKB} KB — Click to replace
                            </p>
                        </>
                    ) : (
                        <>
                            <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-brutal-red' : 'text-brutal-dark/25'}`} />
                            <p className="font-data text-sm font-bold text-brutal-dark/60">
                                Drop your .html file here
                            </p>
                            <p className="font-data text-xs text-brutal-dark/40 mt-1">or click to browse</p>
                            <p className="font-data text-[10px] text-brutal-dark/30 mt-3 uppercase tracking-widest">
                                Single HTML file with inline CSS/JS — Max 500 KB
                            </p>
                        </>
                    )}
                </div>

                {/* Secondary: Code editor toggle */}
                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setShowCodeEditor(!showCodeEditor)}
                        className="inline-flex items-center gap-1.5 font-data text-[10px] font-bold text-brutal-dark/40 hover:text-brutal-dark/70 uppercase tracking-widest transition-colors"
                    >
                        <Code className="w-3 h-3" />
                        {showCodeEditor ? 'Hide code editor' : 'Or paste HTML code instead'}
                    </button>
                </div>

                {showCodeEditor && (
                    <div>
                        <textarea
                            value={htmlContent}
                            onChange={e => { setHtmlContent(e.target.value); setFile(null); }}
                            placeholder={'<!DOCTYPE html>\n<html>\n<head>\n  <style>/* CSS */</style>\n</head>\n<body>\n  <!-- Your site -->\n</body>\n</html>'}
                            rows={10}
                            className="w-full bg-brutal-dark text-green-400 border border-brutal-dark/30 px-4 py-3 rounded-xl font-mono text-xs focus:outline-none focus:border-brutal-red/50 resize-y leading-relaxed"
                            spellCheck={false}
                        />
                    </div>
                )}

                {/* Size bar */}
                {htmlContent && (
                    <div className="flex items-center justify-between px-1">
                        <span className={`font-data text-[10px] font-bold uppercase tracking-widest ${
                            isOverLimit ? 'text-brutal-red' : sizePercent > 80 ? 'text-yellow-600' : 'text-brutal-dark/40'
                        }`}>
                            {htmlSizeKB} KB / 500 KB
                        </span>
                        <div className="w-32 h-1.5 bg-brutal-dark/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${
                                isOverLimit ? 'bg-brutal-red' : sizePercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`} style={{ width: `${sizePercent}%` }} />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-brutal-red/10 border border-brutal-red/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-brutal-red flex-shrink-0" />
                        <p className="font-data text-xs text-brutal-red font-bold">{error}</p>
                    </div>
                )}

                {/* Next */}
                <Button
                    onClick={goToDetails}
                    disabled={!canProceedToDetails}
                    className="w-full justify-center"
                    size="md"
                >
                    Next: Add Details <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // STEP 2: DETAILS
    // ═══════════════════════════════════════════
    if (step === 'details') {
        return (
            <div className="space-y-5">
                <StepIndicator />

                {/* Title */}
                <div>
                    <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">Website Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="My Mars Landing Page"
                        className="w-full bg-brutal-bg border border-brutal-dark/15 px-4 py-3 rounded-xl font-data text-sm focus:outline-none focus:border-brutal-dark/30"
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">
                        Description <span className="text-brutal-dark/30 normal-case">(optional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="A brief description of your website..."
                        rows={2}
                        className="w-full bg-brutal-bg border border-brutal-dark/15 px-4 py-3 rounded-xl font-data text-xs focus:outline-none focus:border-brutal-dark/30 resize-y"
                    />
                </div>

                {/* Host Names */}
                <div>
                    <label className="font-data text-xs font-bold text-brutal-dark mb-2 block uppercase tracking-widest">
                        <Users className="w-3 h-3 inline mr-1" /> Creators *
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {hostNames.map((name, i) => (
                            <span key={i} className="inline-flex items-center gap-1 bg-brutal-dark text-brutal-bg px-3 py-1 rounded-full font-data text-xs font-bold">
                                {name}
                                {hostNames.length > 1 && (
                                    <button type="button" onClick={() => removeHost(i)} className="hover:text-brutal-red transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newHostName}
                            onChange={e => setNewHostName(e.target.value)}
                            placeholder="Add a teammate..."
                            className="flex-1 bg-brutal-bg border border-brutal-dark/15 px-3 py-2 rounded-xl font-data text-xs focus:outline-none focus:border-brutal-dark/30"
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHost(); } }}
                        />
                        <button type="button" onClick={addHost} className="px-3 py-2 bg-brutal-dark/10 rounded-xl hover:bg-brutal-dark/20 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-brutal-red/10 border border-brutal-red/30 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-brutal-red flex-shrink-0" />
                        <p className="font-data text-xs text-brutal-red font-bold">{error}</p>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3">
                    <Button onClick={() => goBack('upload')} variant="outline" size="md" className="flex-1 justify-center">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                        onClick={goToPreview}
                        disabled={!canProceedToPreview}
                        className="flex-[2] justify-center"
                        size="md"
                    >
                        Next: Preview <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════
    // STEP 3: PREVIEW & SUBMIT
    // ═══════════════════════════════════════════
    return (
        <div className="space-y-5">
            <StepIndicator />

            {/* Summary card */}
            <div className="bg-brutal-dark/5 rounded-xl p-4 border border-brutal-dark/10">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h4 className="font-heading font-bold text-sm uppercase tracking-tight-heading">{title}</h4>
                        {description && <p className="font-data text-xs text-brutal-dark/50 mt-1">{description}</p>}
                    </div>
                    <span className="font-data text-[10px] font-bold text-brutal-dark/30 uppercase">{htmlSizeKB} KB</span>
                </div>
                <div className="flex items-center gap-2 font-data text-xs text-brutal-dark/50">
                    <Users className="w-3 h-3" />
                    <span>By: {hostNames.join(', ')}</span>
                </div>
            </div>

            {/* Live preview */}
            <div className="border-2 border-brutal-dark/20 rounded-xl overflow-hidden bg-white">
                <div className="bg-brutal-dark px-4 py-2 flex items-center justify-between">
                    <span className="font-data text-[10px] text-brutal-bg/60 uppercase font-bold tracking-widest">Preview</span>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-brutal-red/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    </div>
                </div>
                <iframe
                    srcDoc={htmlContent}
                    title="Preview"
                    className="w-full border-0"
                    style={{ height: '350px' }}
                    sandbox="allow-scripts"
                />
            </div>

            {/* Info note */}
            <p className="font-data text-[10px] text-brutal-dark/40 text-center uppercase tracking-widest">
                {mentorMode
                    ? 'Publishing will make this page live at the top of this event for everyone.'
                    : 'A mentor will review your website before it goes live on the showcase wall.'}
            </p>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-brutal-red/10 border border-brutal-red/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-brutal-red flex-shrink-0" />
                    <p className="font-data text-xs text-brutal-red font-bold">{error}</p>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
                <Button onClick={() => goBack('details')} variant="outline" size="md" className="flex-1 justify-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="flex-[2] justify-center"
                    size="md"
                >
                    {uploading
                        ? (mentorMode ? 'Publishing...' : 'Submitting...')
                        : (mentorMode ? 'Publish Page' : 'Submit for Review')}
                </Button>
            </div>
        </div>
    );
}
