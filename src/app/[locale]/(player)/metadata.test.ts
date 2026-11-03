import { expect, it, vi } from 'vitest';
import { generateMetadata as home } from './player/page';
import { generateMetadata as nutrition } from './player/nutrition/page';
import { generateMetadata as workout } from './player/workout/[dayId]/page';
import { generateMetadata as progress } from './player/progress/page';
import { generateMetadata as onboarding } from './player/onboarding/page';
import { generateMetadata as captain } from './player/captain/page';
import { generateMetadata as settings } from './player/settings/page';

const request = vi.hoisted(() => ({ cookies: vi.fn(() => { throw new Error('Metadata must use route params'); }) }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: request.cookies }));

it.each([
  [home, 'الرئيسية', 'Home'],
  [nutrition, 'أكل النهارده', "Today's meals"],
  [workout, 'التمرين', 'Workout'],
  [progress, 'تطورك', 'Your progress'],
  [onboarding, 'نعرفك الأول', 'Get started'],
  [captain, 'الكابتن', 'Coach'],
  [settings, 'الإعدادات', 'Settings'],
] as const)('localizes player metadata from params without cookies: %s', async (metadata, ar, en) => {
  expect(await metadata({ params: Promise.resolve({ locale: 'ar' }) })).toEqual({ title: ar });
  expect(await metadata({ params: Promise.resolve({ locale: 'en' }) })).toEqual({ title: en });
  expect(request.cookies).not.toHaveBeenCalled();
});
