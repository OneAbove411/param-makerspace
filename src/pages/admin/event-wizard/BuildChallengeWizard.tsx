import React from 'react';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/build-challenge.
 * Thin wrapper — all logic lives in <WizardShell>.
 */
export function BuildChallengeWizard() {
    return <WizardShell eventType="build_challenge" />;
}

export default BuildChallengeWizard;
