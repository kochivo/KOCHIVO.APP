import { readError } from '@/core/supabase/errors';

const messages: Record<string, string> = {
  invalid_credentials: 'الإيميل أو كلمة السر مش مظبوطين',
  user_not_found: 'الإيميل أو كلمة السر مش مظبوطين',
  email_not_confirmed: 'أكد إيميلك الأول من الرسالة اللي وصلتك',
  otp_expired: 'الكود انتهى أو مش مظبوط، ابعت كود جديد',
  over_email_send_rate_limit: 'استنى شوية وجرّب تاني',
  over_request_rate_limit: 'استنى شوية وجرّب تاني',
  weak_password: 'اختار كلمة سر أقوى فيها حروف وأرقام',
  same_password: 'اختار كلمة سر مختلفة',
  user_already_exists: 'جرّب تدخل بحسابك أو غيّر كلمة السر',
  '42501': 'الحساب ده مش مسموح له بالخطوة دي',
  P0002: 'الدعوة مش صالحة أو انتهت',
  '23505': 'حسابك مربوط بكابتن بالفعل',
};
export function authError(error: unknown): string {
  const code = String(readError(error).code ?? '');
  return messages[code] ?? 'حصلت مشكلة، جرّب تاني';
}
