import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface BrutalPillProps {
    /** Display text */
    label: string;
    /** Optional usage/reference count badge */
    count?: number;
    /** Border color variant by category */
    colorVariant?: 'default' | 'red' | 'green' | 'blue' | 'yellow' | 'purple';
    /** Whether this pill is currently selected */
    selected?: boolean;
    /** Click handler for selection */
    onClick?: () => void;
    /** Removable: shows X button and calls onRemove */
    onRemove?: () => void;
    /** Dimmed appearance for unused/inactive pills */
    dimmed?: boolean;
    /** Additional className */
    className?: string;
}

const COLOR_MAP: Record<string, string> = {
    default: 'border-brutal-dark',
    red: 'border-brutal-red',
    green: 'border-green-600',
    blue: 'border-blue-600',
    yellow: 'border-yellow-500',
    purple: 'border-purple-500',
};

const SELECTED_BG: Record<string, string> = {
    default: 'bg-brutal-dark text-brutal-bg',
    red: 'bg-brutal-red text-brutal-bg',
    green: 'bg-green-600 text-white',
    blue: 'bg-blue-600 text-white',
    yellow: 'bg-yellow-500 text-brutal-dark',
    purple: 'bg-purple-500 text-white',
};

/**
 * BrutalPill — a Neo-Brutalist pill/tag badge component.
 *
 * Supports selection state, removability, color variants, and count badges.
 * Used in ManageTags (tag cloud), ManageChallenges (skill pills), and anywhere
 * categorical badges are rendered.
 *
 * Purely presentational.
 */
export function BrutalPill({
    label,
    count,
    colorVariant = 'default',
    selected = false,
    onClick,
    onRemove,
    dimmed = false,
    className,
}: BrutalPillProps) {
    const isInteractive = !!onClick;

    return (
        <span
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={onClick}
            onKeyDown={
                isInteractive
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onClick?.();
                          }
                      }
                    : undefined
            }
            className={cn(
                'inline-flex items-center gap-1.5 border-2 px-3 py-1.5 font-data text-sm',
                'transition-all duration-200 ease-magnetic',
                isInteractive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(17,17,17,1)]',
                isInteractive &&
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red',
                selected ? SELECTED_BG[colorVariant] : COLOR_MAP[colorVariant],
                selected ? 'shadow-[3px_3px_0_0_rgba(17,17,17,0.3)]' : '',
                !selected && 'bg-brutal-bg text-brutal-dark',
                dimmed && 'opacity-50',
                className
            )}
        >
            {label}
            {count !== undefined && (
                <span
                    className={cn(
                        'text-[10px] font-bold px-1 py-0.5 rounded-sm min-w-[1.25rem] text-center',
                        selected
                            ? 'bg-white/20 text-inherit'
                            : 'bg-brutal-dark/10 text-brutal-dark/60'
                    )}
                >
                    {count}
                </span>
            )}
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-0.5 p-0.5 hover:bg-brutal-red hover:text-white rounded-sm transition-colors"
                    aria-label={`Remove ${label}`}
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </span>
    );
}
