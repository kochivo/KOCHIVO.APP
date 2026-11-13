import { createElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ChatComposer } from './components/chat-composer';

const recorder = vi.hoisted(() => ({ state: { status: 'idle' } as { status: string; seconds?: number; blob?: Blob },
  start: vi.fn(), stop: vi.fn(), reset: vi.fn() }));
vi.mock('@/features/voice-notes', async original => ({ ...await original<object>(), useRecorder: () => recorder }));
const text = vi.hoisted(() => ({ value: '' }));
vi.mock('react', async original => ({ ...await original<object>(),
  useState: (initial: unknown) => typeof initial === 'string' ? [text.value, (next: string) => { text.value = next; }] : [initial, vi.fn()],
  useEffect: vi.fn(),
}));
const props = { viewer: 'player' as const, onSendText: vi.fn(async () => true), onSendVoice: vi.fn(async () => true) };
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(ChatComposer, props)));
beforeEach(() => { text.value = ''; recorder.state = { status: 'idle' }; vi.clearAllMocks(); });
it('switches from mic to send for nonempty text and limits input to 1000', () => {
  expect(render()).toContain('aria-label="سجّل رسالة صوتية"');
  expect(render()).toContain('maxLength="1000"');
  text.value = 'hello';
  expect(render()).toContain('aria-label="ابعت الرسالة"');
  expect(render()).not.toContain('aria-label="سجّل رسالة صوتية"');
});
it('renders recording timer, discard and send, and the existing permission error', () => {
  recorder.state = { status: 'recording', seconds: 7 };
  const html = render();
  expect(html).toContain('0:07');
  expect(html).toContain('بيسجّل…');
  expect(html).toContain('bg-danger');
  expect(html).toContain('aria-label="الغي"');
  expect(html).toContain('aria-label="ابعت الرسالة"');
  recorder.state = { status: 'denied' };
  expect(render()).toContain('اسمح للمتصفح يستخدم المايك عشان تسجّل');
});
// Collect host handlers while React supplies the translation context.
let tree: ReactNode;
function Capture() { tree = ChatComposer(props); return null; }
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!('props' in node)) return [];
  const element = node as ReactElement<{ children?: ReactNode }>;
  return [element as ReactElement<Record<string, unknown>>, ...elements(element.props.children)];
}
function capture() {
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(Capture)));
  return elements(tree);
}
it('submits trimmed text through Enter/form submission and clears the input', async () => {
  text.value = ' hello ';
  const submit = capture().find(element => element.type === 'form')?.props.onSubmit as (event: { preventDefault: () => void }) => void;
  submit({ preventDefault: vi.fn() });
  expect(props.onSendText).toHaveBeenCalledWith('hello');
  expect(text.value).toBe('');
});
it('sends a recorded blob and lets the thread own retry even when sending fails', async () => {
  const blob = new Blob(['voice'], { type: 'audio/webm' });
  recorder.state = { status: 'recorded', seconds: 7, blob };
  props.onSendVoice.mockResolvedValueOnce(false);
  const submit = capture().find(element => element.type === 'form')?.props.onSubmit as (event: { preventDefault: () => void }) => void;
  submit({ preventDefault: vi.fn() });
  await Promise.resolve();
  expect(props.onSendVoice).toHaveBeenCalledWith({ blob, mimeType: 'audio/webm', durationSeconds: 7 });
  expect(recorder.reset).toHaveBeenCalled();
});
