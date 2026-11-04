import type { PGlite } from '@electric-sql/pglite';
import { uuidv7 } from '../../src/core/offline/ids';
import { asUser, createUser, TEST_NOW } from './harness';

export interface AuditTarget {
  table: string;
  key: string;
  id: string;
  edit: string;
}

export async function tenantFixture(db: PGlite, captain: string, player: string) {
  const targets: AuditTarget[] = [];
  const add = async (table: string, values: Record<string, unknown>, edit: string, key = 'id') => {
    const row = { [key]: uuidv7(Date.parse(TEST_NOW)), ...values };
    const columns = Object.keys(row);
    await db.query(`insert into public.${table} (${columns.join(',')})
      values (${columns.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(row));
    const id = String(row[key]);
    targets.push({ table, key, id, edit });
    return id;
  };
  targets.push({ table: 'profiles', key: 'id', id: player, edit: "full_name = 'Changed'" });
  await add('daily_checks', { player_id: player, log_date: '2026-11-04', client_updated_at: TEST_NOW }, 'water_ml = 250');
  await add('readiness_decisions', { captain_id: captain, player_id: player, decision_date: '2026-11-04', decision: 'keep' }, "decision = 'reduce'");
  const relationship = (await db.query<{ id: string }>(
    'select id from public.coach_clients where captain_id = $1 and player_id = $2', [captain, player],
  )).rows[0];
  if (!relationship) throw new Error('Missing relationship');
  targets.push({ table: 'coach_clients', key: 'id', id: relationship.id, edit: 'access_until = access_until + 1' });
  await add('coach_invites', { captain_id: captain, access_until: '2026-12-03' }, 'expires_at = expires_at');
  const exercise = await add('exercises', { owner_id: captain, name_en: 'Private', body_part: 'chest' }, "name_en = 'Changed'");
  const food = await add('foods', { owner_id: captain, name_ar: 'Test', kcal_per_100g: 100,
    protein_per_100g: 10, carbs_per_100g: 10, fat_per_100g: 1 }, "name_en = 'Changed'");
  const program = await add('programs', { captain_id: captain, player_id: player, title: 'Assigned', status: 'active' }, "title = 'Changed'");
  await add('programs', { captain_id: captain, is_template: true, title: 'Template' }, "title = 'Changed'");
  const day = await add('program_days', { program_id: program, position: 1 }, "title = 'Changed'");
  const item = await add('program_exercises', { day_id: day, exercise_id: exercise, position: 1, sets: 20, reps_min: 8 }, 'sets = 19');
  const plan = await add('nutrition_plans', { captain_id: captain, player_id: player, title: 'Assigned', status: 'active' }, "title = 'Changed'");
  await add('nutrition_plans', { captain_id: captain, is_template: true, title: 'Template' }, "title = 'Changed'");
  const meal = await add('meals', { plan_id: plan, position: 1, name: 'Meal' }, "name = 'Changed'");
  const mealItem = await add('meal_items', { meal_id: meal, food_id: food, position: 1, grams: 100 }, 'grams = 120');
  await add('meal_item_alternatives', { meal_item_id: mealItem, food_id: food, grams: 100 }, 'grams = 120');
  const session = await add('workout_sessions', { player_id: player, program_day_id: day,
    training_date: '2026-11-03', started_at: TEST_NOW, client_updated_at: TEST_NOW }, 'completed_at = now()');
  const set = await add('set_logs', { player_id: player, session_id: session, program_exercise_id: item,
    exercise_id: exercise, set_index: 1, weight_kg: 60, reps: 8, completed_at: TEST_NOW, client_updated_at: TEST_NOW }, 'reps = 9');
  await add('meal_logs', { player_id: player, meal_id: meal, log_date: '2026-11-03', client_updated_at: TEST_NOW }, 'completed_at = now()');
  const checkin = await add('check_ins', { player_id: player, captain_id: captain, week_start: '2026-11-01' }, "captain_reply = 'Changed'");
  const form = await add('form_checks', { player_id: player, captain_id: captain,
    exercise_id: exercise, set_log_id: set, video_path: `${player}/form.mp4` }, "captain_reply = 'Changed'");
  await add('player_intake', { player_id: player, birth_year: 2000, sex: 'male', height_cm: 180,
    weight_kg: 80, training_days: [1, 3], session_minutes: 60, experience: 'new' }, 'weight_kg = 81', 'player_id');
  const audio = `${player}/${uuidv7(Date.parse(TEST_NOW))}.webm`;
  await add('voice_notes', { captain_id: captain, player_id: player, audio_path: audio, duration_seconds: 10 }, 'listened_at = now()');
  const pack = await add('captain_packages', { captain_id: captain, name: 'Monthly', price_egp: 300, days: 30 }, 'price_egp = 301');
  const payment = await add('player_payments', { captain_id: captain, player_id: player, package_id: pack,
    amount_egp: 100, price_egp: 300, days: 30, period_start: '2026-11-01', period_end: '2026-11-30' }, 'amount_egp = 101');
  await add('payment_collections', { payment_id: payment, captain_id: captain, player_id: player, amount_egp: 10 }, 'amount_egp = 11');
  const files = [
    ['checkin-photos', `${player}/photo.jpg`], ['form-videos', `${player}/form.mp4`],
    ['voice-notes', audio], ['captain-food-photos', `${captain}/${player}.jpg`],
  ] as const;
  for (const [bucket, name] of files) {
    await db.query('insert into storage.objects (bucket_id, name) values ($1, $2)', [bucket, name]);
  }
  return { targets, files, captain, player, exercise, day, item, session, program, plan, meal, set, checkin, form, pack, payment };
}

export async function sibling(db: PGlite, captain: string) {
  const player = await createUser(db, 'player');
  await db.query(`insert into public.coach_clients (captain_id, player_id, access_until)
    values ($1, $2, '2026-12-03')`, [captain, player]);
  return tenantFixture(db, captain, player);
}

export const runAs = (db: PGlite, user: string, sql: string, params: unknown[] = [], demo = false) =>
  asUser(db, user, tx => tx.query(sql, params), demo);
