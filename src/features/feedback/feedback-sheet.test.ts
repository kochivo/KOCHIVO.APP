import { createElement } from 'react';
import type { FormEvent, ReactElement, ReactNode } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { FeedbackSheet } from './components/feedback-sheet';
import { messages } from './messages';

const state = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0, send: vi.fn(), success: vi.fn(), close: vi.fn() }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof ReactModule>(),
  useEffect: () => {}, useId: () => 'test-id', useRef: () => ({ current: false }),
  useState: (initial: unknown) => {
    const slot = state.cursor++;
    if (!(slot in state.values)) state.values[slot] = initial;
    return [state.values[slot], (value: unknown) => { state.values[slot] = value; }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));
vi.mock('./data/send-feedback', () => ({ sendFeedback: state.send }));

type Form = ReactElement<{ onSubmit: (event: FormEvent) => Promise<void> }>;
function render() {
  state.cursor = 0;
  return FeedbackSheet({ role: 'captain', onClose: state.close });
}
function form(tree: ReactElement<{ children?: ReactNode }>): Form {
  const children = tree.props.children as ReactElement[];
  return children.find(child => child.type === 'form') as Form;
}
const submit = (tree: ReturnType<typeof render>) => form(tree).props.onSubmit({ preventDefault() {} } as FormEvent);
beforeEach(() => { vi.clearAllMocks(); state.values = ['A broken button', false, null]; });

it.each(['failed', 'validation'] as const)('shows the translated %s error and preserves the report', async error => {
  state.send.mockResolvedValue({ error });
  await submit(render());
  const html = renderToStaticMarkup(createElement(() => render()));
  expect(html).toContain('role="alert"');
  expect(html).toContain(messages.en[error]);
  expect(html).toContain('A broken button');
  expect(state.close).not.toHaveBeenCalled();
});
it('shows a success toast and closes only after sending', async () => {
  state.send.mockResolvedValue({});
  await submit(render());
  expect(state.send).toHaveBeenCalledWith('A broken button', 'captain');
  expect(state.success).toHaveBeenCalledWith(messages.en.thanks);
  expect(state.close).toHaveBeenCalledOnce();
});
it('prevents duplicate submits while a request is pending', async () => {
  let finish: (value: object) => void = () => {};
  state.send.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const tree = render();
  const first = submit(tree);
  await submit(tree);
  expect(state.send).toHaveBeenCalledOnce();
  finish({});
  await first;
});
