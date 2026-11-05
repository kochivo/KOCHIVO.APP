import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { FoodPicker } from './components/food-picker';
import type { Food } from './types';
const sheet = vi.hoisted(() => ({ save: undefined as undefined | ((food: Food, grams: number) => void) }));
vi.mock('./data/foods', () => ({ searchFoods() {} }));
vi.mock('./data/custom-food', () => ({ deleteCustomFood() {} }));
vi.mock('next/dynamic', () => ({ default: () => (props: { onSave: (food: Food, grams: number) => void }) => { sheet.save = props.onSave; return null; } }));
it('keeps zero-calorie custom foods out of alternatives', () => {
 state.values = ['', 'all', 100, { foods: [], catalogEmpty: true }, false, false, 0, true];
 const picked: Food[] = [];
 render(createElement(FoodPicker, { alternative: true, onPick: food => picked.push(food) }));
 const food = { id: 'f', name: 'Water', kcal: 0, protein: 0, carbs: 0, fat: 0, photo: null, custom: true };
 sheet.save?.(food, 100);
 expect(picked).toEqual([]);
});
it('passes positive-calorie alternatives to the existing add flow', () => {
 state.values = ['', 'all', 100, { foods: [], catalogEmpty: true }, false, false, 0, true];
 const picked: Food[] = [];
 render(createElement(FoodPicker, { alternative: true, onPick: food => picked.push(food) }));
 const food = { id: 'f', name: 'Rice', kcal: 130, protein: 3, carbs: 28, fat: 0, photo: null, custom: true };
 sheet.save?.(food, 100);
 expect(picked).toEqual([food]);
});
