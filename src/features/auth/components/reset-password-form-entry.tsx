'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const ResetPasswordForm = dynamic(() => import('./reset-password-form').then(module => module.ResetPasswordForm), {
  loading: () => <LoadingState />,
});
