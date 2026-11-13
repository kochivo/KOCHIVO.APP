import { expect, it } from 'vitest';
import { calendarCells } from './components/history-calendar';

it('starts the month on Saturday and distinguishes trained, missed, today and today-trained', () => {
  const input = { month: '2026-11', today: '2026-11-13', trained: ['2026-11-01'], planned: ['2026-11-02', '2026-11-13'] };
  const cells = calendarCells(input);
  expect(cells[0]).toBeNull();
  expect(cells[1]).toMatchObject({ date: '2026-11-01', trained: true, missed: false });
  expect(cells[2]).toMatchObject({ date: '2026-11-02', missed: true });
  expect(cells.find(cell => cell?.date === input.today)).toMatchObject({ today: true, trained: false, missed: false });
  expect(calendarCells({ ...input, trained: [input.today] }).find(cell => cell?.date === input.today)).toMatchObject({ today: true, trained: true, missed: false });
  expect(calendarCells({ ...input, month: '2026-08' })[0]?.date).toBe('2026-08-01');
});
