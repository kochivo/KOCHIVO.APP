import 'server-only';
import { createHmac } from 'node:crypto';

export function mealReceipt(player: string, day: string, secret: string): string {
  return createHmac('sha256', secret).update(`${player}:${day}`).digest('hex');
}
