import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

// Kept behind the analytics dynamic boundary: the shared skeleton uses the base messages.
export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    weeklySets: 'مجموعات الأسبوع', mostWorked: 'أكتر عضلة اتدرّبت', recovery: 'التعافي',
    excellent: 'ممتاز', average: 'متوسط', needsRest: 'محتاج راحة',
    dailyRecovery: 'حسب جاهزيتك النهارده', volumeRecovery: 'حسب حمل الأسبوع المختار',
    sets: '{sets} مجموعة', noRegions: 'مفيش', emptyWeek: 'مفيش تمرين الأسبوع ده', legend: 'مجموعات التمرين',
    push: 'دفع', pull: 'سحب', legs: 'رجل', percent: '{value}٪', separator: '، ',
    balanceSegment: '{group}: {value}٪', undertrained: '{groups}: أقل من ٢٥٪ من حمل التمرين',
    regionSets: '{muscle}: {sets} مجموعة',
    'muscle.chest': 'الصدر', 'muscle.back': 'الضهر', 'muscle.lats': 'المجنص',
    'muscle.frontDelts': 'الكتف الأمامي', 'muscle.rearDelts': 'الكتف الخلفي',
    'muscle.biceps': 'الباي', 'muscle.triceps': 'التراي', 'muscle.forearms': 'الساعد',
    'muscle.core': 'البطن', 'muscle.quads': 'الرجل الأمامية', 'muscle.hamstrings': 'الرجل الخلفية',
    'muscle.glutes': 'الجلوتس', 'muscle.calves': 'السمانة', 'muscle.adductors': 'العضلات الضامة',
    'muscle.abductors': 'عضلات الفخذ الخارجية',
  },
  en: {
    weeklySets: 'Weekly sets', mostWorked: 'Most worked muscle', recovery: 'Recovery',
    excellent: 'Excellent', average: 'Average', needsRest: 'Needs rest',
    dailyRecovery: 'Based on today’s readiness', volumeRecovery: 'Based on selected week’s volume',
    sets: '{sets} sets', noRegions: 'None', emptyWeek: 'No workout this week', legend: 'Working sets',
    push: 'Push', pull: 'Pull', legs: 'Legs', percent: '{value}%', separator: ', ',
    balanceSegment: '{group}: {value}%', undertrained: '{groups}: under 25% of training volume',
    regionSets: '{muscle}: {sets} sets',
    'muscle.chest': 'chest', 'muscle.back': 'back', 'muscle.lats': 'lats',
    'muscle.frontDelts': 'front delts', 'muscle.rearDelts': 'rear delts',
    'muscle.biceps': 'biceps', 'muscle.triceps': 'triceps', 'muscle.forearms': 'forearms',
    'muscle.core': 'Core', 'muscle.quads': 'quads', 'muscle.hamstrings': 'hamstrings',
    'muscle.glutes': 'glutes', 'muscle.calves': 'calves', 'muscle.adductors': 'adductors',
    'muscle.abductors': 'abductors',
  },
});
