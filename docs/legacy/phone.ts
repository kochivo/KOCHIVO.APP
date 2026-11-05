import { z } from "zod";
import { ar as arabic, en } from "./i18n";

// Explicit country code; never guess a country from browser language.
export function normalizePhone(value: string): string {
  let phone = value
    .trim()
    .replace(/[٠-٩۰-۹]/g, (c) =>
      String(c.charCodeAt(0) - (c >= "۰" ? 1776 : 1632)),
    )
    .replace(/[\s().-]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("PHONE_INVALID");
  return phone;
}
export const phoneSchema = z.string().transform((value, ctx) => {
  try {
    return normalizePhone(value);
  } catch {
    ctx.addIssue({ code: "custom", message: "PHONE_INVALID" });
    return z.NEVER;
  }
});
export function passwordIdentity(value: string) {
  const input = value.trim();
  return input.includes("@")
    ? { email: input }
    : { phone: normalizePhone(input) };
}
export function phoneMessage(code: string, ar: boolean) {
  const t = ar ? arabic : en;
  const inviteMessages: Record<string, string> = {
    INVITE_DECLINED: t.inviteDeclinedNotice,
    INVITE_REVOKED: t.inviteRevokedNotice,
    INVITE_EXPIRED: ar
      ? "صلاحية الدعوة خلصت. اطلب رابط جديد من الكابتن."
      : "This invitation expired. Ask your coach for a new one.",
    INVITE_USED: ar
      ? "الدعوة دي اتستخدمت قبل كده."
      : "This invitation has already been used.",
    INVITE_INVALID: ar
      ? "الدعوة مش متاحة. تواصل مع الكابتن عشان يبعت دعوة جديدة."
      : "This invitation is unavailable. Contact your coach for a new one.",
  };
  if (inviteMessages[code]) return inviteMessages[code];
  const messages: Record<string, [string, string]> = {
    REJOIN_SIGN_IN_FAILED: [
      "Use the existing password for this athlete account. No new account was created.",
      "اكتب كلمة سر حساب اللاعب الموجودة بالفعل. مفيش حساب جديد اتعمل.",
    ],
    INVITE_EXISTS: [
      "You already have an invitation for this athlete. Use the existing record or delete it before creating another.",
      "في دعوة موجودة للاعب ده عندك بالفعل. راجع الدعوة القديمة، أو احذفها الأول قبل ما تعمل واحدة جديدة.",
    ],
    INVITATIONS_UNAVAILABLE: [
      "Unable to check existing invitations. Try again later.",
      "مش قادرين نراجع الدعوات الموجودة دلوقتي. جرّب بعد شوية.",
    ],
    audience_mismatch: [
      "This workspace audience does not match your declared gender. Contact your coach.",
      "جمهور المساحة لا يتوافق مع النوع المحدد. تواصل مع الكابتن.",
    ],
    SIGN_OUT_FIRST: [
      "Sign out of your current account, then open this invitation again.",
      "سجل الخروج من حسابك الحالي، ثم افتح الدعوة مرة أخرى.",
    ],
    PHONE_INVALID: [
      "Use an international phone number, e.g. +201100000000.",
      "اكتب الرقم بالصيغة الدولية، مثل ‎+201100000000.",
    ],
    PHONE_TAKEN: [
      "This phone is already registered or has a pending invitation.",
      "الرقم مسجل بالفعل أو له دعوة معلقة.",
    ],
    INVITE_UNAVAILABLE: [
      "This invitation is used, expired or unavailable. Ask your coach for a new link.",
      "الدعوة مستخدمة أو منتهية أو غير متاحة. اطلب رابطًا جديدًا من الكابتن.",
    ],
    ACTIVATION_UNAVAILABLE: [
      "Activation is not configured yet. Please contact your coach.",
      "تفعيل الحساب غير مجهز بعد. تواصل مع الكابتن.",
    ],
    ACTIVATION_FAILED: [
      "Could not activate. Check your details or sign in if already activated.",
      "تعذر التفعيل. راجع البيانات أو سجل الدخول لو فعلت الحساب بالفعل.",
    ],
  };
  return (messages[code] ?? messages.ACTIVATION_FAILED)[ar ? 1 : 0];
}
