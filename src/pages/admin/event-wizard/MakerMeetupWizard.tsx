import React from 'react';
import { useSearchParams } from 'react-router';
import { SimpleEventWizard } from './SimpleEventWizard';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/maker-meetup.
 *
 * Default: simplified single-screen flow. Append ?legacy=1 to fall back
 * to the original 3-step WizardShell.
 */
export function MakerMeetupWizard() {
    const [params] = useSearchParams();
    if (params.get('legacy') === '1') return <WizardShell eventType="maker_meetup" />;
    return <SimpleEventWizard eventType="maker_meetup" />;
}

export default MakerMeetupWizard;
