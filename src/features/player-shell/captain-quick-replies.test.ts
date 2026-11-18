import { Children, isValidElement } from 'react';
import { expect, it, vi } from 'vitest';
import { CaptainQuickReplies } from './components/captain-quick-replies';

it('sends the exact selected phrase through the text sender', () => {
  const sendText = vi.fn(async () => true);
  const replies = ['Got it, coach', 'Any alternative?', 'I’ll send a video'];
  const group = CaptainQuickReplies({ replies, sendText });
  const buttons = Children.toArray(group.props.children).filter(isValidElement<{ onClick: () => void }>);
  expect(buttons).toHaveLength(replies.length);
  buttons.forEach(button => button.props.onClick());
  expect(sendText.mock.calls).toEqual(replies.map(reply => [reply]));
});
