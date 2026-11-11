# Arabic styles

`ar` is Egyptian Arabic and remains the default and fallback dictionary.
`arStd` is simple standard Arabic on the same `ar` locale: routes, RTL,
Arabic digits, numbers and units stay unchanged. Missing standard keys fall
back individually to Egyptian Arabic, including plural categories.

Use short, simple standard Arabic as used in Gulf and Levant apps. Avoid
heavy classical forms. Address the user in the masculine singular, as in
the Egyptian dictionary. Keep the brand and English slogan exactly as they
are. Do not add emoji. Exercise names stay English; Check-in stays Check-in.

| Egyptian | Standard |
| --- | --- |
| عاوز | تريد |
| دلوقتي | الآن |
| النهارده | اليوم |
| خلّص | أنهِ |
| سِت | مجموعة |
| إيه | ما |
| مش | لا / ليس |
| كده | هكذا |
| بتاع | الخاص بـ |
| ابعت | أرسل |

Keep every placeholder and plural key from the corresponding Egyptian
string. Do not translate placeholder names. Use complete, natural sentences
instead of mechanically replacing dialect words.

With NEXT_PUBLIC_INTERNATIONAL=1, a manual cookie choice wins over the
profile choice. Otherwise Africa/Cairo in either profile or device timezone,
or ar-EG as the device language, selects Egyptian; other defaults select
standard. With the flag off, always use Egyptian and the original ar/en UI.

The first anonymous request has no device timezone until the browser records
its timezone and language cookies. On that request the server uses the
profile, if available, and the first Accept-Language preference. Device hints
take effect on subsequent requests. A saved manual style is always available
to the server and must be passed unchanged to the client provider.

Run the i18n coverage test to list standard coverage per messages file.
T-184 covers shared UI, infrastructure, marketing, authentication and intake;
player and captain screen translations follow in T-185 and T-186.
