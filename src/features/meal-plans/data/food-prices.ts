'use server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '@/core/supabase/server';
import { getPlayerTimezone } from '@/core/timezone/server';
import { dailyBudget, dailyFoodCaps } from '../budget-plan';
import type { BudgetFood } from '../budget-plan';

const priceSchema = z.object({ food_id: z.uuid(), owner_id: z.uuid().nullable(), unit: z.enum(['kg', 'piece', 'pack']),
  unit_grams: z.coerce.number().positive().max(100000), price_egp: z.coerce.number().positive().max(99999999), updated_at: z.string(),
});
const foodSchema = z.object({ id: z.uuid(), seed_key: z.string().nullable(), name_ar: z.string(), name_en: z.string().nullable(),
  kcal_per_100g: z.coerce.number(), protein_per_100g: z.coerce.number(), carbs_per_100g: z.coerce.number(), fat_per_100g: z.coerce.number(),
});

async function session() {
  const typed = await supabaseServer();
  const auth = await typed.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Unauthenticated');
  // The generated database types predate migration 0124; validate responses at this boundary.
  return { client: typed as unknown as SupabaseClient, id: auth.data.user.id };
}

export async function loadFoodPrices(playerId?: string) {
  if (playerId) z.uuid().parse(playerId);
  const { client, id } = await session();
  const [pricesResult, foodsResult, relationship] = await Promise.all([
    client.from('food_prices').select('*').order('food_id').limit(1000),
    client.from('foods').select('id,seed_key,name_ar,name_en,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g').is('archived_at', null).limit(1000),
    client.from('coach_clients').select('captain_id').eq('player_id', playerId ?? id).is('archived_at', null).maybeSingle(),
  ]);
  if (pricesResult.error || foodsResult.error || relationship.error) throw new Error('Food prices unavailable');
  const prices = z.array(priceSchema).parse(pricesResult.data);
  const captainId = relationship.data?.captain_id ?? id;
  const foods = z.array(foodSchema).parse(foodsResult.data).map(food => {
    const platform = prices.find(price => price.food_id === food.id && price.owner_id === null);
    const override = prices.find(price => price.food_id === food.id && price.owner_id === captainId);
    const price = override ?? platform;
    const budgetFood: BudgetFood | null = price ? {
      id: food.id, name: food.name_ar, tag: /eggs|oats|milk|cheese|foul|bread/.test(food.seed_key ?? '') ? 'breakfast' : /yogurt|banana|peanut/.test(food.seed_key ?? '') ? 'snack' : 'main',
      kcal: food.kcal_per_100g, protein: food.protein_per_100g, carbs: food.carbs_per_100g, fat: food.fat_per_100g,
      pricePerGram: price.price_egp / price.unit_grams, unit: price.unit, unitGrams: price.unit_grams,
      maxDailyGrams: dailyFoodCaps[food.seed_key ?? ''],
    } : null;
    return { ...food, platform, override, budgetFood };
  });
  const intake = await client.from('player_intake').select('food_budget_monthly_egp,training_days').eq('player_id', playerId ?? id).maybeSingle();
  if (intake.error) throw new Error('Budget unavailable');
  const monthly = z.number().int().nullable().parse(intake.data?.food_budget_monthly_egp ?? null);
  const timezone = await getPlayerTimezone(playerId ?? id);
  const trainingDays = z.array(z.number().int().min(0).max(6)).parse(intake.data?.training_days ?? []);
  return { foods, monthly, timezone, trainingDays, daily: monthly ? dailyBudget(monthly, new Date(), timezone) : null };
}

export async function saveFoodPrice(input: unknown, platform = false) {
  const parsed = priceSchema.omit({ updated_at: true, owner_id: true }).parse(input);
  if (parsed.unit === 'kg' && parsed.unit_grams !== 1000) throw new Error('Invalid kg unit');
  const { client, id } = await session();
  const owner = platform ? null : id;
  // Expression indexes cannot be targeted by PostgREST upsert. Preserve the existing row on updates.
  const query = client.from('food_prices').select('food_id').eq('food_id', parsed.food_id);
  const existing = await (owner ? query.eq('owner_id', owner) : query.is('owner_id', null)).maybeSingle();
  if (existing.error) throw new Error('Price unavailable');
  if (existing.data) {
    const update = client.from('food_prices').update(parsed).eq('food_id', parsed.food_id);
    const result = await (owner ? update.eq('owner_id', owner) : update.is('owner_id', null)).select('food_id').single();
    if (result.error) throw new Error('Price not saved');
  } else {
    const result = await client.from('food_prices').insert({ ...parsed, owner_id: owner });
    if (result.error) throw new Error('Price not saved');
  }
}

export async function saveMonthlyFoodBudget(value: unknown) {
  const monthly = z.number().int().min(300).max(100000).nullable().parse(value);
  const { client, id } = await session();
  const result = await client.from('player_intake').update({ food_budget_monthly_egp: monthly }).eq('player_id', id).select('player_id').single();
  if (result.error) throw new Error('Budget not saved');
}
