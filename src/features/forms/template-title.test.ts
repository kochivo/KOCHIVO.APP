import { expect, it } from 'vitest';
import { copyTemplate } from './model';
import { templates } from './templates';

it('copies a weekly assessment title in the captain language', () => {
  const ar = copyTemplate(templates[0], 'captain', () => 'id', 'ar');
  const en = copyTemplate(templates[0], 'captain', () => 'id', 'en');
  expect(ar.title).toMatch(/[\u0600-\u06ff]/);
  expect(ar.title).not.toBe('Weekly assessment');
  expect(en.title).toBe('Weekly assessment');
});
