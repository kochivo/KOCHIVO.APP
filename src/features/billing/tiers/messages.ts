import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: 'باقاتي والعروض', breadcrumb: 'الدفعات ‹', intro: 'اللي اللاعب بيختار منه لما ينضم أو يجدد · بيظهر في صفحتك العامة',
    publicPage: 'شوف صفحتي', newTier: 'فئة جديدة', addTier: '+ فئة جديدة', example: 'مثلًا: أونلاين بس، حصص في الجيم',
    featured: 'الأكثر طلبًا', menu: 'اختيارات {name}', rename: 'غيّر الاسم', editFeatures: 'عدّل المميزات',
    feature: 'خلّيها الأكثر طلبًا', unfeature: 'شيل الأكثر طلبًا', earlier: 'طلّع لفوق', later: 'نزّل لتحت', archive: 'أرشف الفئة',
    players: '{n} لاعيبة عليها', addDuration: '+ مدة', savePercent: 'وفّر {n}%', month: 'شهر', months: '{n} شهور', days: '{n} يوم',
    currency: 'جنيه', noDurations: 'لسه مفيش مدد', noFeatures: 'لسه مفيش مميزات', empty: 'لسه معملتش باقات',
    oldNote: 'الباقات القديمة هتظهر تحت فئة اسمها "أساسي" لحد ما تنقلها أو تغيّر اسمها، ومش هيتغير أي حاجة للاعيبة اللي عليها. "وفّر 11%" بتتحسب لوحدها من سعر الشهر. "الأكثر طلبًا" إنت اللي بتختارها.',
    name: 'اسم الفئة', description: 'وصف قصير', features: 'المميزات (كل ميزة في سطر)', color: 'لون الفئة',
    muted: 'رمادي', lime: 'ليموني', warn: 'ذهبي', danger: 'مرجاني', save: 'احفظ', cancel: 'إلغاء',
    failure: 'مش قادرين نحفظ التغيير. جرّب تاني', loadFailed: 'مش قادرين نحمّل الباقات', retry: 'جرّب تاني',
    tier: 'الفئة', noTier: 'من غير فئة', editPackage: 'عدّل الباقة', archivePackage: 'أرشف الباقة', manage: 'إدارة الباقات والعروض', invalid: 'اكتب اسم الفئة ومميزات أقصر (10 بالكتير)',
  },
  en: {
    title: 'My packages and offers', breadcrumb: 'Payments ‹', intro: 'Players choose these when joining or renewing · Shown on your public page',
    publicPage: 'View my page', newTier: 'New tier', addTier: '+ New tier', example: 'For example: online only, gym sessions',
    featured: 'Most popular', menu: 'Options for {name}', rename: 'Rename', editFeatures: 'Edit features',
    feature: 'Mark most popular', unfeature: 'Remove most popular', earlier: 'Move up', later: 'Move down', archive: 'Archive tier',
    players: '{n} players', addDuration: '+ Duration', savePercent: 'Save {n}%', month: 'Month', months: '{n} months', days: '{n} days',
    currency: 'EGP', noDurations: 'No durations yet', noFeatures: 'No features yet', empty: 'No packages yet',
    oldNote: 'Existing packages appear under “أساسي” until you move or rename them. Players keep their packages. Savings use the monthly price. You choose the most popular tier.',
    name: 'Tier name', description: 'Short description', features: 'Features (one per line)', color: 'Tier color',
    muted: 'Grey', lime: 'Lime', warn: 'Gold', danger: 'Coral', save: 'Save', cancel: 'Cancel',
    failure: 'Could not save. Try again', loadFailed: 'Could not load packages', retry: 'Try again',
    tier: 'Tier', noTier: 'No tier', editPackage: 'Edit package', archivePackage: 'Archive package', manage: 'Manage packages and offers', invalid: 'Enter a name and shorter features (up to 10)',
  },
});
