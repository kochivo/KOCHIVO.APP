import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    'summary.one': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعب · {ending} هيجددوا الأسبوع ده',
    'summary.two': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعبين · {ending} هيجددوا الأسبوع ده',
    'summary.few': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعبين · {ending} هيجددوا الأسبوع ده',
    'summary.other': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعب · {ending} هيجددوا الأسبوع ده',
    record: 'سجّل دفعة', all: 'الكل', overdue: 'متأخر', ending: 'هيخلص قريب', paid: 'دافع',
    search: 'دوّر على لاعب', player: 'اللاعب', package: 'الباقة', last: 'آخر دفعة', renewal: 'التجديد',
    remind: 'فكّره', received: 'اتدفع', packages: 'باقاتك', packagesHint: 'اللي اللاعب بيختار منها لما ينضم',
    addPackage: '+ باقة جديدة', until: 'لحد {date}', noMatches: 'مفيش لاعبين بالاختيار ده',
    'ends.one': 'بعد يوم', 'ends.two': 'بعد يومين', 'ends.other': 'بعد {count} أيام',
    'late.one': 'متأخر يوم', 'late.two': 'متأخر يومين', 'late.other': 'متأخر {count} أيام',
    choosePlayer: 'اختار اللاعب', details: 'تفاصيل الفلوس', currency: 'جنيه',
    empty: 'لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين', invite: 'ابعت دعوة',
    subscription: 'اشتراكي', sessionsEnded: 'الحصص خلصت', balance: 'عليه {amount} جنيه',
  },
  en: {
    'summary.one': 'Paid this month EGP {paid} · EGP {due} overdue from {count} player · {ending} renew this week',
    'summary.other': 'Paid this month EGP {paid} · EGP {due} overdue from {count} players · {ending} renew this week',
    record: 'Record payment', all: 'All', overdue: 'Overdue', ending: 'Ending soon', paid: 'Paid',
    search: 'Find a player', player: 'Player', package: 'Package', last: 'Last payment', renewal: 'Renewal',
    remind: 'Remind', received: 'Paid', packages: 'Your packages', packagesHint: 'Players choose these when they join',
    addPackage: '+ New package', until: 'Until {date}', noMatches: 'No players match',
    'ends.one': 'In one day', 'ends.other': 'In {count} days',
    'late.one': 'One day overdue', 'late.other': '{count} days overdue',
    choosePlayer: 'Choose a player', details: 'Finance details', currency: 'EGP',
    empty: 'No players yet. Send an invite from Players', invite: 'Send invite',
    subscription: 'My subscription', sessionsEnded: 'No sessions left', balance: 'Owes EGP {amount}',
  },
});
