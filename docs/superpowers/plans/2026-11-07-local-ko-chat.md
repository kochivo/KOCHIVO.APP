# Local KO Training Chat Implementation Plan

> For agentic workers. Use executing-plans and verify each task before moving on.

**Goal.** A captain updates a synthetic bench prescription through natural language, then a player reads that prescription with KO.

**Architecture.** The existing developer demo enables the chat through its KO launcher. A local-only server route sends text or bounded audio to Gemini for tool selection, validates the returned tool call, and reads or updates one isolated fixture per browser.

**Tech stack.** Next.js, React, Zod, Gemini GenerateContent, MediaRecorder, and Vitest.

**Spec.** `docs/tasks/T-115-local-ko-chat.md`

## Global constraints

Loopback development only. No package changes, hosted database changes, commits or deployments. Read the provider key from the server process.

## Review focus

Player write attempts, cross-origin requests, isolation between browsers, invalid model output, microphone denial and cleanup.

## Task 1. Feature and tool boundary

- [x] Add failing tests for captain update followed by player read, provider injection, scope rejection and origin checks.
- [x] Add the shared fixture, Gemini function selection and loopback route. Keep role-specific tool execution and trusted result formatting on the server.
- [x] Run focused Vitest checks.

## Task 2. Local chat and microphone

- [x] Test that the explicit demo variant renders a chat and the ordinary teaser keeps its disabled composer.
- [x] Add localized chat UI and microphone recording, reuse the existing KO launcher and panel.
- [x] Verify a text round trip and voice capture with a deterministic audio fixture, then run project checks and build.

Verification covered Arabic text, a real browser MediaRecorder recording using a synthetic English microphone input, Gemini tool calls, shared and isolated sessions, read-only player behavior, and production HTTP 404 for the demo page and route. `npm run check` passed 2,627 tests and `npm run build` passed.
