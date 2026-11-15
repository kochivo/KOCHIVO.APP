import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    calorieShort: 'الأكل المتاح والميزانية مش مكفّيين السعرات المطلوبة.', range: 'اكتب مبلغ من 300 لـ 100000 جنيه.',
    monthly: 'ميزانية الأكل في الشهر (جنيه)', hint: 'هنقسمها على أيام الشهر. لو مش عايز، سيبها فاضية.',
    daily: 'يعني حوالي {n} جنيه في اليوم', money: '{n} جنيه', budget: 'الميزانية في اليوم',
    title: 'خطة على قد الميزانية', generate: 'اعمل الخطة', use: 'استخدم الخطة',
    short: 'الميزانية مش هتكفي {n} جم بروتين.', reduce: 'قلّل البروتين لـ {n}', contact: 'كلّم اللاعب',
    kcal: 'سعرات', protein: 'بروتين', foods: 'الأكل المتاح للخطة', empty: 'مفيش أكل بأسعار لسه.',
    prices: 'أسعار الأكل', platform: 'سعر المنصة', yours: 'سعرك', updated: 'آخر تحديث',
    save: 'احفظ', saved: 'اتحفظ', error: 'مش قادرين نحمّل أو نحفظ. جرّب تاني.', retry: 'جرّب تاني',
    noBudget: 'اللاعب لسه مدخلش ميزانية الأكل.', shopping: 'طلبات الأسبوع', total: 'الإجمالي',
    estimate: 'الأسعار تقريبية، والكابتن يقدر يحدّثها كل شهر.', share: 'ابعت القايمة على الواتساب',
    noItems: 'مفيش أصناف بأسعار.', cheaper: 'بديل أرخص', saving: 'وفّر {n} جنيه',
    kg: 'كيلو', piece: 'قطعة', pack: 'علبة', grams: 'جم', breakfast: 'فطار', main: 'وجبة رئيسية', snack: 'سناك',
    close: 'اقفل', meals: 'عدد الوجبات', food: 'الأكل', unit: 'الوحدة', price: 'السعر',
  },
  en: {
    calorieShort: 'The available foods and budget fall short of the calorie target.', range: 'Enter an amount from 300 to 100000 EGP.',
    monthly: 'Monthly food budget (EGP)', hint: 'We divide this by the days in the month. Leave blank if you prefer.',
    daily: 'About {n} EGP per day', money: '{n} EGP', budget: 'Daily budget',
    title: 'Plan within budget', generate: 'Make plan', use: 'Use plan',
    short: 'The budget falls short by {n} g of protein.', reduce: 'Reduce protein to {n}', contact: 'Message player',
    kcal: 'Calories', protein: 'Protein', foods: 'Allowed foods', empty: 'No priced foods yet.',
    prices: 'Food prices', platform: 'Platform price', yours: 'Your price', updated: 'Last updated',
    save: 'Save', saved: 'Saved', error: 'Could not load or save. Try again.', retry: 'Try again',
    noBudget: 'The player has not entered a food budget.', shopping: 'Weekly shopping', total: 'Total',
    estimate: 'Prices are estimates. Your coach can update them each month.', share: 'Send list on WhatsApp',
    noItems: 'No priced items', cheaper: 'Cheaper swap', saving: 'Save {n} EGP',
    kg: 'kg', piece: 'piece', pack: 'pack', grams: 'g', breakfast: 'Breakfast', main: 'Main meal', snack: 'Snack',
    close: 'Close', meals: 'Meals per day', food: 'Food', unit: 'Unit', price: 'Price',
  },
});
