import { z } from 'zod';
import { checkedRows } from '../data/read';
import { defineTool } from '../define-tool';

export const listExercises = defineTool({
  name: 'list_exercises',
  description: 'Search up to 50 exercises in the shared catalog and your own library.',
  input: z.strictObject({ query: z.string().trim().min(2).max(40).optional(), muscle: z.string().optional() }),
  output: z.array(z.object({
    id: z.uuid(), name: z.string(), muscle: z.string(), equipment: z.string().nullable(), own: z.boolean(),
  })).max(50),
  roles: ['captain'],
  kind: 'read',
  async run({ actor: { db, id }, signal }, { query, muscle }) {
    const request = db.from('exercises').select('id,name_en,body_part,equipment,owner_id')
      .is('archived_at', null).or(`owner_id.is.null,owner_id.eq.${id}`)
      .order('name_en').order('id').limit(50);
    if (query) request.ilike('name_en', `%${query.replace(/[\\%_]/g, '\\$&')}%`);
    if (muscle !== undefined) request.eq('body_part', muscle);
    return checkedRows(await request.abortSignal(signal)).map(row => ({
      id: row.id, name: row.name_en, muscle: row.body_part, equipment: row.equipment, own: row.owner_id === id,
    }));
  },
});
