import type { ReactElement } from 'react';
import { expect, it, vi } from 'vitest';
import { WelcomeRoleCard } from './components/welcome-role-card';

type Radio = ReactElement<{ role: string; tabIndex: number; 'aria-checked': boolean;
  onKeyDown: (event: { key: string; preventDefault: () => void; currentTarget: { parentElement: { querySelectorAll: () => { item: (index: number) => { focus: () => void } } } } }) => void }>;
it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'End'])('selects and focuses the captain with %s', key => {
  const select = vi.fn(); const focus = vi.fn(); const item = vi.fn(() => ({ focus })); const preventDefault = vi.fn();
  const radio = WelcomeRoleCard({ player: true, selected: true, title: 'Player', description: 'Invite', onClick() {}, onSelect: select }) as Radio;
  expect(radio.props.role).toBe('radio'); expect(radio.props['aria-checked']).toBe(true); expect(radio.props.tabIndex).toBe(0);
  radio.props.onKeyDown({ key, preventDefault, currentTarget: { parentElement: { querySelectorAll: () => ({ item }) } } });
  expect(select).toHaveBeenCalledWith('captain'); expect(item).toHaveBeenCalledWith(1); expect(focus).toHaveBeenCalledOnce();
  expect(preventDefault).toHaveBeenCalledOnce();
});
it('returns focus and selection to player with Home', () => {
  const select = vi.fn(); const item = vi.fn(() => ({ focus() {} }));
  const radio = WelcomeRoleCard({ selected: false, title: 'Coach', description: 'Players', onClick() {}, onSelect: select }) as Radio;
  expect(radio.props.tabIndex).toBe(-1);
  radio.props.onKeyDown({ key: 'Home', preventDefault() {}, currentTarget: { parentElement: { querySelectorAll: () => ({ item }) } } });
  expect(select).toHaveBeenCalledWith('player'); expect(item).toHaveBeenCalledWith(0);
});
