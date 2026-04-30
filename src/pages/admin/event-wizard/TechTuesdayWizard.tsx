import React from 'react';
import { useSearchParams } from 'react-router';
import { SimpleEventWizard } from './SimpleEventWizard';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/tech-tuesday.
 *
 * Default: simplified single-screen flow (SimpleEventWizard) per the UX
 * research in misc/EVENT_FLOW_SIMPLIFICATION_PLAN.md.
 *
 * Escape hatch: append ?legacy=1 to the URL to fall back to the
 * original 3-step WizardShell. Useful while mentors get used to the
 * new flow; remove the flag once the new wizard is the established
 * default.
 */
export function TechTuesdayWizard() {
    const [params] = useSearchParams();
    if (params.get('legacy') === '1') return <WizardShell eventType="tech_tuesday" />;
    return <SimpleEventWizard eventType="tech_tuesday" />;
}

export default TechTuesdayWizard;
