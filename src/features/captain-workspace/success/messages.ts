import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    added: "اتضاف للبرنامج",
    exerciseDetail: "{name} · {day}",
    saved: "اتحفظ البرنامج",
    assigned: "البرنامج وصل لـ{name}",
    templateSaved: "اتحفظ القالب",
    replySent: "اتبعت ردك للاعب",
    replyNamed: "اتبعت ردك لـ{name}",
    form: "{name}",
    name: "{name}",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    added: "أُضيف إلى البرنامج",
    exerciseDetail: "{name} · {day}",
    saved: "حُفظ البرنامج",
    assigned: "وصل البرنامج إلى {name}",
    templateSaved: "حُفظ القالب",
    replySent: "أُرسل ردك إلى اللاعب",
    replyNamed: "أُرسل ردك إلى {name}",
    form: "{name}",
    name: "{name}",
  } as const : undefined; },
  en: {
    added: "Added to program",
    exerciseDetail: "{name} · {day}",
    saved: "Program saved",
    assigned: "Program sent to {name}",
    templateSaved: "Template saved",
    replySent: "Reply sent to player",
    replyNamed: "Reply sent to {name}",
    form: "{name}",
    name: "{name}",
  },
});
