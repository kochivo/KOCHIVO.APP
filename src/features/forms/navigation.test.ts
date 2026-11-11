import type { MouseEvent } from 'react';
import { expect, it, vi } from 'vitest';
import { LibraryWorkspace } from './components/library-workspace';
import { saveDraft } from './hooks/save-draft';
import { copyTemplate } from './model';
import { templates } from './templates';

it.each([true, false])('blocks library navigation only while edits are unsaved: %s', busy => {
  const event = { target: { closest: () => ({}) }, preventDefault: vi.fn(), stopPropagation: vi.fn() };
  const workspace = LibraryWorkspace({ busy, children: null, editor: null });
  workspace.props.onClickCapture(event as unknown as MouseEvent<HTMLDivElement>);
  expect(event.preventDefault).toHaveBeenCalledTimes(busy ? 1 : 0);
  expect(event.stopPropagation).toHaveBeenCalledTimes(busy ? 1 : 0);
});

it('does not navigate or update editor state when a save finishes after unmount', async () => {
  let active = true, complete: ((result: { ok: boolean }) => void) | undefined;
  const onSaved = vi.fn();
  const writing = saveDraft(copyTemplate(templates[0], 'captain'),
    () => new Promise(resolve => { complete = resolve; }), () => active, onSaved);
  active = false; complete?.({ ok: true });
  await writing;
  expect(onSaved).not.toHaveBeenCalled();
});
