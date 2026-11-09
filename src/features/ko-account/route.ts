import 'server-only';
import { z } from 'zod';
import { createT } from '@/core/i18n/messages';
import type { KoMedia } from '@/features/ko-agent';
import { koPreviewMessages } from '@/features/ko-preview';
import { getKoActor, resolvePlayer } from './account';
import type { KoActor } from './account';
import { verifyApproval } from './approval';
import { koAccountConfig } from '@/features/ko-entry';
import { commitApproval, executeIntent, say } from './execute';
import { planIntent } from './intents';
import { normalizeName } from './match';
import { messages } from './messages';
import { chooseSwap } from './swap';
import type { AccountReply } from './execute';

const maxImage = 3_000_000;
const maxAudio = 1_000_000;
const audioTypes = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/wav']);
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const windowMs = 60_000;
const usage = new Map<string, { count: number; until: number }>();

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
  const token = result.kind === 'message' ? result.optionsToken : undefined;
  const response = reply({ kind: result.kind, text: result.text });
  // Keep options with the browser without changing the shared chat's captain confirmation flow.
  response.headers.set('Set-Cookie', `${swapCookie}=${token ?? ''}; Path=/api/ko; HttpOnly; SameSite=Strict; Max-Age=${token ? 600 : 0}${secure ? '; Secure' : ''}`);
  return response;
}

function rateLimited(actor: string, now: number) {
  const current = usage.get(actor);
  if (current && current.until > now) {
    current.count += 1;
    return current.count > 12;
  }
  for (const [id, entry] of usage) if (entry.until <= now) usage.delete(id);
  if (usage.size >= 500) return true;
  usage.set(actor, { count: 1, until: now + windowMs });
  return false;
}

export async function postKoAccountChat(request: Request) {
  const config = koAccountConfig();
  if (!config || request.headers.get('origin') !== config.origin.origin || request.headers.get('host') !== config.origin.host) {
    return reply({ error: 'unavailable' }, 404);
  }
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxImage + 70_000 ||
      !request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'invalid' }, 400);

  try {
    const actor = await getKoActor();
    if (!actor || !config.pilots.has(actor.id)) return reply({ error: 'unauthorized' }, 403);
    const now = Date.now();
    if (rateLimited(actor.id, now)) return reply({ error: 'rateLimit' }, 429);
    const form = await request.formData().catch(() => null);
    if (!form) return reply({ error: 'invalid' }, 400);
    const locale = form.get('locale') === 'en' ? 'en' : 'ar';
    const t = createT(messages, locale);
    const entry = form.get('text');
    const audio = form.get('audio');
    const photo = form.get('photo');
    const token = form.get('token');
    const contextPlayer = await resolveContext(actor, form.get('context'));
    if (form.get('contextOnly') === '1') return reply({ name: contextPlayer?.name ?? null });
    if ((entry !== null && typeof entry !== 'string') || (typeof entry === 'string' && entry.length > 500) ||
        (audio !== null && photo !== null)) return reply({ error: 'invalid' }, 400);
    const text = typeof entry === 'string' ? entry.trim() : '';
    if (actor.role === 'player' && !audio && !photo && /^[0-9٠-٩]+$/.test(text)) {
      const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim())
        .find(part => part.startsWith(`${swapCookie}=`))?.slice(swapCookie.length + 1);
      const signed = typeof token === 'string' ? token : cookie;
      const action = signed ? verifyApproval(signed, actor.id, now, config.secret) : null;
      const result = actor.role === 'player' && action?.kind === 'swap_options' && action.player === actor.id
        ? await chooseSwap(actor, action.payload, text, locale) : say(t('expired'));
      return playerReply(result, config.origin.protocol === 'https:');
    }
    const command = normalizeName(text);
    const suggestions = createT(koPreviewMessages, locale);
    if (!audio && !photo && text === suggestions('suggest.meal') && actor.role === 'player')
      return playerReply(await executeIntent(actor, { kind: 'read_nutrition', args: {} }, locale, config.secret, now), config.origin.protocol === 'https:');
    if (!audio && !photo && (command === 'نفذ' || command === 'تمام نفذ' || command === 'confirm' || command === 'approve')) {
      if (typeof token !== 'string' || actor.role !== 'captain') return reply(say(t('expired')));
      const action = verifyApproval(token, actor.id, now, config.secret);
      if (!action || action.kind === 'swap_options') return reply(say(t('expired')));
      return reply(await commitApproval(actor, action, token, locale));
    }

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
    const intent = await planIntent(actor.role, { text, media }, config.key, request.signal, contextPlayer?.name);
    const result = intent ? await executeIntent(actor, intent, locale, config.secret, now, contextPlayer) : say(t('unclear'));
    return actor.role === 'player' ? playerReply(result, config.origin.protocol === 'https:') : reply(result);
  } catch {
    return reply({ error: 'failed' }, 502);
  }
}
