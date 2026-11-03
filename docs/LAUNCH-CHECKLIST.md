# قبل الإطلاق — المطلوب من صاحب المشروع

كل خطوة هنا محتاجة حاجة سرية أو حساب، فبتتعمل منك إنت مش من Claude.
ماتبعتش أي مفتاح سري في الشات.

## 1. تحميل التمارين والأكل (الـ seed)

لازم يتعمل قبل أول كابتن يسجّل، عشان المكتبة تبقى مليانة.

1. افتح Supabase ← Project `hkgaercmtdmoksrhzcya` ← Project Settings ← API Keys، وانسخ الـ **service_role** key.
2. افتح تيرمينال جديد في فولدر المشروع، واكتب (PowerShell):
   ```powershell
   $env:SUPABASE_URL = "https://hkgaercmtdmoksrhzcya.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY = "<الصق المفتاح هنا>"
   npm run seed -- --dry-run
   ```
   الـ dry-run بيتأكد إن كل حاجة سليمة من غير ما يكتب في الداتابيز.
3. لو مفيش أخطاء، شغّله من غير `--dry-run`:
   ```powershell
   npm run seed
   ```
4. اقفل التيرمينال بعدها، عشان المفتاح يتمسح من الذاكرة.
5. قول لـ Claude «الـ seed خلص»، وهو هيتأكد من العدد في الداتابيز.

## 2. Cloudflare Turnstile (حماية الديمو من البوتات)

1. Cloudflare ← Turnstile ← Add site. الدومين `kochivo.site`.
2. هتاخد مفتاحين:
   - **Site key**: مش سري. ابعته لـ Claude، أو حطه في إعدادات الاستضافة باسم `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
   - **Secret key**: سري. حطه بنفسك في Supabase ← Authentication ← Attack Protection ← Captcha (اختار Turnstile).
3. من غير الخطوة دي الديمو شغال، بس من غير حماية من البوتات.

## 3. الرفع (deploy)

1. اعمل push للـ master على GitHub بنفسك (Claude مش بيعمل push).
2. في إعدادات الاستضافة حط:
   - `NEXT_PUBLIC_SUPABASE_URL` و `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (من Supabase ← API Keys، الـ publishable مش السري)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (لو عملت خطوة 2)
3. في Supabase ← Authentication ← URL Configuration اتأكد إن `https://kochivo.site` موجود في Site URL و Redirect URLs.

## 4. حساب الأدمن

1. بعد الرفع، سجّل حساب كابتن عادي من الموقع بإيميلك.
2. قول لـ Claude «سجّلت»، وهو هيديك صلاحية الأدمن من الداتابيز.

## 5. تجربة من موبايلك (على https)

- افتح الموقع من الآيفون والأندرويد، وجرّب: الدخول، والديمو، وتسجيل سِت في التمرين.
- اقفل النت وجرّب تسجّل سِت: لازم يتحفظ ويتبعت لما النت يرجع.
- على الآيفون: اضغط على أي خانة، ولازم الكيبورد مايغطيش الخانة والشاشة ماتعملش zoom.
- «إضافة للشاشة الرئيسية» وافتح التطبيق منها.
- لو لقيت أي حاجة غريبة، صوّرها وابعتها.

## 6. التجربة الحقيقية (T-016)

كابتن واحد و5 لاعبين لمدة أسبوع في الجيم. ابعت أي ملاحظة أول بأول.
