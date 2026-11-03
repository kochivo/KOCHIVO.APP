import type { DialogHTMLAttributes, ReactElement } from 'react';
import type * as ReactModule from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { ResponsiveDialog } from './responsive-dialog';

const lifecycle = vi.hoisted(() => ({
  element: {} as object,
  effect: undefined as (() => (() => void) | undefined) | undefined,
}));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useRef: () => ({ current: lifecycle.element }),
  useEffect: (effect: () => (() => void) | undefined) => { lifecycle.effect = effect; },
}));
afterEach(() => vi.unstubAllGlobals());

it.each([false, true])('uses native mobile modality, desktop=%s, and restores the opener', desktop => {
  class Element { isConnected = true; focus = vi.fn(); }
  const opener = new Element();
  const close = vi.fn();
  const show = vi.fn();
  const showModal = vi.fn();
  const focus = vi.fn();
  const media = { matches: desktop, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  lifecycle.element = { close, show, showModal, querySelector: () => ({ focus }) };
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('document', { activeElement: opener });
  vi.stubGlobal('window', { matchMedia: () => media });
  ResponsiveDialog({ fallbackId: 'heading', onDismiss: () => {} });
  const cleanup = lifecycle.effect?.();
  expect(desktop ? show : showModal).toHaveBeenCalledOnce();
  expect(desktop ? showModal : show).not.toHaveBeenCalled();
  expect(focus).toHaveBeenCalledOnce();
  cleanup?.();
  expect(opener.focus).toHaveBeenCalledOnce();
  expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
});

it('dismisses on Escape and native cancel', () => {
  const dismiss = vi.fn();
  const element = ResponsiveDialog({ fallbackId: 'heading', onDismiss: dismiss }) as ReactElement<DialogHTMLAttributes<HTMLDialogElement>>;
  const preventDefault = vi.fn();
  // Only the event fields consumed by the handlers are needed for this deterministic unit test.
  element.props.onKeyDown?.({ key: 'Escape', preventDefault } as unknown as React.KeyboardEvent<HTMLDialogElement>);
  element.props.onCancel?.({ preventDefault } as unknown as React.SyntheticEvent<HTMLDialogElement>);
  expect(dismiss).toHaveBeenCalledTimes(2);
  expect(preventDefault).toHaveBeenCalledTimes(2);
});

it('uses the heading when the reviewed row has disappeared', () => {
  const fallback = { focus: vi.fn() };
  lifecycle.element = { close: vi.fn(), show: vi.fn(), showModal: vi.fn(), querySelector: () => null };
  class Element { isConnected = false; }
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('document', { activeElement: new Element(), getElementById: () => fallback });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  ResponsiveDialog({ fallbackId: 'heading', onDismiss: () => {} });
  lifecycle.effect?.()?.();
  expect(fallback.focus).toHaveBeenCalledOnce();
});

it('restores the selected row even if an older panel moved focus during replacement', () => {
  class Element { isConnected = true; focus = vi.fn(); }
  const previous = new Element();
  const selected = new Element();
  const media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const show = vi.fn();
  const showModal = vi.fn();
  lifecycle.element = { close: vi.fn(), show, showModal, querySelector: () => null };
  vi.stubGlobal('HTMLElement', Element);
  vi.stubGlobal('document', { activeElement: previous, getElementById: () => selected });
  vi.stubGlobal('window', { matchMedia: () => media });
  ResponsiveDialog({ openerId: 'selected', fallbackId: 'heading', onDismiss: () => {} });
  const cleanup = lifecycle.effect?.();
  const resize = media.addEventListener.mock.calls[0]?.[1] as (() => void) | undefined;
  media.matches = true;
  resize?.();
  expect(showModal).toHaveBeenCalledOnce();
  expect(show).toHaveBeenCalledOnce();
  cleanup?.();
  expect(selected.focus).toHaveBeenCalledOnce();
  expect(previous.focus).not.toHaveBeenCalled();
});
