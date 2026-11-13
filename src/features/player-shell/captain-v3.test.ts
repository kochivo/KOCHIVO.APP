import { expect, it } from 'vitest';
import { oldestAssessment } from './captain-v3';
import { whatsappUrl } from '@/lib/whatsapp';

it('selects the oldest unanswered request by sent time rather than due date', () => {
  const rows = [
    { id: 'new', sent_at: '2026-11-12T10:00Z', answered_at: null },
    { id: 'answered', sent_at: '2026-11-01T10:00Z', answered_at: '2026-11-02T10:00Z' },
    { id: 'old', sent_at: '2026-11-03T10:00Z', answered_at: null },
  ];
  expect(oldestAssessment(rows)?.id).toBe('old');
  expect(rows[0]?.id).toBe('new');
  expect(oldestAssessment([])).toBeUndefined();
  expect(oldestAssessment(rows.filter(row => row.answered_at))).toBeUndefined();
});

it('keeps WhatsApp question encoding and trimmed text', () => {
  expect(whatsappUrl({ phone: '201012345678', text: '  سؤال & تمرين  '.trim() }))
    .toBe('https://wa.me/201012345678?text=%D8%B3%D8%A4%D8%A7%D9%84%20%26%20%D8%AA%D9%85%D8%B1%D9%8A%D9%86');
});
