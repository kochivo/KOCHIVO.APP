import { expect, it } from 'vitest';
import { assessmentAnswer } from './assessment-answer';
it('renders translated choice labels and yes/no rather than stored option codes', () => {
  const options = [{ value: 'hard', label_ar: 'صعب', label_en: 'Hard' }, { value: 'easy', label_ar: 'سهل', label_en: 'Easy' }];
  expect(assessmentAnswer(['hard', 'easy'], options, 'ar', 'أيوه', 'لأ')).toBe('صعب · سهل');
  expect(assessmentAnswer(false, [], 'en', 'Yes', 'No')).toBe('No');
  expect(assessmentAnswer(null, [], 'ar', 'أيوه', 'لأ')).toBe('');
  expect(assessmentAnswer(84.2, [], 'en', 'Yes', 'No')).toBe('84.2');
});
