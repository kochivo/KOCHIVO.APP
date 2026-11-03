# KOCHIVO — هوية المشروع

المصدر: `Desktop/brand-kit-2026-10-26` (نسخة 26 أكتوبر 2026). الاسم: **KOCHIVO** · الجملة: **COACH BETTER**.

## الألوان (مصدرها الوحيد: `tokens/palette.css`)

| الاستخدام | Token | HEX |
|---|---|---|
| الخلفية | `--kochivo-background` | `#101418` |
| الأسطح / الكروت | `--kochivo-surface` | `#1B2026` |
| الحدود | `--kochivo-border` | `#2A3038` |
| النص الأساسي | `--kochivo-text` | `#F2F2EE` |
| النص الثانوي | `--kochivo-secondary` | `#9AA0A6` |
| اللون المميز (Lime) | `--kochivo-accent` | `#B6E94F` |

النص فوق الـ Lime يكون بلون الخلفية `#101418`، مش أبيض.

## اللوجو

| الاستخدام | الملف |
|---|---|
| الهيدر / شاشة الدخول | `svg/logo-primary.svg` |
| مساحات ضيقة | `svg/logo-compact.svg` |
| الرمز لوحده | `svg/icon.svg` |
| أيقونة PWA | `png/app-icon-black-192.png`, `-512.png`, `app-icon-maskable-512.png` |
| Favicon | `svg/favicon.svg`, `png/favicon-32.png` |

ملفات الـ SVG فيها الرمز كصورة PNG مدمجة (~290KB للملف)، فهي تقيلة على الويب. في التطبيق نستخدم نسخ الـ PNG للأحجام الصغيرة.

## الشعار (Slogan)

- **YOUR NEXT MOVE STARTS HERE**، ومعناه بالعربي: "خطوتك الجاية بتبدأ من هنا".
- بيتكتب بـ Manrope 800، وحروفه كلها capital.
  - "MOVE" بحروف مفرغة (outline).
  - "STARTS HERE" بالليموني.
- مكانه أول الصفحة العامة، والجملة العربي تحته.

## الخطوط

- لاتيني: **Manrope** (800 للعناوين، 500 للنص) — `fonts/Manrope-Latin-Variable.woff2`.
- عربي: **Alexandria** من Google Fonts (variable من 100 لـ 900). الكيت مفيهوش خط عربي، و Manrope مفيهوش حروف عربي. اخترنا Alexandria لأنه هندسي وتقيل في العناوين والأرقام، وده مناسب لروح رياضية، وكمان واضح في النص الصغير. اتعمل بديل لـ IBM Plex Sans Arabic اللي كان باهت في العناوين.
- عربي للعناوين والأزرار: **Changa** (500–800). خط رياضي مضغوط شوية وفيه طاقة، وده بيدي إحساس القوة اللي محتاجينه في الجيم. بيتطبّق على `h1` و `h2` و `h3` والأزرار، أو بكلاس `font-display`.
- الترتيب: Manrope الأول للحروف اللاتيني والأرقام. بعده Changa في العناوين، و Alexandria في النص.
