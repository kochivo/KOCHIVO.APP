-- T-423: scope KO memory uniqueness per (user, player).
--
-- The old index on (user_id, lower(text)) treated a note saved for one player
-- as a collision for every other player, and let two general (NULL-player)
-- notes with the same text both insert, because Postgres treats NULLs as
-- distinct in a unique index. NULLS NOT DISTINCT makes NULL player_id a
-- value, so the same text exists at most once per (user, player) — including
-- once for general notes. It needs Postgres 15+; Supabase runs Postgres 15
-- or 17 and the PGlite test database is 18, so no coalesce fallback is used.
--
-- Backfill is a no-op by construction: every existing row already carries the
-- player_id it was saved with (a resolved roster player, or NULL for a
-- general note). Creating the new index cannot fail on existing data either:
-- the old index already forbade two rows with the same user and text, so no
-- (user, player, text) collision can exist. The 30-row trim trigger stays
-- per-user and is unchanged.
begin;
drop index if exists public.ko_memories_text_idx;
create unique index ko_memories_text_idx on public.ko_memories (user_id, player_id, lower(text)) nulls not distinct;
commit;
