import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'ترتيب الفريق', crown: 'تاج الفريق',
    noCrown: 'لسه محدش أخد التاج الشهر ده',
    rule: 'التاج لأعلى التزام بالخطة، بحد أدنى {count} تمارين في الشهر. الأرقام الجديدة والـInBody بيزودوا درجتك.',
    adherence: 'التزام {n}٪ · {done} من {planned} تمرين', percent: '{n}٪', workouts: '{done} من {planned}',
    lifetime: '{count} نقطة إجمالي',
    beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة',
    empty: 'لسه مفيش لاعيبة', emptyBody: 'لما تضيف لاعيبة، ترتيبهم هيظهر هنا.',
    previous: 'الشهر اللي فات', next: 'الشهر اللي جاي',
    error: 'مش قادرين نحمّل الترتيب. جرّب تاني.', retry: 'جرّب تاني',
  },
  en: {
    title: 'Team ranking', crown: 'Team crown',
    noCrown: 'Nobody holds the crown yet this month',
    rule: 'The crown goes to the highest plan adherence, with at least {count} workouts this month. Records and InBody scans add to your score.',
    adherence: '{n}% adherence · {done} of {planned} workouts', percent: '{n}%', workouts: '{done} of {planned}',
    lifetime: '{count} lifetime points',
    beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend',
    empty: 'No players yet', emptyBody: 'Add players to see their ranking here.',
    previous: 'Previous month', next: 'Next month',
    error: 'Could not load the ranking. Try again.', retry: 'Try again',
  },
});
