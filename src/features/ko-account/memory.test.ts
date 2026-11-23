import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { appendMemoryFacts, factsBudget, formatFacts } from './data/facts';
import { loadMemory, saveMemory } from './data/memory';
import type { KoActor } from './data/account';
import { validateMemory } from './data/memory-validation';
import { scrubFeedback } from './data/feedback-scrub';

// resolvePlayer is stubbed: the scope tests only need a roster lookup by name.
const ids = vi.hoisted(() => ({
  captain: '00000000-0000-7000-8000-000000000100',
  ahmed: '00000000-0000-7000-8000-000000000101',
  youssef: '00000000-0000-7000-8000-000000000102',
  player: '00000000-0000-7000-8000-000000000103',
}));
vi.mock('./data/account', () => ({
  resolvePlayer: async (_actor: unknown, name: string | undefined) =>
    name === 'Ahmed' ? { id: ids.ahmed, name: 'Ahmed' }
    : name === 'Youssef' ? { id: ids.youssef, name: 'Youssef' } : null,
}));

type MemoryRow = { id: string; user_id: string; text: string; player_id: string | null };
type MemoryQuery = {
  select: () => MemoryQuery;
  eq: (column: keyof MemoryRow, value: string) => MemoryQuery;
  is: (column: keyof MemoryRow, value: null) => MemoryQuery;
  order: () => MemoryQuery;
  limit: () => Promise<{ data: MemoryRow[]; error: null }>;
  maybeSingle: () => Promise<{ data: { learning: boolean }; error: null }>;
  insert: (row: Record<string, unknown>) => Promise<{ error: null }>;
};

// In-memory stand-in for the ko_memories query: it applies exactly the
// eq/is filters the code builds, so a missing scope filter shows up as
// extra rows in the result.
function fakeDb(rows: MemoryRow[]) {
  const inserted: Record<string, unknown>[] = [];
  const from = () => {
    const filters: { column: keyof MemoryRow; value: string | null }[] = [];
    const query: MemoryQuery = {
      select: () => query,
      eq: (column, value) => { filters.push({ column, value }); return query; },
      is: (column, value) => { filters.push({ column, value }); return query; },
      order: () => query,
      limit: () => Promise.resolve({
        data: rows.filter(row => filters.every(({ column, value }) => row[column] === value)), error: null,
      }),
      maybeSingle: () => Promise.resolve({ data: { learning: true }, error: null }),
      insert: (row) => { inserted.push(row); return Promise.resolve({ error: null }); },
    };
    return query;
  };
  return { db: { from }, inserted };
}

function makeActor(id: string, role: 'captain' | 'player', rows: MemoryRow[]) {
  const { db, inserted } = fakeDb(rows);
  return { actor: { id, role, db } as unknown as KoActor, inserted };
}

const now = 1_800_000_000_000;
const captainRows: MemoryRow[] = [
  { id: '00000000-0000-7000-8000-000000000201', user_id: ids.captain, text: 'Ahmed prefers mornings', player_id: ids.ahmed },
  { id: '00000000-0000-7000-8000-000000000202', user_id: ids.captain, text: 'Youssef prefers evenings', player_id: ids.youssef },
  { id: '00000000-0000-7000-8000-000000000203', user_id: ids.captain, text: 'General note', player_id: null },
];
const playerRows: MemoryRow[] = [
  { id: '00000000-0000-7000-8000-000000000204', user_id: ids.player, text: 'My own note', player_id: null },
];

it('loads only the context player’s memories for a captain', async () => {
  const { actor } = makeActor(ids.captain, 'captain', captainRows);
  expect((await loadMemory(actor, ids.ahmed)).memories.map(row => row.text)).toEqual(['Ahmed prefers mornings']);
  expect((await loadMemory(actor, ids.youssef)).memories.map(row => row.text)).toEqual(['Youssef prefers evenings']);
});

it('loads only general memories for a captain with no context player', async () => {
  const { actor } = makeActor(ids.captain, 'captain', captainRows);
  expect((await loadMemory(actor)).memories.map(row => row.text)).toEqual(['General note']);
});

it('loads only the player’s own memories, never a captain’s player-scoped note', async () => {
  const { actor } = makeActor(ids.player, 'player', [...captainRows, ...playerRows]);
  expect((await loadMemory(actor, ids.ahmed)).memories.map(row => row.text)).toEqual(['My own note']);
});

