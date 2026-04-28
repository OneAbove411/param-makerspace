import React from 'react';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/tech-tuesday.
 * Thin wrapper — all logic lives in <WizardShell>.
 */
export function TechTuesdayWizard() {
    return <WizardShell eventType="tech_tuesday" />;
}

export default TechTuesdayWizard;
