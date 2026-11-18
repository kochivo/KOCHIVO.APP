import { arStd } from './standard/messages';

export const messages = {
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    selectAtLeastOne: "اختار إجابة واحدة على الأقل",
    send:'اطلب تقييم', pick:'اختار تقييم', due:'آخر ميعاد (اختياري)', cancel:'إلغاء', sending:'بنبعت', sent:'التقييم اتبعت',
    photoFitError:'الصورة لسه أكبر من 5 ميجا أو مش مدعومة بعد التصغير. اختار صورة أصغر بصيغة JPG أو PNG أو WebP.',
    error:'الحفظ مكملش. إجاباتك لسه موجودة؛ اتأكد من النت وجرّب تاني.', retry:'جرّب تاني', loading:'بنحمّل التقييم',
    next:'التالي', previous:'السابق', finish:'ابعت الإجابات', submitting:'بنبعت إجاباتك', done:'إجاباتك اتبعتت للكابتن',
    home:'ارجع للرئيسية', pending:'تقييمات مستنية ردك', empty:'مفيش تقييمات متاحة', remind:'فكّره', reminded:'اتعمل تذكير',
    review:'اتراجع وابعت', reply:'ردك للاعب', savedPhotos:'الصور اترفعت', required:'جاوب السؤال الأول', reviewed:'التقييم اتراجع',
    photosError:'الصور مترفعتش. اختارها تاني لما النت يرجع.', photo:'صورة التقييم', pendingAnswer:'مستني رد اللاعب',
    upload:'بنرفع الصور', unavailable:'التقييم مش متاح دلوقتي', back:'ارجع', close:'اقفل', noAnswers:'مفيش إجابات',
    alert:'إجابة محتاجة اهتمام', offline:'إنت مش متصل بالنت. إجاباتك محفوظة هنا؛ اتصل وجرّب تاني.',
  },
  en: {
    selectAtLeastOne: "Select at least one",
    send:'Request assessment', pick:'Choose an assessment', due:'Due date (optional)', cancel:'Cancel', sending:'Sending', sent:'Assessment requested',
    photoFitError:'The resized photo is still over 5 MB or unsupported. Choose a smaller JPG, PNG or WebP image.',
    error:'Could not save. Your answers are still here. Check your connection and retry.', retry:'Retry', loading:'Loading assessment',
    next:'Next', previous:'Previous', finish:'Send answers', submitting:'Sending answers', done:'Answers sent to your captain',
    home:'Back to home', pending:'Assessments waiting for you', empty:'No assessments available', remind:'Remind', reminded:'Reminder sent',
    review:'Review and send', reply:'Reply to player', savedPhotos:'Photos uploaded', required:'Answer this question first', reviewed:'Assessment reviewed',
    photosError:'Photos could not upload. Choose them again when connected.', photo:'Assessment photo', pendingAnswer:'Waiting for player',
    upload:'Uploading photos', unavailable:'Assessment unavailable', back:'Back', close:'Close', noAnswers:'No answers',
    alert:'Answer needs attention', offline:'You are offline. Your answers are saved here. Connect and retry.',
  },
};
