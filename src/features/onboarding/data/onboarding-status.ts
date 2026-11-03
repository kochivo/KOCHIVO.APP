'use server';
import { hasIntake } from './intake-status';

export async function fetchOnboardingStatus() {
  try {
    return { submitted: await hasIntake(), statusError: undefined };
  } catch {
    return { submitted: false, statusError: 'مش قادرين نحمّل بياناتك. جرّب تاني' };
  }
}
