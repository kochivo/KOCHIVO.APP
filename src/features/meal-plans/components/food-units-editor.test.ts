import { Children, createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { Button } from '@/ui/button';
import { NumberInput } from '@/ui/number-input';
import { FoodUnitsEditor } from './food-units-editor';

vi.mock('@/core/i18n/client', () => ({ useT: (messages: Messages) => createT(messages, 'en') }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '019a805e-0000-7000-8000-000000000001' }));
const unit = { key: 'piece', name_ar: 'صباع', name_en: 'Piece', grams: 60 };
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child)
    ? [child, ...elements(child.props.children as ReactNode)] : []);
}
it('shows live calories for each unit and updates them when grams or calories change', () => {
  const render = (kcal: number, grams: number) => renderToStaticMarkup(createElement(FoodUnitsEditor,
    { units: [{ ...unit, grams }], kcal, onChange() {} }));
  expect(render(230, 60)).toContain('138 kcal');
  expect(render(230, 100)).toContain('230 kcal');
  expect(render(100, 60)).toContain('60 kcal');
});
it('creates a unit with a generated UUID key and shows an empty-state invitation', () => {
  const onChange = vi.fn();
  const tree = FoodUnitsEditor({ units: [], kcal: 230, onChange });
  expect(renderToStaticMarkup(tree)).toContain('Add a unit such as');
  const button = elements(tree).find(element => element.type === Button);
  (button?.props.onClick as () => void)();
  expect(onChange).toHaveBeenCalledWith([{ key: '019a805e-0000-7000-8000-000000000001', name_ar: '', name_en: '', grams: 100 }]);
});
it('disables adding a twenty-first unit', () => {
  const units = Array.from({ length: 20 }, (_, index) => ({ ...unit, key: String(index) }));
  const tree = FoodUnitsEditor({ units, kcal: 230, onChange() {} });
  const button = elements(tree).find(element => element.type === Button);
  expect(button?.props.disabled).toBe(true);
});
it('keeps the key when changing unit grams or names', () => {
  const onChange = vi.fn();
  const tree = FoodUnitsEditor({ units: [unit], kcal: 230, onChange });
  const inputs = elements(tree).filter(element => element.type === 'input');
  (inputs[0]?.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'طبق' } });
  expect(onChange).toHaveBeenLastCalledWith([{ ...unit, name_ar: 'طبق' }]);
  const number = elements(tree).find(element => element.type === NumberInput);
  (number?.props.onCommit as (value: number) => void)(0.5);
  expect(onChange).toHaveBeenLastCalledWith([{ ...unit, grams: 0.5 }]);
});
