import React from 'react';

/**
 * Shared sidebar shell for listing pages. Provides consistent spacing,
 * scroll containment, and a brutalist visual identity.
 *
 * Accepts children for page-specific filter sections
 * (SidebarSearch, SidebarChipGroup, GamificationNudge, etc.).
 *
 * Design tokens: bg-brutal-bg, border-brutal-dark, font-data — NO generic colors.
 */
interface ListingSidebarProps {
    children: React.ReactNode;
}

export function ListingSidebar({ children }: ListingSidebarProps) {
    return (
        <nav className="space-y-6" aria-label="Listing filters">
            {children}
        </nav>
    );
}
