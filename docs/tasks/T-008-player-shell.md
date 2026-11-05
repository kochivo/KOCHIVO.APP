# T-008 — Player shell: one bottom nav, offline banner, subscription ended, «الكابتن» screen

**Phase:** 2 · **Depends on:** T-005, T-007 (merged) · **Status:** ready
**Delegate to:** Codex

## Goal
Every player screen shares one shell. It has:
- a single bottom nav that marks the right tab as active on its own
- an offline banner
- a clear banner when the subscription has ended or the captain archived the player

There is also a new «الكابتن» tab that shows who the captain is, when the subscription ends, and a WhatsApp button.

Mockup boards: **PlayerHome** (nav) and **PlayerEmpty** (`docs/mockups/PlayerEmpty.dc.html`, the empty and ended states).

## Today
`home-screen.tsx` and `nutrition-screen.tsx` each define their own copy of the same 4 nav items and render `BottomNav` with a hard-coded `active`. `/player/progress` (another task, T-013) and `/player/captain` (this task) will also need the nav. There is no `(player)` layout yet.

## Files
- `src/features/player-shell/` (new):
  - `index.ts`
  - `nav.ts` (pure):
    - `playerNav(pathname)` returns the 4 items (الرئيسية `/player`, التغذية `/player/nutrition`, التطور `/player/progress`, الكابتن `/player/captain`, with the same lucide icons used today). The active item is the longest matching prefix, and `/player` is active only on exact match.
    - `showsNav(pathname)` is false for `/player/workout/*` (focus mode) and `/player/onboarding`.
  - `access.ts` (pure): `accessState({ accessUntil, archivedAt, today })` returns `'active' | 'ending' | 'ended' | 'archived'`. It is `ending` when ≤ 3 days are left. Use string date comparison on `YYYY-MM-DD` and take `today` as a parameter.
  - `data/my-captain.ts`: a `'use server'` action `fetchMyCaptain()`. It reads the caller's own `coach_clients` row (`access_until`, `archived_at`, `started_on`, and `captain_id`, through the existing player-select policy) and the captain's `profiles` (`full_name`, `phone`, through `profiles_select_my_captain`). It returns `{ data }`, `{ data: null }` when there is no row, or `{ error }`.
  - `hooks/use-my-captain.ts`:
    - calls `fetchMyCaptain` on mount and when the browser comes back online
    - caches the last good result in `localStorage` under `kochivo.my-captain`: only `fullName`, `phone`, `accessUntil`, and `archivedAt`, never health data. Wrap every read and write in try/catch.
    - offline, it serves the cache
  - `hooks/use-online.ts`: `navigator.onLine` plus the `online` and `offline` events (SSR-safe)
  - `components/player-shell.tsx` (client):
    - renders `children`
    - an offline banner «إنت أوفلاين. اللي بتسجله محفوظ وهيتبعت لما النت يرجع»
    - an access banner:
      - ending: «اشتراكك هيخلص بعد {n} أيام»
      - ended: «اشتراكك خلص. كلّم الكابتن عشان تجدد»
      - archived: «الكابتن وقف متابعتك»
    - The ended and archived banners include a WhatsApp link button when the captain has a phone.
    - `BottomNav` from `@/ui`, using `playerNav(usePathname())`, only when `showsNav`
  - `components/captain-screen.tsx`:
    - header «CAPTAIN · الكابتن»
    - the captain's initial and name
    - «مشترك من {date}» and «لحد {date}» (`ar-EG`, `timeZone: 'UTC'`, like the roster)
    - a status tag from `accessState`
    - one lime «كلّم الكابتن واتساب» button: `https://wa.me/{digits}` with an Arabic `aria-label`, opened in a new tab with `rel="noopener noreferrer"`. It is disabled with «الكابتن لسه محطش رقمه» when there is no phone.
    - States: loading, error with retry, and no captain «إنت مش متابع مع كابتن دلوقتي».
  - `player-shell.test.ts`
- `src/app/(player)/player/layout.tsx` (new, thin): wraps `children` in `PlayerShell`
- `src/app/(player)/player/captain/page.tsx` (new, thin)
- `src/features/player-home/components/home-screen.tsx`: delete its local `navigation` and `BottomNav`. Change nothing else.
- `src/features/nutrition/components/nutrition-screen.tsx`: the same, and nothing else.

## Requirements
1. Banners never block the screen. Reading stays possible after the subscription ends; writes are already refused by RLS (`player_can_write`).
2. The WhatsApp number comes only from the captain's `profiles.phone`. Strip the `+` for `wa.me`. Never log it.
3. Dates use `localDate()` from `@/lib/dates`, and pure functions take `today`.
4. Files are under 250 lines, use tokens only, use RTL logical properties, have targets ≥ 48px, and use Egyptian Arabic.

## Acceptance
- [ ] `player-shell.test.ts` covers:
  - `playerNav` active matching: `/player`, `/player/nutrition`, `/player/progress/x`, and `/player/captain`
  - `showsNav` for workout, onboarding, and home
  - `accessState` for active, ending at 3 days, ended the day after, and archived taking priority
  - the WhatsApp URL builder
  - the cache read when `localStorage` throws
- [ ] `/player/captain` builds, and `npm run check` and `npm run build` pass.

## Out of scope
- The install screen (T-008b)
- Player payments (T-018)
- Any change to `src/ui/bottom-nav.tsx`
- `/player/progress` (T-013)
- Migrations
