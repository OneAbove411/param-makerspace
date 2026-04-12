import React from 'react';
import { cn } from '../../lib/utils';

/* ── Column definition ──────────────────────────────────────────── */

export interface BrutalColumn<T> {
    /** Unique key for the column */
    key: string;
    /** Header label */
    header: string;
    /** Render function for each row cell */
    render: (item: T, index: number) => React.ReactNode;
    /** Header text alignment */
    headerAlign?: 'left' | 'center' | 'right';
    /** Optional className applied to every <td> in this column */
    cellClassName?: string;
    /** Optional className applied to the <th> */
    headerClassName?: string;
}

/* ── Table props ────────────────────────────────────────────────── */

interface BrutalTableProps<T> {
    /** Column definitions */
    columns: BrutalColumn<T>[];
    /** Data rows */
    data: T[];
    /** Unique key extractor for each row */
    rowKey: (item: T, index: number) => string;
    /** Optional per-row className (e.g. for low-stock highlighting) */
    rowClassName?: (item: T, index: number) => string;
    /** Message shown when data is empty */
    emptyMessage?: string;
    /** Additional className for the wrapping card */
    className?: string;
}

/**
 * BrutalTable — a Neo-Brutalist styled data table.
 *
 * Features:
 *  - Dark header row: bg-brutal-dark text-brutal-bg font-data uppercase tracking-wide
 *  - Horizontal scroll wrapper (overflow-x-auto) for mobile
 *  - Row hover state
 *  - Supports per-row conditional styling via rowClassName
 *
 * Purely presentational — no data logic.
 */
export function BrutalTable<T>({
    columns,
    data,
    rowKey,
    rowClassName,
    emptyMessage = 'No items found.',
    className,
}: BrutalTableProps<T>) {
    const alignClass = (align?: 'left' | 'center' | 'right') => {
        if (align === 'right') return 'text-right';
        if (align === 'center') return 'text-center';
        return 'text-left';
    };

    return (
        <div
            className={cn(
                'border-2 border-brutal-dark shadow-[6px_6px_0_0_rgba(17,17,17,1)] overflow-hidden',
                className
            )}
        >
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-data">
                    <thead>
                        <tr className="bg-brutal-dark text-brutal-bg">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'p-4 font-bold text-xs uppercase tracking-wider',
                                        alignClass(col.headerAlign),
                                        col.headerClassName
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brutal-dark/10">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="p-12 text-center text-brutal-dark/50 italic border-dashed border-t border-b bg-brutal-bg"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr
                                    key={rowKey(item, idx)}
                                    className={cn(
                                        'bg-brutal-bg hover:bg-brutal-dark/5 transition-colors',
                                        rowClassName?.(item, idx)
                                    )}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={cn('p-4', col.cellClassName)}
                                        >
                                            {col.render(item, idx)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
