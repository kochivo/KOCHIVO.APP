import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    saved: "اتحفظ القالب",
    name: "{name}",
    programAssigned: "البرنامج وصل لـ{name}",
    mealAssigned: "النظام وصل لـ{name}",
    mealDetail: "{name} · {calories} سعر",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    saved: "حُفظ القالب",
    name: "{name}",
    programAssigned: "وصل البرنامج إلى {name}",
    mealAssigned: "وصل النظام إلى {name}",
    mealDetail: "{name} · {calories} سعرة",
  } as const : undefined; },
  en: {
    saved: "Template saved",
    name: "{name}",
    programAssigned: "Program sent to {name}",
    mealAssigned: "Meal plan sent to {name}",
    mealDetail: "{name} · {calories} kcal",
  },
});
