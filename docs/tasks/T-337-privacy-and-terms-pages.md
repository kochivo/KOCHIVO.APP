# T-337 — Privacy and Terms pages

**Source:** owner request on 2026-11-16. The owner approved the content outline below with one change: **do not name any third-party service or company** (no Supabase, Vercel, Resend, Sentry, Google or Gemini). Describe them only by role.

Owner defaults:
- the name is "KOCHIVO" (كوتشيفو), with no company name;
- contact is the WhatsApp support link already used in the footer (`whatsappUrl` in `src/features/marketing/content.ts`);
- the minimum age is 16.

## Files
- **Routes:** `src/app/[locale]/privacy/page.tsx` and `src/app/[locale]/terms/page.tsx`. Keep them thin: metadata plus rendering the feature component.
- **Feature:** `src/features/marketing/legal/`, with one server component per page (or one shared `LegalPage` with sections), plus `messages.ts` (ar Egyptian, en) and `standard/messages.ts` (arStd), following the marketing feature's existing patterns.
  - Export the components from `src/features/marketing/server.ts` the way `NotFoundPage` is exported.
- **Footer:** `site-footer.tsx`. Turn the two `<span>`s for privacy and terms into links to `/privacy` and `/terms`, respecting the current locale routing used elsewhere on the site. Keep the "© Gym visual" credit exactly as it is.
- **Sitemap:** add `/privacy` and `/terms` for both locales in `src/app/sitemap.ts`.
- **Login and signup:** if the sign-up screen has room for a single short line, add «بالتسجيل إنت موافق على الشروط وسياسة الخصوصية» with both links. Otherwise skip this and say so.

## Rules
- **No client JS.** These pages must be server components that add no client JavaScript (see `src/lib/perf-budget.test.ts`, which checks route budgets). Do not use `next/image` unless the marketing pages already do so without client JS. A plain `<a>` is fine.
- **Design:**
  - Use the dark marketing look and tokens only.
  - Use readable text width (`max-w-prose` or the equivalent token).
  - Each page has one `h1`, with `h2` for each section.
  - Show a "Last updated: 16 November 2026" line.
  - Use logical properties, and keep RTL correct.
  - Add page metadata (title and description) per locale.
- **Copy:**
  - Plain, short sentences. ar is Egyptian but respectful, arStd is plain standard Arabic, en is plain English.
  - No legalese walls and no emoji.
  - Every string lives in the messages files.

## Privacy content (sections, in this order)
1. **Who we are:** KOCHIVO is a platform that connects a coach (captain) with their players for training, nutrition and follow-up.
2. **What we collect:**
   - name, email and profile photo;
   - body data: weight, measurements, progress photos and InBody results;
   - workouts and weights;
   - logged meals;
   - pain and injury reports;
   - form and check-in answers;
   - form-check videos;
   - chat and voice messages with the coach;
   - payment receipt photos;
   - timezone and language;
   - device data needed for notifications.
3. **Why:** so the coach can build your program and follow you up; for reminders and notifications; to keep the service working and to fix errors. We do not sell your data and we show no ads.
4. **Who sees your data:** only your current coach, while you train with them. If you move to another coach, the previous coach sees nothing new.
5. **Service providers:** we use trusted providers for hosting, data storage, sending email, error tracking, sign-in, and the KO smart assistant. They process data only to run the service. Data is stored on servers in the European Union. **Do not name any provider.**
6. **Health data:** we treat it as sensitive and use it only for your training.
7. **Your rights:** see, correct, and delete your data and account. Deletion becomes final after 7 days, and you can cancel it during that time.
8. **Cookies:** only for sign-in, language and timezone. No advertising cookies.
9. **Age:** for ages 16 and over. Anyone younger needs a parent or guardian's consent.
10. **Law:** we follow Egypt's Personal Data Protection Law No. 151 of 2020.
11. **Changes and contact:** we notify you before major changes. Contact is through the WhatsApp support link.

## Terms content (sections, in this order)
1. **The service:** a tool for coaches and players. KOCHIVO itself does not provide coaching.
2. **Not medical advice:** programs and nutrition come from your coach. The KO assistant gives suggestions only. Consult a doctor before training or changing your diet if you have a health condition, and stop if you feel pain.
3. **Your account:** you are responsible for your account and for accurate information. Do not share your account.
4. **Coaches:**
   - they are responsible for their program content and for their relationship with players;
   - they may use player data only for coaching;
   - coach plans: free up to 5 players; paid plans are monthly, do not auto-renew, and are activated after payment.
5. **Payments between player and coach:** made directly between them (for example InstaPay or Vodafone Cash). KOCHIVO is not a party to them and is not responsible for refunds.
6. **Not allowed:** abusive content, impersonation, trying to break or hack the service, and collecting player data for other uses.
7. **Suspension:** we may suspend accounts that break these terms.
8. **Your content:** your photos and videos stay yours; we use them only to run the service. Exercise animations belong to Gym visual.
9. **Liability:** the service is provided "as is". We are not responsible for any injury from training.
10. **Changes:** we notify you before major changes.
11. **Law:** Egyptian law; Cairo courts.

## Tests
- Both routes render in ar, arStd and en with an `h1` and all section headings, and with no third-party company names. Assert that none of these appear: Supabase, Vercel, Resend, Sentry, Google, Gemini.
- The footer links point to the right locale paths, and the Gym visual credit is still present.
- The sitemap includes the new paths.
- The perf-budget test still passes after `npm run build`.

## Gates
`npm run check` and `npm run build`.

## Out of scope
- Cookie banners, consent storage, and any change to the auth flow beyond the optional one-line notice.
