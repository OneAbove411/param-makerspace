import React from 'react';
import { Link } from 'react-router';
import { Sparkles, ArrowRight, Wrench, BookOpen, Calendar } from 'lucide-react';
import { XP_REWARDS } from '../../lib/constants';
import { cn } from '../../lib/utils';

type ClosureVariant = 'project' | 'challenge' | 'event-pre' | 'event-post';

interface WhatsNextClosureProps {
    variant: ClosureVariant;
}

const VARIANT_CONFIG: Record<ClosureVariant, {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    heading: string;
    description: string;
    ctas: Array<{ label: string; href: string }>;
}> = {
    project: {
        icon: Sparkles,
        heading: 'Inspired? Remix this project or start your own build.',
        description: `Document your build to earn +${XP_REWARDS.project_approved} XP toward your next badge.`,
        ctas: [
            { label: 'Remix', href: '#' },
            { label: 'New Project', href: '/dashboard' },
        ],
    },
    challenge: {
        icon: Wrench,
        heading: 'Finished this challenge? Document your build.',
        description: `Post your project to earn +${XP_REWARDS.project_approved} XP.`,
        ctas: [
            { label: 'Post Your Build', href: '/dashboard' },
        ],
    },
    'event-pre': {
        icon: BookOpen,
        heading: 'Preparing for this event? Check out related challenges.',
        description: 'Find tutorials and blueprints to get ready.',
        ctas: [
            { label: 'Browse Challenges', href: '/challenges' },
        ],
    },
    'event-post': {
        icon: Calendar,
        heading: 'Did you build something here? Post your project.',
        description: `Document your build to earn +${XP_REWARDS.project_approved} XP.`,
        ctas: [
            { label: 'Post Your Project', href: '/dashboard' },
        ],
    },
};

/**
 * Full-width brutalist "What's Next" closure block for detail pages.
 * Placed at the bottom, just above the footer.
 * Contextual copy varies by variant.
 */
export function WhatsNextClosure({ variant }: WhatsNextClosureProps) {
    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    return (
        <section
            className={cn(
                'border-2 border-brutal-dark bg-brutal-paper p-6 md:p-8',
                'shadow-[6px_6px_0_0_theme(colors.brutal.dark)]',
                'flex flex-col md:flex-row items-start md:items-center gap-5',
            )}
        >
            <div className="w-12 h-12 rounded-xl bg-brutal-red/10 border border-brutal-red/20 flex items-center justify-center flex-shrink-0">
                <Icon size={22} className="text-brutal-red" />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-lg md:text-xl uppercase tracking-tight-heading text-brutal-dark mb-1">
                    {config.heading}
                </h3>
                <p className="font-data text-sm text-brutal-dark/60">
                    {config.description}
                </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
                {config.ctas.map((cta) => (
                    <Link
                        key={cta.label}
                        to={cta.href}
                        className={cn(
                            'flex items-center gap-1.5 px-5 py-2.5 rounded-lg',
                            'bg-brutal-dark text-brutal-bg font-heading text-xs font-bold uppercase tracking-widest',
                            'border-2 border-brutal-dark',
                            'hover:bg-brutal-red hover:border-brutal-red transition-colors duration-200',
                            'shadow-[3px_3px_0_0_rgba(196,41,30,0.3)]',
                        )}
                    >
                        {cta.label} <ArrowRight size={12} />
                    </Link>
                ))}
            </div>
        </section>
    );
}
