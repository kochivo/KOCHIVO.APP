# T-205: Bug fixes and one consistent language across the captain app

**Phase:** v6 owner review round 2 (owner approved 2026-11-12) · **Status:** ready · **Depends on:** none · **Migration:** none
**Flag:** sidebar changes behind `captainWorkspaceEnabled()`; flag off byte-identical. **Messages:** `ar` (Egyptian), `arStd` (docs/I18N-STYLE.md), `en`.
**Rules:** AGENTS.md in full. Tokens only, logical properties, ≥48px targets, 250 lines/file, no new deps, no Get-Content/Set-Content on text files, no commits.

## Files
- `src/features/roster/nav.ts` and its tests.
- `src/features/templates/`, for library loading only.
- The password-reset email template. Find it under `src/` or `supabase/templates/`. If it only exists in the Supabase dashboard, stop and write the Arabic HTML into this card for the reviewer.
- The feedback floating button component.
- Message files for the strings below, inside the files you own.
- Do NOT edit `src/features/inbox/`, `forms/`, `dashboard/`, `billing/`, `settings/`, `meal-plans/` or `captain-workspace/training/`. Other cards own them. If a string there needs changing, list it under Notes.

## Requirements
1. **Templates page shows «القوالب متحملتش».**
   - Reproduce the failure, find the cause, fix it and add a test.
   - The text also says «جرّب تاني» twice, once in the message and once on the button. The message becomes «القوالب متحملتش» only.
2. **Sidebar (flag on)** must read exactly:

   | Section | Items |
   |---|---|
   | (none) | الرئيسية, اللاعبين, المتابعة (badge = waiting count) |
   | التمرين | خطط التمارين |
   | الأكل (once) | الأنظمة الغذائية, مكتبة الأكلات |
   | الإدارة | التقييمات, الدفعات, الإعدادات |

   - The old «المهام» route keeps working, but its label becomes «المتابعة».
   - Each item gets its own lucide icon. No three identical book icons.
   - Labels are the same on every page. Remove the variants «الطعام», «مكتبة الأطعمة» and «اللاعبون».
3. **Password-reset email.** Write it in Egyptian Arabic, RTL, with the KOCHIVO name. Add an English fallback by user locale if the template system supports it.
4. **Feedback floating button.** It must not cover content.
   - Desktop: reserve space for it, or move it into the sidebar footer.
   - Mobile: keep it above the bottom nav.
5. **Language sweep** in the files you own:
   - Standard-Arabic phrases in `ar` become Egyptian. Examples: «لا توجد بيانات بعد», «حاول مجدداً», «أضف طعاماً», «يحتاج إلى متابعة».
   - `arStd` keeps the standard wording.
   - Currency «ج.م» becomes «جنيه».

## Acceptance
- [ ] Templates load.
- [ ] The sidebar is identical on all captain pages.
- [ ] The email renders as RTL Arabic.
- [ ] The feedback button never overlaps content at 1440×900 or 390×844.
- [ ] Tests for nav labels, icons and badge, and for the templates load path.
- [ ] `npm run check` and `npm run build` pass; summary lines pasted.

## Password-reset email handoff

The reviewer handles the hosted email item; all other items continue locally.
There is no `supabase/templates/` directory or reset-email HTML under
`src/`. `src/features/auth/data/request-reset.ts` calls
`auth.resetPasswordForEmail(email)`; `supabase/config.toml` does not configure a
local recovery template. The hosted template cannot be inspected from this
checkout. The reviewer must verify the hosted recovery template and install the
following Egyptian Arabic HTML there, or provide an in-scope local template.

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>غيّر كلمة السر في KOCHIVO</title>
  </head>
  <body dir="rtl" style="font-family: Arial, sans-serif; text-align: start; line-height: 1.8; margin: 0; padding: 24px;">
    <main>
      <h1><bdi dir="ltr">KOCHIVO</bdi></h1>
      <h2>غيّر كلمة السر</h2>
      <p>وصلنا طلب لتغيير كلمة السر بتاعة حسابك في KOCHIVO.</p>
      <p>اضغط على الزر ده واختار كلمة سر جديدة.</p>
      <p><a href="{{ .ConfirmationURL }}" style="display: inline-block; min-height: 48px; line-height: 48px; padding-inline: 24px;">غيّر كلمة السر</a></p>
      <p>لو إنت مطلبتش تغيير كلمة السر، تجاهل الرسالة دي. حسابك هيفضل زي ما هو.</p>
    </main>
  </body>
