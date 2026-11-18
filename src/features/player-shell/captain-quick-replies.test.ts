import { Children, isValidElement } from 'react';
import { expect, it, vi } from 'vitest';
import { CaptainQuickReplies } from './components/captain-quick-replies';

it('offers the selected phrase to the composer', () => {
  const onChoose = vi.fn();
  const replies = ['Got it, coach', 'Any alternative?', 'I’ll send a video'];
  const group = CaptainQuickReplies({ replies, onChoose });
  const buttons = Children.toArray(group.props.children).filter(isValidElement<{ onClick: () => void }>);
  expect(buttons).toHaveLength(replies.length);
  buttons.forEach(button => button.props.onClick());
  expect(onChoose.mock.calls).toEqual(replies.map(reply => [reply]));
});
