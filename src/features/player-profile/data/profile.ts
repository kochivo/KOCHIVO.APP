import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/core/supabase/server';
import type { Tables } from '@/types/database';
import type { PlayerProfile, ProfileResult } from '../types';

type ProgressCheckIn = Pick<Tables<'check_ins'>, 'id' | 'week_start' | 'body_weight_kg' | 'waist_cm' | 'notes' | 'photo_paths' | 'reviewed_at' | 'captain_reply'> & {
  body_fat_pct: number | null; photo_poses: string[];
};

export async function fetchPlayerProfile(playerId: string): Promise<ProfileResult> {
  if (!z.uuid().safeParse(playerId).success) return { data: null };
  try {
    const client = await supabaseServer();
    const ownership = await client.rpc('is_captain_of', { p_player: playerId });
    if (ownership.error) throw ownership.error;
    if (!ownership.data) return { data: null };
    const [profile, intake, checks, program, nutrition] = await Promise.all([
      client.from('profiles').select('full_name').eq('id', playerId).maybeSingle(),
      client.from('player_intake').select('*').eq('player_id', playerId).maybeSingle(),
      client.from('check_ins').select('id,week_start,body_weight_kg,waist_cm,notes,photo_paths,reviewed_at,captain_reply,body_fat_pct,photo_poses')
        .eq('player_id', playerId).order('week_start', { ascending: false }).limit(26).returns<ProgressCheckIn[]>(),
      client.from('programs').select('id,title,updated_at,program_days(id,program_exercises(id))')
        .eq('player_id', playerId).eq('status', 'active').maybeSingle(),
      client.from('nutrition_plans').select('id,title,updated_at,target_kcal,target_protein,target_carbs,target_fat,meals(id)')
        .eq('player_id', playerId).eq('status', 'active').maybeSingle(),
    ]);
    const failed = [profile, intake, checks, program, nutrition].find((result) => result.error);
    if (failed?.error) throw failed.error;
    if (!profile.data) return { data: null };
    const rows = checks.data ?? [];
    const photoPaths = rows.flatMap((row) => row.photo_paths);
    const urls = await signPhotos(client, photoPaths);
    const data: PlayerProfile = {
      name: profile.data.full_name,
      intake: intake.data ? intakeOf(intake.data) : null,
      checkIns: rows.map((row) => ({
        id: row.id, weekStart: row.week_start, weightKg: row.body_weight_kg, waistCm: row.waist_cm, notes: row.notes,
        reviewedAt: row.reviewed_at, reply: row.captain_reply,
        bodyFatPct: row.body_fat_pct,
        photoPoses: row.photo_paths.flatMap((path, index) => urls.has(path) ? [row.photo_poses[index] ?? 'photo'] : []),
        photoError: row.photo_paths.some(path => !urls.has(path)),
        photos: row.photo_paths.flatMap((path) => urls.get(path) ?? []),
      })),
      program: program.data ? { title: program.data.title, updatedAt: program.data.updated_at, days: program.data.program_days.length,
        exercises: program.data.program_days.reduce((total, day) => total + day.program_exercises.length, 0) } : null,
      nutrition: nutrition.data ? { title: nutrition.data.title, updatedAt: nutrition.data.updated_at, meals: nutrition.data.meals.length,
        kcal: nutrition.data.target_kcal, protein: nutrition.data.target_protein,
        carbs: nutrition.data.target_carbs, fat: nutrition.data.target_fat } : null,
    };
    return { data };
  } catch (error) {
    unstable_rethrow(error);
    console.warn('Loading player profile failed', error);
    return { error: true };
  }
}

async function signPhotos(client: Awaited<ReturnType<typeof supabaseServer>>, paths: string[]) {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;
  const signed = await client.storage.from('checkin-photos').createSignedUrls(paths, 600);
  // Photos are a bonus on this page; the rest of the profile still renders without them.
  if (signed.error) console.warn('Signing check-in photos failed', signed.error.message);
  for (const file of signed.data ?? []) if (file.path && file.signedUrl) urls.set(file.path, file.signedUrl);
  return urls;
}

function intakeOf(row: Tables<'player_intake'>): NonNullable<PlayerProfile['intake']> {
  return {
    birthYear: row.birth_year, sex: row.sex === 'female' ? 'female' : 'male', heightCm: row.height_cm, weightKg: row.weight_kg,
    targetWeightKg: row.target_weight_kg, trainingDays: row.training_days, sessionMinutes: row.session_minutes,
    experience: row.experience, injuries: row.injuries, allergies: row.allergies, medical: row.medical,
    notes: row.notes, completedAt: row.completed_at,
  };
}
