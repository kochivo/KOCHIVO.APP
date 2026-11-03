import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { hasStarterEnglish, starterText } from './starter-text';

type Template = { title: string; notes?: string; days?: { title: string }[]; meals?: { name: string }[] };
const templates: Template[] = JSON.parse(readFileSync(resolve('supabase/seed/source/starter-templates.json'), 'utf8'));

it('has English for every starter title, note, day and meal name', () => {
  const texts = templates.flatMap(t => [t.title, ...(t.notes ? [t.notes] : []),
    ...(t.days ?? []).map(d => d.title), ...(t.meals ?? []).map(m => m.name)]);
  expect(texts.filter(text => !hasStarterEnglish(text))).toEqual([]);
});

it('translates unedited starter text for English only and leaves captain text alone', () => {
  expect(starterText('دفع وسحب ورجل', 'en')).toBe('Push, pull, legs');
  expect(starterText('دفع وسحب ورجل', 'ar')).toBe('دفع وسحب ورجل');
  expect(starterText('برنامج أحمد', 'en')).toBe('برنامج أحمد');
  expect(starterText('My plan', 'en')).toBe('My plan');
});

it('names the Ramadan first meal iftar and other plans breakfast', () => {
  expect(starterText('الفطار', 'en', 'أكل رمضان')).toBe('Iftar');
  expect(starterText('الفطار', 'en', 'أكل للتنشيف')).toBe('Breakfast');
  expect(starterText('الفطار', 'en')).toBe('Breakfast');
  expect(starterText('الفطار', 'en', '')).toBe('Breakfast');
  expect(starterText('الفطار', 'ar', 'أكل رمضان')).toBe('الفطار');
});
