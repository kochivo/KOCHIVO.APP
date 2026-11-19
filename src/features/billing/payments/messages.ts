import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    'summary.one': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من لاعب واحد · {ending} هيجددوا الأسبوع ده',
    'summary.two': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من لاعبين · {ending} هيجددوا الأسبوع ده',
    'summary.few': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعبين · {ending} هيجددوا الأسبوع ده',
    'summary.many': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعب · {ending} هيجددوا الأسبوع ده', 'summary.other': 'اتدفع الشهر ده {paid} جنيه · متأخر {due} جنيه من {count} لاعب · {ending} هيجددوا الأسبوع ده',
    record: 'سجّل دفعة', all: 'الكل', overdue: 'متأخر', ending: 'هيخلص قريب', paid: 'دافع',
    search: 'دوّر على لاعب', player: 'اللاعب', package: 'الباقة', last: 'آخر دفعة', renewal: 'التجديد',
    remind: 'فكّره', received: 'اتدفع', packages: 'باقاتك', packagesHint: 'اللي اللاعب بيختار منها لما ينضم',
    addPackage: '+ باقة جديدة', until: 'لحد {date}', noMatches: 'مفيش لاعبين بالاختيار ده',
    endsToday: "النهارده", 'ends.one': "بكرة", 'ends.two': "بعد يومين", 'ends.few': "بعد {count} أيام", 'ends.many': "بعد {count} يوم", 'ends.other': "بعد {count} يوم",
    'late.one': "متأخر من امبارح", 'late.two': "متأخر يومين", 'late.few': "متأخر {count} أيام", 'late.many': "متأخر {count} يوم", 'late.other': "متأخر {count} يوم",
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
    endsToday: "Today", 'ends.one': "Tomorrow", 'ends.other': "In {count} days",
    'late.one': "Overdue since yesterday", 'late.other': "{count} days overdue",
    choosePlayer: 'Choose a player', details: 'Finance details', currency: 'EGP',
    empty: 'No players yet. Send an invite from Players', invite: 'Send invite',
    subscription: 'My subscription', sessionsEnded: 'No sessions left', balance: 'Owes EGP {amount}',
  },
});
