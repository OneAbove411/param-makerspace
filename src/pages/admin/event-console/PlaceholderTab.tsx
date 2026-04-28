import React from 'react';

/**
 * PlaceholderTab — visual stub for tabs that will be implemented in
 * later prompts (Shortlist, Submissions, Winners, Recap).
 *
 * Kept deliberately quiet so hosts can see which surface is coming
 * without being led to believe it's already functional.
 */
export function PlaceholderTab({ title, description }: { title: string; description: string }) {
    return (
        <div className="border-2 border-dashed border-brutal-dark/20 bg-brutal-dark/[0.02] p-10 text-center space-y-2">
            <h2 className="font-heading font-bold text-2xl uppercase">{title}</h2>
            <p className="font-data text-sm text-brutal-dark/60 max-w-md mx-auto">{description}</p>
            <p className="font-data text-xs text-brutal-dark/40">Coming soon</p>
        </div>
    );
}
