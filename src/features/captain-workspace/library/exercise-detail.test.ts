import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { LibraryExercise } from '@/features/programs';
import { ExerciseDetail } from './exercise-detail';

vi.mock('server-only', () => ({}));
const exercise: LibraryExercise = { id: 'exercise', name_ar: 'سكوات', name_en: 'Squat', body_part: 'upper legs',
  target: 'quads', equipment: 'barbell', media_path: null, secondary_muscles: ['glutes', 'lower back'],
  instructions_ar: ['قف', 'انزل', 'اطلع'], instructions_en: ['English step'], is_own: true,
  video_url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' };

it('renders both names, main muscle and target, helpers, equipment, video and numbered instructions', () => {
  const html = renderToStaticMarkup(createElement(ExerciseDetail, { exercise, onClose() {} }));
  for (const field of ['سكوات', 'Squat', 'العضلات', 'فخذ', '(quads)', 'مؤخرة', 'lower back', 'بار',
    'طريقة الأداء', '<ol', '<li>قف</li>', '<li>انزل</li>', '<li>اطلع</li>', 'فيديو من الكابتن', 'ضيفه لبرنامج', 'aria-label="رجوع"']) expect(html).toContain(field);
  expect(html).not.toMatch(/<iframe|<video/);
  expect(html).not.toContain('English step');
  expect(html).toContain('min-[760px]:grid-cols-2');
  expect(html).toContain('aspect-square');
});

it.each(['javascript:alert(1)', 'http://youtube.com', null])('omits unsafe or missing video links (%s)', video => {
  const html = renderToStaticMarkup(createElement(ExerciseDetail, { exercise: { ...exercise, video_url: video }, onClose() {} }));
  expect(html).not.toContain('فيديو يوتيوب بتاعك');
});

it('uses stored English steps when Arabic steps are blank, and hides editing for shared exercises', () => {
  const html = renderToStaticMarkup(createElement(ExerciseDetail, { exercise: { ...exercise, instructions_ar: [' '], is_own: false }, onClose() {} }));
  expect(html).toContain('English step');
  expect(html).not.toContain('/edit');
  expect(html).not.toContain('جوبلت');
  expect(html).not.toContain('+ بديل');
});