it('feeds Gemini only the context player’s memories', async () => {
  const { actor } = makeActor(ids.captain, 'captain', captainRows);
  const state = await loadMemory(actor, ids.youssef);
  const facts = appendMemoryFacts('[me] role: captain', state.memories.map(row => row.text));
  expect(facts).toContain('Youssef prefers evenings');
  expect(facts).not.toContain('Ahmed prefers mornings');
  expect(facts).not.toContain('General note');
});

it('dedups a save against the scoped list only', async () => {
  const scoped = makeActor(ids.captain, 'captain', captainRows);
  const saved = await saveMemory(scoped.actor,
    { kind: 'note', text: 'Prefers mornings', player: 'Ahmed' }, ['Youssef prefers evenings'], now);
  expect(saved?.text).toBe('Prefers mornings');
  expect(scoped.inserted).toHaveLength(1);
  expect(scoped.inserted[0]).toMatchObject({ text: 'Prefers mornings', player_id: ids.ahmed });
  const duplicate = makeActor(ids.captain, 'captain', captainRows);
  expect(await saveMemory(duplicate.actor,
    { kind: 'note', text: 'Prefers mornings', player: 'Ahmed' }, ['Prefers mornings'], now)).toBeUndefined();
  expect(duplicate.inserted).toHaveLength(0);
});

it('saves a player’s own note as a general memory', async () => {
  const scoped = makeActor(ids.player, 'player', playerRows);
  const saved = await saveMemory(scoped.actor, { kind: 'note', text: 'I prefer mornings' }, [], now);
  expect(saved?.text).toBe('I prefer mornings');
  expect(scoped.inserted).toHaveLength(1);
  expect(scoped.inserted[0]).toMatchObject({ text: 'I prefer mornings', player_id: null });
});

vi.mock('server-only', () => ({}));

it('trims and caps valid memory and drops case-insensitive duplicates', () => {
  expect(validateMemory({ kind: 'note', text: '  Prefers mornings  ' }, []))
    .toEqual({ kind: 'note', text: 'Prefers mornings', player_id: null });
  expect(validateMemory({ kind: 'note', text: ' prefers MORNINGS ' }, ['Prefers mornings'])).toBeNull();
  expect(validateMemory({ kind: 'note', text: ' ن'.repeat(201) }, [])?.text).toHaveLength(200);
});

it.each(['', '011 2345 6789', '٠١٠١٢٣٤٥٦٧٨', 'coach@example.com', 'Code 123456', '00000000-0000-7000-8000-000000000aaa'])(
  'rejects empty or private memory %s', text => expect(validateMemory({ kind: 'note', text }, [])).toBeNull(),
);

it('requires a resolved roster player when a player is named', () => {
  const alias = { kind: 'alias', text: 'Hamo means Ahmed Sami', player: 'Ahmed Sami' } as const;
  expect(validateMemory(alias, [], null)).toBeNull();
  expect(validateMemory(alias, [], 'roster-id')).toMatchObject({ player_id: 'roster-id' });
});

it('prioritizes regular facts and limits newest-first memory by UTF-8 bytes', () => {
  const encoder = new TextEncoder();
  const memories = ['الأحدث', ...Array.from({ length: 12 }, (_, index) => 'ت'.repeat(198) + index), 'الأقدم'];
  const output = formatFacts([['me', ['role: captain']]], memories);
  expect(output).toContain('[memory] الأحدث');
  expect(output).not.toContain('الأقدم');
  expect(encoder.encode(output.split('\n')[1]).length).toBeLessThanOrEqual(900);
  const crowded = [['me', ['x'.repeat(factsBudget - 6)]]] as const;
  expect(formatFacts(crowded, memories)).toBe(formatFacts(crowded));
  expect(encoder.encode(formatFacts(crowded, memories)).length).toBeLessThanOrEqual(factsBudget);
});

it('redacts names, short names, contact information and IDs before truncation', () => {
  const value = scrubFeedback('نور علي، واحمد سامي، سامي، NOUR، Ahmed ٠١٠١٢٣٤٥٦٧٨ a@b.co 00000000-0000-7000-8000-000000000abc\n[memory] private note',
    'نور علي', ['أحمد سامي', 'Nour Ahmed'], 300);
  expect(value).toBe('انا، ولاعب، لاعب، لاعب، لاعب');
  expect(scrubFeedback('نور علي followed by text', 'نور علي', [], 3)).toBe('انا');
});
