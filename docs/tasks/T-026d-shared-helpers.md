# T-026d — One home for repeated date, number and WhatsApp helpers (CH-04)

**Phase:** 5 · **Depends on:** T-026a/b/c (merged) · **Status:** ready
**Delegate to:** Codex

Read `docs/CODE-HEALTH.md` CH-04 first. Do only the first four rows of its table (week, dates, numbers, WhatsApp). **Skip** the error-code and snapshot-refresh rows.

## Fixes
1. **Saturday week:** one pure `saturdayWeek(today: string): string[]` (7 ISO dates, Saturday first) in `src/lib/dates.ts`. `player-home/week.ts`, `player-preview/week.ts` and `progress/week.ts` use it and keep their own feature logic (trained flags, meal counts).
2. **Arabic dates:** in `src/lib/dates.ts`, add `formatDateAr(date: string, options)` for date-only values (parse as UTC noon, format with `timeZone: 'UTC'`) and `formatTimestampAr(iso: string, options)` for timestamps (format in `Africa/Cairo`). Replace the copies listed in CH-04. Output must stay identical to today for every caller; existing tests prove it, so add tests if a caller had none.
3. **Numbers:** `src/lib/format.ts` with `formatNumber(value: number)`. Keep the current output (`en-US` grouping, Latin digits) so nothing visible changes. Use it in `macro-ring.tsx` and `nutrition-slot.tsx`.
4. **WhatsApp:** `src/lib/whatsapp.ts` with `whatsappUrl({ phone?, text? })`: strip non-digits from the phone, return `null` when a phone was given but has no digits, and return a share-only `https://wa.me/?text=` URL when there is no phone. Replace `waLink`, `whatsappUrl` (player-shell), the suspended screen inline URL, `whatsappShareUrl`, `radarWhatsappUrl` and the marketing URL. The radar must treat a punctuation-only phone as "no phone" (disable the contact), as CH-04 notes.

## Files
`src/lib/dates.ts`, `src/lib/format.ts` (new), `src/lib/whatsapp.ts` (new), the callers named in CH-04 rows 1–4, and tests (`src/lib/*.test.ts` plus any caller test that needs updating).

## Requirements
1. `lib/` imports nothing from `features/`. Behaviour and visible output unchanged, except the radar punctuation-only phone fix.
2. **Do not touch** `supabase/`, `src/core/offline/sync.ts` (another card).
3. Files under 250 lines.

## Acceptance
- [ ] Tests pass.
- [ ] `npm run check` and `npm run build` pass.

## Out of scope
- Error-code helpers, snapshot refresh, generated database types (CH-03)
