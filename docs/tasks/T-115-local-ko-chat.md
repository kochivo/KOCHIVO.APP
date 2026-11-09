# T-115 Local KO training chat

Turn on text and voice chat on the existing loopback development demo. A synthetic captain can update Ahmed’s bench sets or reps, and the synthetic player can ask KO to read the same plan. Both roles use one browser session and one server-side fixture.

## Files

- `src/features/ko-preview/` for the chat and microphone, and `src/features/ko-agent/` for server tools and tests
- `src/app/[locale]/dev/ko/` for the demo entry point and chat route
- `docs/tasks/T-115-local-ko-chat.md` and its implementation plan

## Acceptance

Gemini selects the tool from ordinary text or a voice note. Captain edits return verified saved values. Player tools are read-only. A loopback and same-origin gate protects the route before any model call. The workflow uses synthetic data. The Gemini key comes from the server process. The production app, dependency manifest, deployment and Supabase stay outside this task.
