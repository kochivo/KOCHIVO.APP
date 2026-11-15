import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    paymentRecorded: "اتسجّلت الدفعة",
    paymentDetail: "{name} · {amount} جنيه",
    packageSaved: "اتحفظت الباقة",
    packageName: "{name}",
    packageDetail: "{name} · {days} يوم",
    sessionPackageDetail: "{name} · {sessions} حصة · {days} يوم",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    paymentRecorded: "سُجّلت الدفعة",
    paymentDetail: "{name} · {amount} جنيه",
    packageSaved: "حُفظت الباقة",
    packageName: "{name}",
    packageDetail: "{name} · {days} يومًا",
    sessionPackageDetail: "{name} · {sessions} حصة · {days} يومًا",
  } as const : undefined; },
  en: {
    paymentRecorded: "Payment recorded",
    paymentDetail: "{name} · EGP {amount}",
    packageSaved: "Package saved",
    packageName: "{name}",
    packageDetail: "{name} · {days} days",
    sessionPackageDetail: "{name} · {sessions} sessions · {days} days",
  },
});
