'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { planClient } from '../../data/client';

const inputSchema = z.object({ id: z.uuid(), title: z.string().trim().min(1).max(80) });

export async function copyMealTemplate(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!captainWorkspaceEnabled() || !parsed.success) return null;
  const client = await planClient();
  const { data, error } = await client.rpc('copy_template', {
    p_kind: 'nutrition', p_template: parsed.data.id, p_title: parsed.data.title,
  });
  if (error || !data) return null;
  revalidatePath('/captain/templates');
  return data;
}
