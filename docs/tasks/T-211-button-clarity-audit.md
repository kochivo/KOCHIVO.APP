# T-211: Button clarity audit across the app (phase 1: list only, no code changes)

**Phase:** v6 fixes · **Status:** ready · **Depends on:** none · **Migration:** none.
**Rules:** follow AGENTS.md. This phase is read-only: **do not edit any file in the repository.** Put the whole deliverable in your final message.

## Why

The owner (2026-11-12): some buttons are not visible or not clear, so a captain will not notice they are buttons. About 99 `<button>` elements in `src/features` have no border, background or pill shape. Some are fine (collapsible headers, icon buttons inside rows); many look like plain text.

## The rule (from the owner review)
- **Primary:** lime `Button` (default variant), one per screen.
- **Secondary:** `Button variant="secondary"` or an equivalent bordered pill, with a visible border or background, a label, and preferably an icon.
- **Icon-only:** `IconButton` or a bordered circle with an aria-label. Never a faint bare icon.
- **Links inside a sentence:** may stay text, but must look like links (lime and/or underline).
- **Collapsible section headers:** may stay full-width rows if they show a chevron.

## What to deliver

Scan every clickable element in `src/features` and `src/ui`: `<button>`, `Link` and `<a>` used as actions, and `role="button"`.

1. **A table of every control that breaks the rule.** Columns:
   - file:line;
   - screen or route;
   - visible label (Arabic);
   - what it does;
   - current look (for example "faint text", "bare icon");
   - proposed fix (`secondary`, `icon-button`, `link style`, or `keep` with a reason).
   Skip T-210's training editor files; they are handled there.
2. **A short list of screens with more than one primary (lime) action.**
3. **Shared fixes worth making once**, for example a `ui` pill-button variant, if a primitive is missing.

Group the table by screen: captain home, roster, player file, training, nutrition, assessments, follow-up, billing, settings, public pages, player app. Keep it accurate. Read each file and do not guess from class names alone.

## Out of scope
- Any code change (phase 2 comes after the reviewer and owner approve the list).
