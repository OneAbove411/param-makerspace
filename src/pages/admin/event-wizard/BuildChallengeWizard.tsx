import React from 'react';
import { useSearchParams } from 'react-router';
import { SimpleEventWizard } from './SimpleEventWizard';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/build-challenge.
 *
 * Default: simplified single-screen flow. Append ?legacy=1 to fall back
 * to the original 3-step WizardShell.
 */
export function BuildChallengeWizard() {
    const [params] = useSearchParams();
    if (params.get('legacy') === '1') return <WizardShell eventType="build_challenge" />;
    return <SimpleEventWizard eventType="build_challenge" />;
}

export default BuildChallengeWizard;
