import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    saved: "اتحفظ النظام",
    name: "{name}",
    assigned: "النظام وصل لـ{name}",
    activated: "النظام وصل للاعب",
    planDetail: "{name} · {calories} سعر",
    added: "اتضاف للوجبة",
    swapped: "اتبدّل الصنف",
    foodDetail: "{name} · {grams} جم",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    saved: "حُفظ النظام",
    name: "{name}",
    assigned: "وصل النظام إلى {name}",
    activated: "وصل النظام إلى اللاعب",
    planDetail: "{name} · {calories} سعرة",
    added: "أُضيف إلى الوجبة",
    swapped: "استُبدل الصنف",
    foodDetail: "{name} · {grams} غ",
  } as const : undefined; },
  en: {
    saved: "Meal plan saved",
    name: "{name}",
    assigned: "Meal plan sent to {name}",
    activated: "Meal plan sent to player",
    planDetail: "{name} · {calories} kcal",
    added: "Added to meal",
    swapped: "Food swapped",
    foodDetail: "{name} · {grams} g",
  },
});
