import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    added: "اتضاف للبرنامج",
    exerciseDetail: "{name} · {day}",
    saved: "اتحفظ البرنامج",
    assigned: "البرنامج وصل لـ{name}",
    activated: "البرنامج وصل للاعب",
    name: "{name}",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    added: "أُضيف إلى البرنامج",
    exerciseDetail: "{name} · {day}",
    saved: "حُفظ البرنامج",
    assigned: "وصل البرنامج إلى {name}",
    activated: "وصل البرنامج إلى اللاعب",
    name: "{name}",
  } as const : undefined; },
  en: {
    added: "Added to program",
    exerciseDetail: "{name} · {day}",
    saved: "Program saved",
    assigned: "Program sent to {name}",
    activated: "Program sent to player",
    name: "{name}",
  },
});
