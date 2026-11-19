import { getTimezone } from '@/core/timezone/server';
import 'server-only';
import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import { getArabicStyle } from '@/core/i18n/server';
import { runTool } from '@/features/ai-tools/server';
import type { AccountAction } from '@/features/ko-core';
import { localDate } from '@/lib/dates';
import type { KoMedia } from '@/features/ko-agent';
import { maxHistoryChars, parseHistory } from '@/features/ko-agent';
import { koPreviewMessages } from '@/features/ko-core';
import { getKoActor, resolvePlayer } from './account';
import type { KoActor } from './account';
import { approvalLifetimeMs, mealLogPayload, verifyApproval } from './approval';
import { mealToolContext } from './log-meal';
import { koAccountConfig } from '@/features/ko-entry/server';
import { commitApproval, executeIntent, say } from './execute';
import { groundIntent } from './ground';
import { planIntent } from './intents';
import { normalizeName } from './match';
import { messages } from '../messages';
import { mealReceipt } from './meal-receipt';
import { chooseSwap } from './swap';
import type { AccountReply } from './execute';

const maxImage = 3_000_000;
const maxAudio = 1_000_000;
const audioTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/wav']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const contextSchema = z.discriminatedUnion('screen', [
  z.strictObject({ screen: z.literal('player'), playerId: z.uuid() }),
  z.strictObject({ screen: z.literal('program'), programId: z.uuid() }),
  z.strictObject({ screen: z.enum(['home', 'inbox', 'nutrition']) }),
]);

export async function resolveContext(actor: KoActor, raw: unknown) {
  let value: unknown;
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return undefined; }
  const parsed = contextSchema.safeParse(value);
  if (!parsed.success || parsed.data.screen !== 'player') return undefined;
  const id = parsed.data.playerId;
  if (actor.role === 'player') return id === actor.id ? await resolvePlayer(actor, undefined) ?? undefined : undefined;
  const { data, error } = await actor.db.rpc('captain_roster');
  if (error) throw error;
  // Take the roster row by id; a name lookup would drop players who share a name.
  const row = data.find(player => player.player_id === id);
  return row ? { id: row.player_id, name: row.full_name } : undefined;
}

