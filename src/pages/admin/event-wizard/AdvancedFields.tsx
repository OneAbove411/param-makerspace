import React from 'react';
import { Settings2 } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import type { AdvancedFields as AdvancedFieldsT, TypeFields } from './wizardTypes';

/**
 * AdvancedFields — the collapsed drawer of genuinely-optional fields.
 *
 * Every field in here is OPTIONAL and the health-check in Prompt 6 does
 * not depend on any of them. That guarantee is what makes the drawer
 * safe to leave closed for 90% of uses; the wizard publishes happily
 * without it ever being opened.
 *
 * Rendered inside Step 2 of all three wizards, under a <details> block.
 */

interface AdvancedFieldsProps {
    open: boolean;
    onToggle: (next: boolean) => void;
    advanced: AdvancedFieldsT;
    onChange: (next: AdvancedFieldsT) => void;
    typeKind: TypeFields['kind'];
}

export function AdvancedDrawer({ open, onToggle, advanced, onChange, typeKind }: AdvancedFieldsProps) {
    // We render the drawer as a controlled <details> so the parent can
    // persist the open/closed state into the autosave payload. That way,
    // a user who opened Advanced and filled a value won't wonder where it
    // went when they come back tomorrow.
    return (
        <details
            open={open}
            onToggle={(e) => onToggle((e.target as HTMLDetailsElement).open)}
            className="border-2 border-brutal-dark/10 rounded-xl bg-brutal-dark/[0.02]"
        >
            <summary className="cursor-pointer list-none p-4 flex items-center gap-2 select-none">
                <Settings2 className="w-4 h-4 text-brutal-dark/50" />
                <h3 className="font-heading font-bold text-sm uppercase tracking-tight">
                    Advanced
                </h3>
                <span className="font-data text-[10px] text-brutal-dark/40">— optional, collapse-safe</span>
            </summary>
            <div className="px-4 pb-4 pt-2 space-y-4">
                <p className="font-data text-[11px] text-brutal-dark/50">
                    Every field here is optional. Publish does not require any of them.
                </p>

                {/* Always-available overrides */}
                <Input
                    label="Tagline override"
                    placeholder="Only if you want to override the Step-1 tagline for a specific audience"
                    value={advanced.tagline_override}
                    onChange={(e) => onChange({ ...advanced, tagline_override: e.target.value })}
                />

                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        Gallery seed URLs
                    </label>
                    <p className="font-data text-[11px] text-brutal-dark/50 mb-2">
                        One URL per line. Post-event uploads are handled separately in the ops console.
                    </p>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm min-h-[70px] focus:border-brutal-red focus:outline-none"
                        value={advanced.gallery_seed_urls.join('\n')}
                        onChange={(e) =>
                            onChange({
                                ...advanced,
                                gallery_seed_urls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                            })
                        }
                    />
                </div>

                {/* Build-challenge-only advanced copy */}
                {typeKind === 'build_challenge' && (
                    <div>
                        <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                            Prizes — long form
                        </label>
                        <textarea
                            className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm min-h-[70px] focus:border-brutal-red focus:outline-none"
                            placeholder="Full prize breakdown, tiers, sponsor credits, etc."
                            value={advanced.prizes_info}
                            onChange={(e) => onChange({ ...advanced, prizes_info: e.target.value })}
                        />
                    </div>
                )}

                <div>
                    <label className="font-data text-sm font-bold text-brutal-dark block mb-1">
                        Results summary — placeholder
                    </label>
                    <p className="font-data text-[11px] text-brutal-dark/50 mb-2">
                        Optional. Filled in properly from the Recap tab after end_date.
                    </p>
                    <textarea
                        className="w-full bg-brutal-bg border-2 border-brutal-dark/15 p-2 rounded font-data text-sm min-h-[60px] focus:border-brutal-red focus:outline-none"
                        value={advanced.results_summary_placeholder}
                        onChange={(e) => onChange({ ...advanced, results_summary_placeholder: e.target.value })}
                    />
                </div>

                <Input
                    label="Custom capacity rules"
                    placeholder={'e.g. "priority to first-year makers"'}
                    value={advanced.custom_capacity_rules}
                    onChange={(e) => onChange({ ...advanced, custom_capacity_rules: e.target.value })}
                />

                <label className="flex items-center gap-2 font-data text-sm">
                    <input
                        type="checkbox"
                        checked={advanced.visibility_unlisted}
                        onChange={(e) => onChange({ ...advanced, visibility_unlisted: e.target.checked })}
                    />
                    Unlisted — don't show in public event lists (future-gate)
                </label>
            </div>
        </details>
    );
}
