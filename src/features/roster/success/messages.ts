import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    inviteReady: "لينك {name} جاهز",
    package: "{name}",
    customPackage: "{days} يوم",
    customSessions: "{days} حصة",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    inviteReady: "رابط {name} جاهز",
    package: "{name}",
    customPackage: "{days} يومًا",
    customSessions: "{days} حصة",
  } as const : undefined; },
  en: {
    inviteReady: "Invite for {name} is ready",
    package: "{name}",
    customPackage: "{days} days",
    customSessions: "{days} sessions",
  },
});