const reply = (data: object, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const swapCookie = 'ko_swap_options';
function playerReply(result: AccountReply, secure: boolean) {
  if (result.kind === 'confirm') return reply(result);
  const { optionsToken: token, ...body } = result;
  const response = reply(body);
  // Swap choices travel in an HttpOnly cookie.
  response.headers.set('Set-Cookie', `${swapCookie}=${token ?? ''}; Path=/api/ko; HttpOnly; SameSite=Strict; Max-Age=${token ? 600 : 0}${secure ? '; Secure' : ''}`);
  return response;
}

async function rateLimited(actor: KoActor) {
  try {
    const { data, error } = await actor.db.rpc('ko_rate_take', { p_limit: 12, p_window_seconds: 60 });
    if (error) { console.error('KO rate limit failed', error); return true; }
    return data !== true;
  } catch (error) {
    console.error('KO rate limit failed', error);
    return true;
  }
}

export async function postKoAccountChat(request: Request) {
  const config = koAccountConfig();
  if (!config || request.headers.get('origin') !== config.origin.origin || request.headers.get('host') !== config.origin.host) {
    return reply({ error: 'unavailable' }, 404);
  }
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxImage + 70_000 + maxHistoryChars * 4 ||
      !request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'invalid' }, 400);

  try {
    const actor = await getKoActor();
    if (!actor || !config.pilots.has(actor.id)) return reply({ error: 'unauthorized' }, 403);
    const now = Date.now();
    if (await rateLimited(actor)) return reply({ error: 'rateLimit' }, 429);
    const form = await request.formData().catch(() => null);
    if (!form) return reply({ error: 'invalid' }, 400);
    const locale = form.get('locale') === 'en' ? 'en' : 'ar';
    const style = locale === 'ar' ? await getArabicStyle() : undefined;
    const t = createT(messages, locale);
    const actionT = createT(messages, locale, style);
    const entry = form.get('text');
    const audio = form.get('audio');
    const photo = form.get('photo');
    const token = form.get('token');
    if (form.get('contextOnly') === '1') {
      const contextPlayer = await resolveContext(actor, form.get('context'));
      return reply({ name: contextPlayer?.name ?? null });
    }
    if ((entry !== null && typeof entry !== 'string') || (typeof entry === 'string' && entry.length > 500) ||
        (audio !== null && photo !== null)) return reply({ error: 'invalid' }, 400);
    const text = typeof entry === 'string' ? entry.trim() : '';
    const command = normalizeName(text);
    const explicitConfirm = form.get('confirm') === '1';
    if (explicitConfirm || (!audio && !photo && ['نفذ', 'تمام نفذ', 'confirm', 'approve'].includes(command))) {
      const expired = () => reply(say(actionT('expired')), explicitConfirm || typeof token === 'string' ? 410 : 200);
      const action = typeof token === 'string' ? verifyApproval(token, actor.id, now, config.secret) : null;
      if (!action || audio || photo || action.kind === 'swap_options') return expired();
      if (action.kind === 'meal_log') {
        if (actor.role !== 'player' || action.player !== actor.id) return expired();
        const payload = mealLogPayload.safeParse(action.payload);
        if (!payload.success) return expired();
        const { mealId, eaten, name } = payload.data;
        const ctx = await mealToolContext(actor, now, request.signal);
        // Keep the meal on the day the player reviewed, including across local midnight.
        const result = await runTool({ ...ctx, now: new Date(action.expires - approvalLifetimeMs) }, 'log_my_meal', { mealId, eaten });
        return result.ok ? reply(say(actionT(eaten ? 'mealEaten' : 'mealSkipped', { name }))) : reply(say(actionT('mealLogFailed')), 409);
      }
      if (actor.role !== 'captain' || typeof token !== 'string') return expired();
      try {
        const result = await commitApproval(actor, action, token, locale, style);
        return reply(result, result.text === actionT('changed') ? 409 : 200);
      } catch {
        return reply(say(actionT('actionFailed')), 502);
      }
    }
    const history = parseHistory(form.get('history'));
    const contextPlayer = await resolveContext(actor, form.get('context'));
    if (actor.role === 'player' && !audio && !photo && /^[0-9٠-٩]+$/.test(text)) {
      const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim())
        .find(part => part.startsWith(`${swapCookie}=`))?.slice(swapCookie.length + 1);
      const signed = typeof token === 'string' ? token : cookie;
      const action = signed ? verifyApproval(signed, actor.id, now, config.secret) : null;
      const result = actor.role === 'player' && action?.kind === 'swap_options' && action.player === actor.id
        ? await chooseSwap(actor, action.payload, text, locale) : say(t('expired'));
      return playerReply(result, config.origin.protocol === 'https:');
    }
    const suggestions = createT(koPreviewMessages, locale);
    if (!audio && !photo && text === suggestions('suggest.meal') && actor.role === 'player')
      return playerReply(await executeIntent(actor, { kind: 'read_nutrition', args: {} }, locale, config.secret, now), config.origin.protocol === 'https:');

    let media: KoMedia | undefined;
    const file = photo ?? audio;
    if (file !== null) {
      const photoRequest = photo !== null;
      if (!(file instanceof File) || file.size <= 0 || file.size > (photoRequest ? maxImage : maxAudio) ||
          (photoRequest && actor.role !== 'player')) return reply({ error: 'invalid' }, 400);
      const type = file.type.split(';', 1)[0] ?? '';
      if (!(photoRequest ? imageTypes : audioTypes).has(type)) return reply({ error: 'invalid' }, 415);
      media = { data: new Uint8Array(await file.arrayBuffer()), mimeType: type === 'audio/mp4' ? 'audio/m4a' : type };
    }
    if (!text && !media) return reply({ error: 'invalid' }, 400);
    const planned = await planIntent(actor.role, { text, media }, config.key, request.signal, contextPlayer?.name, history);
    const lastTurn = history.at(-1);
    const question = lastTurn?.role === 'ko' && /[?؟]\s*$/.test(lastTurn.text) ? lastTurn.text : '';
    const exclusive = planned.find(intent => intent.kind === 'meal_photo' || intent.kind === 'swap_exercise');
    const intents = (exclusive ? [exclusive] : planned).map(intent =>
      text ? groundIntent(intent, question ? question + '\n' + text : text) : intent);
    const texts: string[] = [];
    const actions: AccountAction[] = [];
    let optionsToken: string | undefined;
    for (const intent of intents) {
      const item = await executeIntent(actor, intent, locale, config.secret, now, contextPlayer, request.signal, style);
      if (item.text) texts.push(item.text);
      if (item.kind === 'message') {
        actions.push(...(item.actions ?? []));
        optionsToken = item.optionsToken;
      }
    }
    const result = {
      kind: 'message' as const,
      text: texts.join('\n\n') || (actions.length ? actionT(actions.length > 1 ? 'actionsReady' : 'actionReady') : t('unclear')),
      ...(actions.length && { actions }),
      ...(optionsToken && { optionsToken }),
    };
    if (photo && actor.role === 'player' && exclusive?.kind === 'meal_photo') {
      const secret = process.env.KO_MEAL_RECEIPT_SECRET;
      if (!secret) console.warn('Meal points skipped: KO_MEAL_RECEIPT_SECRET is missing');
      else {
        try {
          const day = localDate(new Date(now), await getTimezone());
          const { error } = await actor.db.rpc('award_meal_check', { p_day: day, p_receipt: mealReceipt(actor.id, day, secret) });
          if (error) console.warn('Meal points award failed');
        } catch { console.warn('Meal points award failed'); }
      }
    }
    return actor.role === 'player' ? playerReply(result, config.origin.protocol === 'https:') : reply(result);
  } catch {
    return reply({ error: 'failed' }, 502);
  }
}
