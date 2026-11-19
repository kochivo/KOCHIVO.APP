import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const actionSchema = z.strictObject({
  actor: z.uuid(), id: z.uuid(), player: z.uuid(), expires: z.number().int(),
  kind: z.enum(['exercise', 'training', 'nutrition', 'renew', 'reminder', 'swap_options', 'meal_log']),
  label: z.string().max(160), payload: z.json(),
});
export type Approval = z.infer<typeof actionSchema>;
export const approvalLifetimeMs = 600_000;
export const mealLogPayload = z.strictObject({ mealId: z.uuid(), eaten: z.boolean(), name: z.string() });

const sign = (data: string, secret: string) => createHmac('sha256', secret).update(data).digest();

export function issueApproval(action: Approval, secret: string): string {
  const body = Buffer.from(JSON.stringify(action)).toString('base64url');
  return body + '.' + sign(body, secret).toString('hex');
}

export function verifyApproval(token: string, actor: string, now: number, secret: string): Approval | null {
  const [body, mac, extra] = token.split('.');
  if (!body || !mac || extra !== undefined || token.length > 65_000 || !/^[\w-]+$/.test(body) || !/^[a-f0-9]{64}$/.test(mac)) return null;
  const signature = Buffer.from(mac, 'hex');
  const expected = sign(body, secret);
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    const parsed = actionSchema.safeParse(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')));
    return parsed.success && parsed.data.actor === actor && parsed.data.expires >= now ? parsed.data : null;
  } catch {
    return null;
  }
}
