import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RamadanSettings } from '../components/ramadan-settings';
vi.mock('../data/ramadan', () => ({ saveRamadanTeam: vi.fn(), loadRamadanTeam: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: { preferences: { ramadan_mode: true,
  ramadan_training: 'after_iftar_2h', ramadan_intensity: 'lighter_20', ramadan_water_ml: 3000 },
  players: [{ id: 'one', name: 'Ali' }], exempt: [] } }) }));
it('renders the captain controls, exemption roster and real player count', () => {
  const html = renderToStaticMarkup(createElement(RamadanSettings, { today: '2027-02-08' }));
  for (const text of ['وضع رمضان', 'طبّق على 1 لاعب', 'Ali', '3000', '2027-02-08', 'مش صايم']) expect(html).toContain(text);
});
it.each(['2027-01-24', '2027-03-10', '2029-12-21', '2031-01-01'])('hides the entire section on %s', today => {
  expect(renderToStaticMarkup(createElement(RamadanSettings, { today }))).toBe('');
});
it.each(['2027-01-25', '2027-03-09', '2029-12-22', '2030-02-03'])('shows an anchorable section on %s', today => {
  const html = renderToStaticMarkup(createElement(RamadanSettings, { today }));
  expect(html).toContain('id="ramadan"');
  expect(html).toContain('وضع رمضان');
});
it('shows the upcoming Ramadan dates when preparation starts in December', () => {
  const html = renderToStaticMarkup(createElement(RamadanSettings, { today: '2029-12-22' }));
  expect(html).toContain('2030-01-05');
  expect(html).toContain('2030-02-03');
  expect(html).not.toContain('2029-01-16');
});
