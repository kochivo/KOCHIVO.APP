import type { PGlite } from '@electric-sql/pglite';
import { fleetId } from './fleet-player-fixture';
import type { FleetPlayer } from './fleet-player-fixture';
import { localDate, weeklyWeekday } from '../../src/lib/dates';
import { TEST_NOW } from './harness';

export async function playerContent(db: PGlite, player: FleetPlayer, key = player.id) {
  await db.query("update programs set status='archived' where player_id=$1 and status='active'", [player.id]);
  await db.query("update nutrition_plans set status='archived' where player_id=$1 and status='active'", [player.id]);
  const ids = await Promise.all(['program', 'day', 'exercise', 'item', 'plan', 'meal', 'food', 'meal-item', 'alternative', 'supplement']
    .map(part => fleetId(part, key)));
  const [program = '', day = '', exercise = '', item = '', plan = '', meal = '', food = '', mealItem = '', alternative = '', supplement = ''] = ids;
  await db.query(`insert into exercises(id,owner_id,name_en,body_part) values ($1,$2,'Press','chest')`, [exercise, player.captain]);
  await db.query(`insert into programs(id,captain_id,player_id,title,status) values ($1,$2,$3,'Fleet workout','active')`,
    [program, player.captain, player.id]);
  await db.query(`insert into program_days(id,program_id,position,weekday,title) values ($1,$2,1,$3,'Training')`,
    [day, program, weeklyWeekday(localDate(new Date(TEST_NOW)))]);
  await db.query(`insert into program_exercises(id,day_id,exercise_id,position,sets,reps_min) values ($1,$2,$3,1,3,8)`, [item, day, exercise]);
  await db.query(`insert into nutrition_plans(id,captain_id,player_id,title,status,target_kcal)
    values ($1,$2,$3,'Fleet nutrition','active',2000)`, [plan, player.captain, player.id]);
  await db.query("insert into meals(id,plan_id,position,name) values ($1,$2,1,'Lunch')", [meal, plan]);
  await db.query(`insert into foods(id,owner_id,name_ar,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g)
    values ($1,$2,'Fleet food',100,10,10,1)`, [food, player.captain]);
  await db.query('insert into meal_items(id,meal_id,food_id,position,grams) values ($1,$2,$3,1,100)', [mealItem, meal, food]);
  await db.query('insert into meal_item_alternatives(id,meal_item_id,food_id,grams) values ($1,$2,$3,120)', [alternative, mealItem, food]);
  await db.query(`insert into supplements(id,captain_id,player_id,name,dose,timing)
    values ($1,$2,$3,'Creatine','5 g','morning')`, [supplement, player.captain, player.id]);
  return { program, day, exercise, item, plan, meal, food, mealItem, alternative, supplement };
}
