/**
 * PrivacyToggles Component
 *
 * Manages granular privacy settings for maker profile fields.
 *
 * Database Migration (to be applied separately):
 * -- ALTER TABLE maker_profile ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{}';
 * -- Example structure: {"email": false, "phone": false, "github": true, "linkedin": true, "website": true}
 */

import React from 'react';
import { Mail, Phone, Github, Linkedin, Globe, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PrivacyTogglesProps {
  settings: Record<string, boolean>;
  onChange: (field: string, visible: boolean) => void;
  className?: string;
}

const PRIVACY_FIELDS = [
  { key: 'email', label: 'Email Address', icon: Mail, defaultVisible: false },
  { key: 'phone', label: 'Phone Number', icon: Phone, defaultVisible: false },
  { key: 'github', label: 'GitHub URL', icon: Github, defaultVisible: true },
  { key: 'linkedin', label: 'LinkedIn URL', icon: Linkedin, defaultVisible: true },
  { key: 'website', label: 'Website URL', icon: Globe, defaultVisible: true },
];

export const PrivacyToggles: React.FC<PrivacyTogglesProps> = ({
  settings,
  onChange,
  className,
}) => {
  const getVisibility = (key: string): boolean => {
    return settings[key] !== undefined ? settings[key] : PRIVACY_FIELDS.find(f => f.key === key)?.defaultVisible ?? true;
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-5 h-5 text-brutal-red" />
          <h3 className="font-heading text-lg font-bold text-brutal-dark">
            Privacy Controls
          </h3>
        </div>
        <p className="font-data text-sm text-brutal-dark/60">
          Choose what's visible on your public profile
        </p>
      </div>

      {/* Privacy Toggles */}
      <div className="space-y-3">
        {PRIVACY_FIELDS.map(({ key, label, icon: Icon, defaultVisible }) => {
          const isVisible = getVisibility(key);

          return (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                'border-brutal-dark/10 bg-brutal-bg',
                'hover:border-brutal-dark/20 transition-colors'
              )}
            >
              {/* Field Label & Icon */}
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-brutal-dark/70 flex-shrink-0" />
                <div>
                  <p className="font-data text-sm font-medium text-brutal-dark">
                    {label}
                  </p>
                  <p className="font-data text-xs text-brutal-dark/50 mt-0.5">
                    {isVisible ? 'Visible on your public profile' : 'Hidden from public profile'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                role="switch"
                aria-checked={isVisible}
                onClick={() => onChange(key, !isVisible)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                  isVisible ? 'bg-brutal-red' : 'bg-brutal-dark/20'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow',
                    'transition-transform duration-200',
                    isVisible ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
