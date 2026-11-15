import { isValidElement } from 'react';
import type * as ReactModule from 'react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { V11FormBuilder } from './components/v11-form-builder';
import { V11QuestionCard } from './components/v11-question-card';
import { V11QuestionOptions } from './components/v11-question-options';
import { EditInPlace } from '@/ui/edit-in-place';
import { copyTemplate, newQuestion, validateForm } from './model';
import { templates } from './templates';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0 }));
vi.mock('react', async importOriginal => ({ ...await importOriginal<typeof ReactModule>(),
  useState(initial: unknown) {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = initial;
    return [hooks.slots[index], (value: unknown) => { hooks.slots[index] = value; }];
  },
}));

function elements<P>(node: ReactNode, type: unknown): ReactElement<P>[] {
  if (Array.isArray(node)) return node.flatMap(child => elements<P>(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [...(node.type === type ? [node as ReactElement<P>] : []), ...elements<P>(node.props.children, type)];
}
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; });

function builder() {
  let form = copyTemplate(templates[0], 'captain');
  const render = () => {
    hooks.cursor = 0;
    return V11FormBuilder({ form, locale: 'en', status: 'saved', preview: false, onChange(next) { form = next; }, onPreview() {}, onRetry() {} });
  };
  const cards = () => elements<Parameters<typeof V11QuestionCard>[0]>(render(), V11QuestionCard);
  return { render, cards, form: () => form };
}

it('appends an answer type from the bottom card and opens only the new question', () => {
  const editor = builder(), before = editor.form().questions.length;
  const buttons = elements<{ children?: ReactNode; onClick: () => void }>(editor.render(), 'button');
  buttons.find(button => Array.isArray(button.props.children) && button.props.children.includes('Multiple choice'))?.props.onClick();
  expect(editor.form().questions).toHaveLength(before + 1);
  expect(editor.form().questions.at(-1)?.type).toBe('multi');
  expect(editor.form().questions.at(-1)?.position).toBe(before);
  const opened = editor.cards().filter(card => card.props.open);
  expect(opened).toHaveLength(1);
  expect(opened[0]?.props.question.id).toBe(editor.form().questions.at(-1)?.id);
});

it('opens one card, collapses it, and preserves selection across a keyboard reorder', () => {
  const editor = builder();
  editor.cards()[1]?.props.onToggle();
  const opened = editor.cards().filter(card => card.props.open);
  expect(opened).toHaveLength(1);
  const id = opened[0]?.props.question.id;
  opened[0]?.props.onMove(-1);
  expect(editor.form().questions[0]?.id).toBe(id);
  expect(editor.cards().filter(card => card.props.open)[0]?.props.question.id).toBe(id);
  editor.cards()[0]?.props.onToggle();
  expect(editor.cards().filter(card => card.props.open)).toHaveLength(0);
});

it('lets English editors create a valid choice through the visible chip', () => {
  const form = copyTemplate(templates[0], 'captain');
  let question = { ...newQuestion(form.id, 0), type: 'choice' as const };
  const render = () => V11QuestionOptions({ question, locale: 'en', onChange(next) { question = { ...question, options: next.options }; } });
  elements<{ onClick: () => void }>(render(), 'button').at(-1)?.props.onClick();
  expect(question.options).toHaveLength(1);
  const chip = elements<Parameters<typeof EditInPlace>[0]>(render(), EditInPlace)[0];
  chip?.props.onChange?.({ target: { value: 'اختيار' } } as Parameters<NonNullable<typeof chip.props.onChange>>[0]);
  expect(question.options[0]?.label_ar).toBe('اختيار');
  expect(validateForm({ ...form, questions: [question] })).toEqual([]);
});
