import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    addKOCHIVOToYourPhone: "نزّل KOCHIVO على موبايلك",
    worksOfflineAndOpensFaster: "بيشتغل أوفلاين وبيفتح أسرع",
    tapShare: "اضغط على زرار المشاركة",
    chooseAddToHomeScreen: "اختار إضافة للشاشة الرئيسية",
    tapAdd: "اضغط إضافة",
    installationFailedTryAgain: "التثبيت ماكملش. جرّب تاني",
    installing: "جاري التثبيت",
    installApp: "ثبّت التطبيق",
    notNow: "مش دلوقتي",
    downloadApp: "تنزيل التطبيق",
    installOnIphone: "نزّل KOCHIVO على الآيفون",
    close: "اقفل",
  },
  en: {
    addKOCHIVOToYourPhone: "Add KOCHIVO to your phone",
    worksOfflineAndOpensFaster: "Works offline and opens faster",
    tapShare: "Tap Share",
    chooseAddToHomeScreen: "Choose Add to Home Screen",
    tapAdd: "Tap Add",
    installationFailedTryAgain: "Installation failed. Try again",
    installing: "Installing",
    installApp: "Install app",
    notNow: "Not now",
    downloadApp: "Download app",
    installOnIphone: "Install KOCHIVO on iPhone",
    close: "Close",
  },
});
