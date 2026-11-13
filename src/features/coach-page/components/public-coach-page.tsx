import 'server-only';
import { notFound } from 'next/navigation';
import { getT } from '@/core/i18n/server';
import type { CoachRequestStatus } from '@/lib/coach-request-status';
import { loadPublicCoach } from '../data/public-profile';
import { messages } from '../messages';
import { coachSignupHref } from '../slug';
import { PublicCoachLayout } from './public-coach-layout';
import { PublicPackages } from './public-packages';

export async function PublicCoachPage({ slug, requested }: { slug: string; requested?: CoachRequestStatus }) {
  const coach = await loadPublicCoach(slug);
  if (!coach) notFound();
  const t = await getT(messages);
  const pricing = await PublicPackages({ captainId: coach.id, signup: coachSignupHref(slug), requested, t, now: new Date() });
  return <PublicCoachLayout coach={coach} slug={slug} requested={requested} t={t} pricing={pricing} />;
}
