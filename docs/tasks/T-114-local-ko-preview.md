# T-114 — Local-only KO teaser

Owner approved the green-face graphite-helmet KO identity and requested implementation LOCAL ONLY, hidden from the current Beta. This explicitly revokes earlier publication authorization for this task: no commit, push, deployment or production configuration changes.

## Scope

- New `src/features/ko-preview/**`: localized teaser launcher/panel/avatar, loopback development policy and tests.
- New `public/ko-preview/{welcome,thinking,cheer}.png`: transparent generated versions of the approved face, no changes to existing brand assets.
- `src/features/roster/components/captain-device.tsx`, `src/features/player-shell/components/player-shell.tsx`: dev-only lazy integration, suppress during workout/onboarding.
- New `src/app/[locale]/dev/ko/page.tsx`, `demo.tsx`: permanent development-gated role preview with sample UI and real widget.
- Task and `docs/superpowers/plans/2026-11-07-local-ko-preview.md`.

## Acceptance

Only development mode AND exact loopback hostname may display KO. Production, preview hosts, non-loopback names and test mode return no widget. Captain/player copy differs. Existing four-item bottom navigation, feedback and account menu remain usable. KO is on the opposite logical edge from Feedback, above nav/safe area. Native dialog handles mobile modality, Escape/focus return; outside dismissal works on desktop. Panel has an honest under-development state and no enabled composer, submission or AI/network/data integration. Three expressions can be previewed, with reduced-motion support. Verify 320/390px and desktop RTL/LTR, safe areas, production gate, full check/build/perf; then leave the dev server bound only to localhost for owner review.

Generated assets use image_gen with the approved final board as identity reference, transparent backgrounds, no text/UI. Original board and discarded concepts stay untouched.
