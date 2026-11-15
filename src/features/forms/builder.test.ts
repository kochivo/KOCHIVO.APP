import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { FormBuilder } from './components/form-builder';
import { QuestionEditor } from './components/question-editor';
import { copyTemplate } from './model';
import { templates } from './templates';
import { messages } from './messages';
import { QuestionRules } from './components/question-rules';
import { Button } from '@/ui/button';

function buttons(node: ReactNode): ReactElement<{ onClick: () => void; children?: ReactNode; 'aria-label'?: string }>[] {
  if (Array.isArray(node)) return node.flatMap(buttons);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  const own = (node.type === 'button' || node.type === Button) || node.type === Button ? [node as ReturnType<typeof buttons>[number]] : [];
  return [...own, ...buttons(node.props.children)];
}
function editor(node: ReactNode): ReactElement<Parameters<typeof QuestionEditor>[0]> | undefined {
  if (Array.isArray(node)) return node.map(editor).find(Boolean);
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  if (node.type === QuestionEditor) return node as ReactElement<Parameters<typeof QuestionEditor>[0]>;
  return editor(node.props.children);
}
it('adds a question through the builder action and moves a mapped question down', () => {
  let form = copyTemplate(templates[0], 'captain');
  const props = () => ({ form, locale: 'en' as const, status: 'saved' as const, preview: false,
    onChange: (next: typeof form) => { form = next; }, onPreview() {}, onRetry() {} });
  const before = form.questions.length;
  const add = buttons(FormBuilder(props())).find(b => Array.isArray(b.props.children) && b.props.children.includes(messages.en.add));
  expect(add).toBeDefined(); add?.props.onClick();
  expect(form.questions).toHaveLength(before + 1);
  const firstId = form.questions[0]?.id;
  const question = editor(FormBuilder(props()));
  if (!question) throw new Error('Expected question editor');
  const tree = QuestionEditor(question.props);
  buttons(tree).find(b => b.props['aria-label'] === messages.en.down)?.props.onClick();
  expect(form.questions[1]?.id).toBe(firstId);
});

it('renders mapping, chart and alert chips in the real question editor', () => {
  const form = copyTemplate(templates[0], 'captain');
  const render = (index: number) => {
    const question = form.questions[index];
    if (!question) throw new Error('Expected question');
    return renderToStaticMarkup(createElement(QuestionEditor, {
    question, locale: 'en', index, count: form.questions.length,
    onChange() {}, onDelete() {}, onMove() {},
  })); };
  expect(render(0)).toContain('Saved in player file:');
  expect(render(0)).toContain('Weight');
  expect(render(0)).toContain('Show a chart in the player file');
  expect(render(2)).toContain('Alerts you');
});

it('keeps a typed newline so a second choice can be entered normally', () => {
  const form = copyTemplate(templates[0], 'captain');
  const first = form.questions[0];
  if (!first) throw new Error('Expected question');
  let question = { ...first, type: 'choice' as const, options: [{ value: 'a', label_ar: 'أ', label_en: 'A' }] };
  function textareas(node: ReactNode): ReactElement<{ onChange: (event: { target: { value: string } }) => void }>[] {
    if (Array.isArray(node)) return node.flatMap(textareas);
    if (!isValidElement<{ children?: ReactNode }>(node)) return [];
    if (node.type === 'textarea') return [node as ReturnType<typeof textareas>[number]];
    return textareas(node.props.children);
  }
  const render = () => QuestionRules({ question, locale: 'en', onChange: next => { question = { ...question, options: next.options }; } });
  textareas(render())[1]?.props.onChange({ target: { value: 'A\n' } });
  expect(question.options.map(o => o.label_en).join('\n')).toBe('A\n');
  textareas(render())[1]?.props.onChange({ target: { value: 'A\nB' } });
  expect(question.options.map(o => o.label_en)).toEqual(['A','B']);
});
