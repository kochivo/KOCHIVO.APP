import { expect, it, vi } from 'vitest';
/* eslint-disable no-restricted-imports -- T-288 verifies the shared presentation callback boundary. */
import { PlayerTabsView } from '@/features/player-shell/components/player-tabs-view';
/* eslint-enable no-restricted-imports */

it('keeps player selection local and preserves the original route callback', () => {
  const onSelect = vi.fn(), preventDefault = vi.fn();
  const view = PlayerTabsView({ pathname: '/player', locale: 'ar', label: 'Navigation', onSelect });
  const props = view.props as { onClickCapture: (event: { target: Element; preventDefault: () => void }) => void };
  const target = { closest: () => ({ getAttribute: () => '#/player/captain' }) } as unknown as Element;
  props.onClickCapture({ target, preventDefault });
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(onSelect).toHaveBeenCalledWith('/player/captain');
});

it('ignores clicks on the tab bar outside its links', () => {
  const onSelect = vi.fn(), preventDefault = vi.fn();
  const view = PlayerTabsView({ pathname: '/player', locale: 'ar', label: 'Navigation', onSelect });
  const props = view.props as { onClickCapture: (event: { target: Element; preventDefault: () => void }) => void };
  const target = { closest: () => null } as unknown as Element;
  props.onClickCapture({ target, preventDefault });
  expect(preventDefault).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();
});
