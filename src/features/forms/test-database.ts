import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { readFileSync } from 'node:fs';

// A real Postgres transport keeps constraint/reorder tests independent of fluent-client mocks.
export async function formTestDatabase() {
  const db = new PGlite();
  await db.exec(`create table forms (id uuid primary key,captain_id uuid,title text,kind text,schedule jsonb,remind_after_hours smallint,creation_key uuid);
    create table form_questions (id uuid primary key,form_id uuid references forms(id),position int,
    label_ar text,label_en text,type text,required boolean,options jsonb,maps_to text,alert_on jsonb,show_chart boolean default true,unique(form_id,position));
    create table form_answers (id uuid primary key,question_id uuid references form_questions(id));`);
  await db.exec('create unique index forms_creation_key on forms(captain_id,creation_key) where creation_key is not null');
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$ select '00000000-0000-7000-8000-000000000001'::uuid $$;
    create function require_active_caller() returns void language sql as $$ select $$;`);
  const migration = readFileSync(new URL('../../../supabase/migrations/0130_forms_atomic.sql', import.meta.url), 'utf8');
  await db.exec(migration.slice(migration.indexOf('create function public.save_custom_form'))
    .replace(/commit;\s*$/, ''));
  let failNextWrite = false;
  const errors: string[] = [];
  const client = createClient<AppDatabase>('https://test.invalid', 'test', { global: { fetch: async (input, init) => {
    const url = new URL(String(input)), table = url.pathname.split('/').at(-1);
    if (table === 'save_custom_form') {
      if (failNextWrite) { failNextWrite = false; return Response.json({ message: 'Injected failure' }, { status: 500 }); }
      const body = JSON.parse(String(init?.body)) as { p_form: unknown; p_questions: unknown };
      try {
        await db.query('select save_custom_form($1::jsonb,$2::jsonb)', [JSON.stringify(body.p_form), JSON.stringify(body.p_questions)]);
        return new Response(null, { status: 204 });
      } catch (error) {
        errors.push(String(error));
        return Response.json({ message: String(error), code: (error as { code?: string }).code }, { status: 400 });
      }
    }
    if (!table || !['forms','form_questions','form_answers'].includes(table)) throw new Error('Unknown table');
    const values: unknown[] = [], filters: string[] = [];
    for (const [key, raw] of url.searchParams) {
      if (['select','order','on_conflict','columns'].includes(key)) continue;
      if (!/^[a-z_]+$/.test(key)) throw new Error('Unexpected column');
      const dot = raw.indexOf('.'), op = raw.slice(0, dot), value = raw.slice(dot + 1);
      if (op === 'in') { values.push(value.slice(1,-1).split(',')); filters.push(`${key}=any($${values.length}::uuid[])`); }
      else if (op === 'eq' || op === 'neq') { values.push(value); filters.push(`${key}${op === 'eq' ? '=' : '<>'}$${values.length}`); }
      else throw new Error('Unexpected filter');
    }
    const where = filters.length ? ` where ${filters.join(' and ')}` : '';
    try {
      if (init?.method === 'HEAD') {
        const result = await db.query<{ count: number }>(`select count(*)::int as count from ${table}${where}`, values);
        return new Response(null, { headers: { 'content-range': `*/${result.rows[0]?.count}` } });
      }
      if (init?.method === 'GET' || !init?.method) {
        const result = await db.query(`select * from ${table}${where} order by ${table === 'form_questions' ? 'position' : 'id'}`, values);
        return Response.json(result.rows);
      }
      if (failNextWrite) { failNextWrite = false; return Response.json({ message: 'Injected failure' }, { status: 500 }); }
      if (init.method === 'DELETE') {
        await db.query(`delete from ${table}${where}`, values); return new Response(null, { status: 204 });
      }
      const body: unknown = JSON.parse(String(init.body));
      const rows = Array.isArray(body) ? body : [body];
      const output: unknown[] = [];
      for (const row of rows) {
        const record = row as Record<string, unknown>;
        const keys = Object.keys(record);
        if (!keys.every(key => /^[a-z_]+$/.test(key))) throw new Error('Unexpected body');
        const result = init.method === 'PATCH'
          ? await db.query(`update ${table} set ${keys.map((key, i) => `${key}=$${values.length + i + 1}`).join(',')}${where} returning *`, [...values, ...Object.values(record)])
          : await db.query(`insert into ${table} select * from jsonb_populate_record(null::${table},$1::jsonb)
            on conflict(id) do update set ${keys.filter(key => key !== 'id').map(key => `${key}=excluded.${key}`).join(',')} returning *`, [JSON.stringify(record)]);
        output.push(...result.rows);
      }
      const single = new Headers(init.headers).get('accept')?.includes('object');
      return Response.json(single ? output[0] : output);
    } catch (error) { errors.push(String(error)); return Response.json({ message: String(error) }, { status: 400 }); }
  } } });
  return { db, client, errors, failWrite: () => { failNextWrite = true; } };
}
