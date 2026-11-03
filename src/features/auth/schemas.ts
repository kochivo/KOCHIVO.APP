import { z } from 'zod';

const email = z.email('اكتب إيميل مظبوط').trim();
export const passwordSchema = z.string().min(8, 'كلمة السر ٨ حروف على الأقل')
  .regex(/\p{L}/u, 'لازم حرف واحد على الأقل').regex(/[0-9]/, 'لازم رقم واحد على الأقل');
export const emailSchema = z.object({ email: z.string().trim().pipe(email) });
export const signInSchema = emailSchema.extend({ password: z.string().min(1, 'اكتب كلمة السر') });
export const signUpSchema = emailSchema.extend({
  password: passwordSchema, full_name: z.string().trim().min(1, 'اكتب اسمك').max(80, 'الاسم طويل أوي'),
});
export const resetSchema = z.object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { message: 'كلمتين السر مش زي بعض', path: ['confirm'] });
export const otpSchema = emailSchema.extend({ token: z.string().regex(/^[0-9]{6}$/, 'اكتب الكود المكوّن من ٦ أرقام') });
