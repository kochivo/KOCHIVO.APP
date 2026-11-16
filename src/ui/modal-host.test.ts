import { expect, it } from 'vitest';
import { topModalDialog } from './modal-host';

const element = (name: string) => ({ name }) as unknown as Element;

it('uses the last modal dialog when :modal is supported', () => {
  const root = { querySelectorAll: (selector: string) => selector === 'dialog:modal'
    ? [element('a'), element('b')] : [] } as unknown as Pick<Document, 'querySelectorAll'>;
  expect(topModalDialog(root)).toEqual(element('b'));
});

it('falls back to open dialogs when :modal is not a valid selector', () => {
  const root = { querySelectorAll: (selector: string) => {
    if (selector === 'dialog:modal') throw new SyntaxError('not a valid selector');
    return [element('open')];
  } } as unknown as Pick<Document, 'querySelectorAll'>;
  expect(topModalDialog(root)).toEqual(element('open'));
});
