import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    paymentRecorded: "اتسجّلت الدفعة",
    paymentDetail: "{name} · {amount} جنيه",
    packageSaved: "اتحفظت الباقة",
    packageName: "{name}",
    'packageDetail.one': "{name} · يوم واحد",
    'packageDetail.two': "{name} · يومين",
    'packageDetail.few': "{name} · {days} أيام",
    'packageDetail.many': "{name} · {days} يوم",
    'packageDetail.other': "{name} · {days} يوم",
    sessionPackageDetail: "{name} · {sessions} · {days}", 'sessionPackageDetailDays.one': "يوم واحد", 'sessionPackageDetailDays.two': "يومين", 'sessionPackageDetailDays.few': "{days} أيام", 'sessionPackageDetailDays.many': "{days} يوم", 'sessionPackageDetailDays.other': "{days} يوم", 'sessionPackageDetailSessions.one': "حصة واحدة", 'sessionPackageDetailSessions.two': "حصتين", 'sessionPackageDetailSessions.few': "{sessions} حصص", 'sessionPackageDetailSessions.many': "{sessions} حصة", 'sessionPackageDetailSessions.other': "{sessions} حصة",
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    paymentRecorded: "سُجّلت الدفعة",
    paymentDetail: "{name} · {amount} جنيه",
    packageSaved: "حُفظت الباقة",
    packageName: "{name}",
    'packageDetail.one': "{name} · يوم واحد",
    'packageDetail.two': "{name} · يومين",
    'packageDetail.few': "{name} · {days} أيام",
    'packageDetail.many': "{name} · {days} يومًا",
    'packageDetail.other': "{name} · {days} يومًا",
    sessionPackageDetail: "{name} · {sessions} · {days}", 'sessionPackageDetailDays.one': "يوم واحد", 'sessionPackageDetailDays.two': "يومان", 'sessionPackageDetailDays.few': "{days} أيام", 'sessionPackageDetailDays.many': "{days} يومًا", 'sessionPackageDetailDays.other': "{days} يوم", 'sessionPackageDetailSessions.one': "حصة واحدة", 'sessionPackageDetailSessions.two': "حصتان", 'sessionPackageDetailSessions.few': "{sessions} حصص", 'sessionPackageDetailSessions.many': "{sessions} حصة", 'sessionPackageDetailSessions.other': "{sessions} حصة",
  } as const : undefined; },
  en: {
    paymentRecorded: "Payment recorded",
    paymentDetail: "{name} · EGP {amount}",
    packageSaved: "Package saved",
    packageName: "{name}",
    'packageDetail.one': "{name} · {days} day",
    'packageDetail.other': "{name} · {days} days",
    sessionPackageDetail: "{name} · {sessions} · {days}", 'sessionPackageDetailDays.one': "{days} day", 'sessionPackageDetailDays.other': "{days} days", 'sessionPackageDetailSessions.one': "{sessions} session", 'sessionPackageDetailSessions.other': "{sessions} sessions",
  },
});
