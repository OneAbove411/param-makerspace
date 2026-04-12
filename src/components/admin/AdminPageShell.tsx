import React from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface AdminPageShellProps {
    /** 'admin' or 'mentor' — controls the badge label */
    role: string;
    /** Page title (e.g. "Inventory Tracking") */
    title: string;
    /** Subtitle shown below the title with a red left-border accent */
    subtitle: string;
    /** Lucide icon displayed next to the title */
    icon: LucideIcon;
    /** Optional action slot (e.g. "+ New Item" button) rendered top-right */
    headerAction?: React.ReactNode;
    /** Page content */
    children: React.ReactNode;
    /** Additional className for the outermost wrapper */
    className?: string;
}

/**
 * AdminPageShell — shared layout chrome for all admin management pages.
 *
 * Provides:
 *  - Consistent Admin Panel / Mentor Tools badge
 *  - Back to Dashboard link
 *  - Page title with icon + subtitle with brutal-red left border
 *  - Responsive padding & max-width constraint
 *  - Mobile-first: overflow-x-auto is the consumer's responsibility
 *    on data tables (per directive), but this shell ensures padding
 *    degrades gracefully on smaller screens.
 *
 * This component is purely presentational — it contains ZERO data logic.
 */
export function AdminPageShell({
    role,
    title,
    subtitle,
    icon: Icon,
    headerAction,
    children,
    className,
}: AdminPageShellProps) {
    return (
        <div
            className={cn(
                'flex-1 w-full bg-brutal-bg pt-32 px-4 sm:px-6 md:px-12 lg:px-24 min-h-screen pb-32',
                className
            )}
        >
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Top bar: role badge + back link */}
                <div className="flex items-center gap-3 mb-2">
                    <span className="bg-brutal-red text-white px-2 py-1 text-xs font-bold font-data rounded uppercase">
                        {role === 'admin' ? 'Admin Panel' : 'Mentor Tools'}
                    </span>
                    <Link
                        to="/dashboard"
                        className="text-brutal-dark/60 hover:text-brutal-dark font-data text-sm font-bold ml-auto underline"
                    >
                        Back to Dashboard
                    </Link>
                </div>

                {/* Title row: icon + heading + optional action */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
                    <div className="min-w-0">
                        <h1 className="font-heading font-bold text-4xl sm:text-5xl uppercase tracking-tight flex items-center gap-4">
                            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-brutal-red flex-shrink-0" />
                            <span className="truncate">{title}</span>
                        </h1>
                        <p className="font-data text-base sm:text-lg text-brutal-dark/60 border-l-4 border-brutal-red pl-4 mt-4">
                            {subtitle}
                        </p>
                    </div>
                    {headerAction && (
                        <div className="flex-shrink-0">{headerAction}</div>
                    )}
                </div>

                {/* Page content */}
                {children}
            </div>
        </div>
    );
}
