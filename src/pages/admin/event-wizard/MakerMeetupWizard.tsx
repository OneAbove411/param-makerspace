import React from 'react';
import { WizardShell } from './WizardShell';

/**
 * Route component for /admin/events/new/maker-meetup.
 * Thin wrapper — all logic lives in <WizardShell>.
 */
export function MakerMeetupWizard() {
    return <WizardShell eventType="maker_meetup" />;
}

export default MakerMeetupWizard;