</html>
```

Suggested subject: `غيّر كلمة السر في KOCHIVO`.
English locale fallback is pending inspection of the hosted template system and
the actual locale metadata; no unverified metadata condition is included.
Preview the hosted email and verify its recovery link before enabling it.

## Implementation plan and feature inventory

1. Reproduce library loading against the recursive relationship response; replace
   the recursive embed with a template read and batched assignment-usage read.
   Keep authentication, ownership filters, starter/custom templates, titles,
   day/meal counts, metadata, usage, archives, empty/loading/error/retry states.
2. Match the card's navigation table under the workspace flag. Preserve all nine
   destinations, active states, the old inbox route, mobile destinations and
   flag-off output. Give every item a distinct icon and show the existing roster
   inbox's pending check-in, form-check, answered-assessment and join-request
   counts on Follow-up in the shared shell, using the same existing queries/RPC.
3. Put desktop feedback in the sidebar footer and reserve mobile bottom space.
   Keep its translated accessible label, lazy sheet, submission and error states.
4. Sweep owned messages in Egyptian, standard Arabic and English; retain standard
   prose while using the card's exact common navigation names. Keep one retry
   instruction on the retry button.
5. Run regression tests and the required check/build gates; compare both requested
   viewport sizes where browser execution is available.

Existing library actions remain in `templates-screen.tsx` and its child sheets:
create/open, search, level filters, preview, assignment (including multiple
players), copy, rename, delete, archive/restore and generator under Tools.
Training cards retain title, days, level, duration, equipment and distinct-player
usage; nutrition rows retain meals, protein and training/rest split. These
elements use the existing v6 library design; this card changes only loading and
owned wording. Feedback remains available on mobile above the bottom navigation.

## Root causes and verification notes

- Templates: the recursive `copies:programs!programs_source_template_id_fkey`
  and nutrition equivalent are not resolvable relationships in PostgREST.
  Read-only API requests with a publishable key and `limit=0` reproduced HTTP
  400 / `PGRST200` for both old selects. The replacement selects reach the
  expected anonymous permission denial instead, proving the relationship error
  is removed without reading user rows. Authenticated loading is covered by
  deterministic loader tests; a live captain browser session remains unverified.
  Assignment usage is batched and paginated, never queried per template.
- Retry text: the error dictionary contained the same instruction as the button.
  Egyptian, standard Arabic and English load errors now contain no retry text.
- Sidebar: per-item food headings repeated the section, three library items
  shared a book icon, standard names differed, and no pending badge was wired.
  The shared navigation now follows this card's table; the badge mirrors all
  four existing inbox sources and refreshes through `useResource`. Flag-off
  navigation remains unchanged.
- Feedback: fixed desktop positioning put the button over page content. Captain
  feedback now participates in sidebar footer layout. Mobile stays above the
  bottom nav with an extra four rem of content clearance. Player placement is
  preserved.
- Language: Egyptian progress messages still used formal Arabic phrasing.
  Owned progress messages now use Egyptian wording; standard prose is retained.
  No currency abbreviations were found in the owned message files.

### Notes for reviewer

- Browser and Next development-server startup both fail with `spawn EPERM` in
  this sandbox. Visual parity at 1440×900 and 390×844 is not certified.
- The card's names supersede the older mockup's «المهام», «التمارين» and
  «المتابعة» section heading. Existing shell dimensions, library cards, menus,
  filters, data and actions are retained; this is not a screen redesign.
- Outside scope: `dashboard/workspace-messages.ts` and its standard counterpart,
  and `billing/workspace/messages.ts` / `standard-messages.ts` still use «ج.م».
  `meal-plans/components/library/standard/messages.ts` still uses «مكتبة الأطعمة»;
  `meal-plans/components/editor/workspace/standard-messages.ts` uses «اللاعبون»
  and «الطعام». Their owning cards must reconcile those strings.
- The Arabic email above remains a dashboard handoff; the reviewer installs and
  previews it and determines whether the hosted system supports English locale
  fallback. No hosted configuration or database schema was changed.

### Check results

- `npm run check`: typecheck and lint pass; release audit stops with
  `Error: spawnSync git EPERM` before the full test command.
- `npm run build` with the workspace flag enabled: `Compiled successfully in
  40s`, then `spawn EPERM` when starting the TypeScript worker.
- Fallback `npx tsc --noEmit -p .`: exit 0.
- Fallback `npx eslint .`: exit 0.
- Fallback Vitest for roster, templates and feedback with `--maxWorkers=2
  --configLoader native --pool=threads`: `Test Files 37 passed (37)`;
  `Tests 265 passed (265)`.
- Read-only code review: no remaining actionable findings after correcting the
  full pending-count sources and retaining player feedback placement.
