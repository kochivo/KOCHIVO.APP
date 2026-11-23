import type { KoTurn } from '@/features/ko-agent';
import type { Approval } from './approval';
import { verifyApproval } from './approval';
import { swapPayloadSchema } from './swap';

const swapCookie = 'ko_swap_options';

// The signed swap_options approval behind the ko_swap_options cookie (or the
// token form field), verified exactly as the confirm branch verifies its own.
export function readSwapApproval(request: Request, token: unknown, actorId: string, now: number, secret: string): Approval | null {
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${swapCookie}=`))?.slice(swapCookie.length + 1);
  const signed = typeof token === 'string' ? token : cookie;
  return signed ? verifyApproval(signed, actorId, now, secret) : null;
}

// A bare number is a swap choice only when a valid swap_options approval
// exists for this player, the number is a valid choice for its options, and
// it is not an answer to a previous KO question. The swap question itself
// ends with a full stop, so a trailing '?' means the number answers
// something else. Anything else falls through to normal answering.
export function isValidSwapChoice(action: Approval | null, actorId: string, text: string, history: readonly KoTurn[]): boolean {
  if (!action || action.kind !== 'swap_options' || action.player !== actorId) return false;
  const lastTurn = history.at(-1);
  if (lastTurn?.role === 'ko' && /[?؟]\s*$/.test(lastTurn.text)) return false;
  // Same Latin-digit normalisation as chooseSwap; no second mapping.
  const choice = text.trim().replace(/[١٢٣]/g, digit => String('١٢٣'.indexOf(digit) + 1));
  const parsed = swapPayloadSchema.safeParse(action.payload);
  return parsed.success && /^[1-9]$/.test(choice) && Number(choice) <= parsed.data.options.length;
}
