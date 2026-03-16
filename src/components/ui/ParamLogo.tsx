import React from 'react';
import { cn } from '../../lib/utils';

interface ParamLogoProps {
    className?: string;
    variant?: 'dark' | 'light';
    size?: number;
}

export function ParamLogo({ className, variant = 'dark', size = 28 }: ParamLogoProps) {
    const mainColor = variant === 'dark' ? '#C4291E' : '#F5F3EE';
    const innerColor = variant === 'dark' ? '#111111' : '#111111';
    const dotColor = variant === 'dark' ? '#F5F3EE' : '#F5F3EE';

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            className={cn('flex-shrink-0', className)}
        >
            {/* Outer gear shape */}
            <path
                d="M24 2l3.5 5.2h6.2l2.8 5.6 5.8 1.6 0.4 6.1 4.6 4-2 5.8 2.7 5.5-3.8 4.8 0.5 6.1-5.5 2.5-1.5 5.9H31L24 46l-7-2.8H10.5l-1.5-5.9-5.5-2.5 0.5-6.1-3.8-4.8 2.7-5.5-2-5.8 4.6-4 0.4-6.1 5.8-1.6 2.8-5.6h6.2L24 2z"
                fill={mainColor}
            />
            {/* Inner circle */}
            <circle cx="24" cy="24" r="14" fill={innerColor} />
            {/* Crosshair lines */}
            <path
                d="M24 14v20M14 24h20"
                stroke={mainColor}
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* Cardinal dots */}
            <circle cx="24" cy="14" r="2.5" fill={dotColor} />
            <circle cx="24" cy="34" r="2.5" fill={dotColor} />
            <circle cx="14" cy="24" r="2.5" fill={dotColor} />
            <circle cx="34" cy="24" r="2.5" fill={dotColor} />
            {/* Center dot */}
            <circle cx="24" cy="24" r="3.5" fill={dotColor} />
        </svg>
    );
}
