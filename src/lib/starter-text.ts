import type { Locale } from '@/core/i18n/locale';

// Starter templates are copied into each captain's own rows in Arabic. Unedited starter text is
// shown in English for English readers; anything the captain typed is shown exactly as written.
const english: Record<string, string> = {
  'بعد الولادة': 'Postnatal training',
  'تمرين في البيت للبنات': 'Home training for women',
  'قوة للبنات': 'Strength for women',
  'بإذن الدكتور. 3 أيام هادية وبينهم راحة.': 'With your doctor’s approval. 3 gentle days with rest between them.',
  '3 أيام بوزن الجسم وبينهم راحة.': '3 bodyweight days with rest between them.',
  '4 أيام. زوّدي الوزن بالتدريج مع الحفاظ على الحركة.': '4 days. Add weight gradually while keeping good form.',
  'بإذن الدكتور، حركة هادية من غير ألم.': 'With your doctor’s approval, move gently without pain.',
  'بإذن الدكتور، توقفي لو حسيتي بألم.': 'With your doctor’s approval, stop if you feel pain.',
  'جسم كامل للمبتدئين': 'Beginner full body',
  'علوي وسفلي': 'Upper and lower',
  'دفع وسحب ورجل': 'Push, pull, legs',
  'دايرة تمارين للتخسيس': 'Fat loss circuits',
  'في البيت بالدامبل': 'Home dumbbells',
  'رمضان بعد الفطار': 'Ramadan after iftar',
  'أكل للتنشيف': 'Cutting meals',
  'أكل لتثبيت الوزن': 'Maintenance meals',
  'أكل لزيادة العضلات': 'Muscle gain meals',
  'أكل رمضان': 'Ramadan meals',
  '3 أيام وبينهم يوم راحة. ابدأ بوزن خفيف وزوّد بالتدريج.':
    '3 days with a rest day between them. Start light and add weight gradually.',
  '4 أيام. يومين تمرين وبعدهم يوم راحة.': '4 days. Two training days, then a rest day.',
  '6 أيام وبعدهم يوم راحة. سيب عدتين في قدرتك آخر كل مجموعة.':
    '6 days, then a rest day. Leave two reps in the tank at the end of each set.',
  '3 أيام وبينهم راحة. العب التمارين ورا بعض، وارتاح 90 ثانية بين اللفات. الأكل المناسب مهم للتخسيس.':
    '3 days with rest between them. Do the exercises back to back and rest 90 seconds between rounds. The right food matters for fat loss.',
  '3 أيام وبينهم راحة. محتاج دامبل بس ومساحة فاضية على الأرض.':
    '3 days with rest between them. You only need dumbbells and some floor space.',
  '4 حصص خفيفة بعد الفطار بساعتين. حوالي 25 دقيقة، وراحة أطول بين المجموعات. اشرب مية كويس.':
    '4 light sessions two hours after iftar. About 25 minutes, with longer rest between sets. Drink plenty of water.',
  'اليوم الأول': 'Day 1',
  'اليوم التاني': 'Day 2',
  'اليوم التالت': 'Day 3',
  'علوي أول': 'Upper A',
  'سفلي أول': 'Lower A',
  'علوي تاني': 'Upper B',
  'سفلي تاني': 'Lower B',
  'دفع أول': 'Push A',
  'سحب أول': 'Pull A',
  'رجل أول': 'Legs A',
  'دفع تاني': 'Push B',
  'سحب تاني': 'Pull B',
  'رجل تاني': 'Legs B',
  'دايرة أولى': 'Circuit 1',
  'دايرة تانية': 'Circuit 2',
  'دايرة تالتة': 'Circuit 3',
  'الفطار': 'Breakfast',
  'الغدا': 'Lunch',
  'سناك': 'Snack',
  'العشا': 'Dinner',
  'سناك خفيف': 'Light snack',
  'السحور': 'Suhoor',
};

// The same Arabic word means a different meal in Ramadan: الفطار is iftar there, not breakfast.
const inPlan: Record<string, Record<string, string>> = {
  'أكل رمضان': { 'الفطار': 'Iftar' },
};

export function starterText(text: string, locale: Locale, parent?: string): string {
  if (locale !== 'en') return text;
  const key = text.trim();
  return (parent ? inPlan[parent.trim()]?.[key] : undefined) ?? english[key] ?? text;
}

export function hasStarterEnglish(text: string): boolean {
  return text.trim() in english;
}
