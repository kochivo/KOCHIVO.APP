# T-224: Player v3 workout: day overview, set logging, finish

**Phase:** Player v3 redesign · **Depends on:** T-222 · **Status:** ready

## Goal
Match `docs/mockups/player-v3/02-day.html`, `03-set.html` and `04-done.html` exactly, on `/player/workout/[dayId]` (v6 branch). Read `docs/mockups/player-v3/README.md` first. Offline logging through `saveAndQueue()` must keep working exactly as now.

## Files
- `src/features/workout/components/*`: the overview (warmup-preview, workout-exercise, next-up), focus (focus-screen, set-controls, set-rows, set-dots, exercise-header, rest-panel), and finish (session-feedback, finish-hero, finish-share, done-panel, pr-burst). One component per file, under 250 lines.
- `src/features/workout/messages.ts` and its standard file.
- Tests in `src/features/workout/`.
- This card.

## Day overview (`02-day.html`)
- A back button, then the title and «<m> دقيقة · <n> تمارين».
- **«1 · التسخين».** Total minutes and a checklist of the warm-up items. Each row is a 48px round check plus name plus amount; checking stays local, as today.
- **«2 · التمارين».** One card per exercise: a GIF tile (existing media), the name, «<sets> × <reps> · المرة اللي فاتت <kg> كجم» (from existing history; leave out the "last time" part when there is none).
  - A program with more exercises than fit shows «وتمرين كمان: <name>» as in the mockup.
- A sticky lime «ابدأ التمرين» at the bottom. It is the only lime button.

## Set logging (`03-set.html`)
- The workout clock, the GIF, the exercise name, and «المجموعة <i> من <n>» plus the captain's exercise note when there is one («الكابتن: «…»»).
- **Two big cards, كيلو and عدّات.** The number is in `glass-strong`, and −/+ steppers are at least 56×56.
  - Steps are the existing steps (2.5 kg and 1 rep, or what set-controls uses).
- **Hint line.**
  - «المرة اللي فاتت <kg> × <reps>» from existing history.
  - Add «· لو عملتها يبقى رقم قياسي» only when the current numbers beat the best set (existing PR logic).
- **The lime «خلصت المجموعة»**, then the rest panel as today. After the last set the button text is «خلصت التمرين».
- **Keep** the alternatives, form-check, lightbox, ramp line and set dots. Place them where they fit without adding a second lime button, and list them in Notes.

## Finish (`04-done.html`)
- **The brand slashes**, «خلصت تمرين النهارده», and «عاش يا <first name>!».
- **Three stats:**
  - minutes;
  - sets;
  - total volume in tons with one decimal, labelled «ط شلت إجمالي».
  - All three come from the session (existing finish-hero data).
- **The gold PR card** «رقم قياسي جديد» with «<exercise> <kg> × <reps>». Show it only when the session set a PR.
- **«التمرين كان عامل إزاي؟»** with three buttons: سهل / مظبوط / صعب.
  - They write the existing `rpe` field: سهل = 3, مظبوط = 6, صعب = 9.
  - No schema change. `rpeValues` stays 1–10, because the captain side reads it.
- **«كلمة للكابتن (لو حابب)»**, the existing note textarea, max 500.
- **The lime «ابعت للكابتن»**, the existing submit, disabled until an effort is picked.
- **«شارك الإنجاز»**, outline, the existing share.

## Acceptance
- [ ] Tests:
  - the effort buttons map to rpe 3, 6 and 9;
  - the PR hint shows only when it beats the best set;
  - the PR card shows only with a PR;
  - the volume is formatted in tons;
  - each of the three screens has exactly one lime button;
  - the offline save path is unchanged (the existing tests stay green).
- [ ] At 390×844 the three states match their mockups.
- [ ] `npm run check` and `npm run build` pass, within the perf budget.

## Out of scope
The program editor, new media, and any change to how sets are stored.
