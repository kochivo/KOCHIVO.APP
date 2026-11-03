import { expect, it } from 'vitest';
import { shareText } from './share-text';

it('compensates for Satori word order while keeping Latin and numeric names unchanged', () => {
  expect(shareText('خطوتك الجاية بتبدأ من هنا')).toBe('هنا من بتبدأ الجاية خطوتك');
  expect(shareText('أحمد علي')).toBe('علي أحمد');
  expect(shareText('Ahmed Ali')).toBe('Ahmed Ali');
  expect(shareText('Your next move starts here')).toBe('Your next move starts here');
});
