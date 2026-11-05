# T-079 — InBody scans: player hub and coach analytics

**Phase:** V1 · **Status:** ready (owner request 2026-11-05: an "InBody transformation" area for the player and the coach)

## Goal
- The player logs InBody results (weight, muscle mass, body fat %) with a photo or PDF of the printed scan.
- They see their progress at a glance.
- The coach sees the totals since the first scan, gets warnings, and can compare the first and latest scan side by side.

## Today
- The weekly check-in (`check_ins`) holds weight, waist, `body_fat_pct` (0048) and pose photos (private bucket `checkin-photos`, signed URLs).
- There is no muscle mass and no scan document.
- Progress UI: `src/features/progress` (player `/player/progress`). Coach player profile: `src/features/player-profile`.

## Data — `supabase/migrations/0058_body_scans.sql`
- **Table `public.body_scans`:**
  - columns:
    - `id uuid pk`
    - `player_id uuid → profiles on delete cascade default auth.uid()`
    - `scan_date date not null` (≤ today, Cairo)
    - `weight_kg numeric(5,1)` (20–400)
    - `muscle_kg numeric(4,1)` (5–150)
    - `fat_pct numeric(4,1)` (3–70)
    - `file_path text` (≤ 300, must start with `<player_id>/`)
    - `created_at`
  - at least one of the three numbers is required
  - unique `(player_id, scan_date)`
- **RLS:**
  - The player selects, inserts, updates and deletes their own rows.
  - The player's **active** coach (same rule as `check_ins` reads) selects only.
  - Plus the restrictive `active_caller` policy, as on other tables.
- **Storage:** private bucket `body-scans`.
  - 5 MB, `image/jpeg`, `image/webp`, `application/pdf`.
  - Path `<uid>/<uuidv7>.<ext>`.
  - The owner inserts, reads and deletes; their active coach reads.
  - No public access. Reads go through signed URLs (60 min), like check-in photos.
- **PGlite test** `supabase/tests/body-scans.test.ts`: owner CRUD; coach read only; another coach and anon get nothing; ranges; the path prefix.
- Hand-edit `src/types/database.ts`.

## Feature — `src/features/body-scans/`
- **`deltas.ts` (pure)**, given the scans sorted by date:
  - `latestDelta`: last vs previous
  - `totalDelta`: first vs latest
  - `trend` per metric:
    - muscle up = good, fat down = good
    - weight is neutral, judged by the player's goal from `player_intake` when available
  - `alerts(now)`:
    - `overdue` when the latest scan is > 30 days old, or there are none
    - `regressing` when the latest delta has muscle down **and** fat up, or fat up ≥ 1.0 point
  - Full unit tests with injected `now`.
- **Player screen**, as a section on `/player/progress` (lazy, like `AnalyticsLoader`):
  - Three glass-strong cards: weight, muscle, fat %, each with its last delta.
    - Good change: lime with an arrow and a short plain line (e.g. «+1.5 كجم عضل»).
    - Bad change: muted/warn.
    - No emoji.
  - "Add scan" bottom sheet: date (default today), the three numbers with steppers or inputs, and an optional file.
    - Images go through `compressImage` with the JPEG fallback (see `settings/data/captain-avatar.ts`).
    - PDFs are uploaded as they are, ≤ 5 MB.
    - The write goes through Supabase directly (not `saveAndQueue`: an upload needs the network). Show a clear offline message.
  - History: a vertical timeline, newest first.
    - Each item shows the scan's thumbnail **blurred by default** with a «اضغط للعرض» ("tap to show") button that reveals it. PDFs show a file chip that opens the signed URL.
    - Delete own scan, with a confirm.
  - Empty, loading and error states.
- **Coach view:** a section in the player profile (`player-profile` screen), lazy.
  - KPIs: total muscle change, total fat % change, and weight change since the first scan.
  - Alert cards from `alerts()`: «محتاج InBody جديد» ("needs a new InBody") when overdue, «راجع الأكل أو التمرين» ("review the diet or training") when regressing.
  - Side-by-side compare: the first vs latest scan file, blurred until tapped, with the date under each. PDF → file chip.
- Exports through `index.ts` only. Strings in `messages.ts` (Egyptian Arabic + English). Tokens only (`bg-lime`, `text-muted`, `glass`, `glass-strong`), logical RTL, `lucide-react` icons with translated `aria-label`s, ≥ 48 px targets.

## Out of scope
- The onboarding wizard (a separate card adds an optional baseline step later).
- Weekly check-ins.
- OCR of the scan paper.

## Requirements
- No new dependencies. Files ≤ 250 lines. No hex in components.
- Perf budgets unchanged: player 300, captain 310 KB. Both sections must be lazy (`next/dynamic`).

## Acceptance
- [ ] The player adds a scan with a photo or PDF, sees the deltas, and reveals blurred images on tap.
- [ ] The coach sees the totals, the alerts, and the first-vs-latest compare. Another coach can't read anything (RLS test).
- [ ] All gates pass: `npx tsc --noEmit -p .`, `npx eslint .`, `npx vitest run --maxWorkers=2`, `npm run build`, perf budget.
