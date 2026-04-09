import React from 'react';
import { Github } from 'lucide-react';
import { Card } from '../ui/Card';

interface ProjectFilesTabProps {
    githubUrl?: string | null;
}

export function ProjectFilesTab({ githubUrl }: ProjectFilesTabProps) {
    return (
        <div className="space-y-4">
            {githubUrl && (
                <Card className="p-5 border-brutal-dark/10">
                    <a
                        href={githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <Github size={16} className="text-brutal-dark/60 group-hover:text-brutal-red transition-colors" />
                            <div>
                                <p className="font-heading font-bold text-sm uppercase tracking-tight-heading">
                                    GitHub Repository
                                </p>
                                <p className="font-data text-xs text-brutal-dark/40 mt-1">
                                    View source code and files
                                </p>
                            </div>
                        </div>
                        <span className="text-brutal-dark/20 group-hover:text-brutal-red transition-colors">→</span>
                    </a>
                </Card>
            )}
            <div className="text-center py-8">
                <p className="font-data text-sm text-brutal-dark/40">
                    More files coming soon
                </p>
            </div>
        </div>
    );
}
