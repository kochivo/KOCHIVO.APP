'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';

export const ForgotPasswordFlow = dynamic(() => import('./forgot-password-flow').then(module => module.ForgotPasswordFlow), {
  loading: () => <LoadingState />,
});
