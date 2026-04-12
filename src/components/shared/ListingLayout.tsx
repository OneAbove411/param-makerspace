import React from 'react';

/**
 * Two-column layout wrapper for listing pages (Projects, Challenges, Events).
 * Sidebar is hidden below `lg` breakpoint. Main content fills remaining width.
 *
 * Design tokens: bg-brutal-bg, border-brutal-dark — NO generic colors.
 */
interface ListingLayoutProps {
    sidebar: React.ReactNode;
    children: React.ReactNode;
}

export function ListingLayout({ sidebar, children }: ListingLayoutProps) {
    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-60 flex-shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto border-r-2 border-brutal-dark/15 bg-brutal-bg px-4 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {sidebar}
            </aside>

            {/* Main content */}
            <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 py-6 bg-brutal-bg">
                {children}
            </main>
        </div>
    );
}
    