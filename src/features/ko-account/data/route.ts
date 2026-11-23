import { getTimezone } from '@/core/timezone/server';
import { uuidv7 } from '@/core/offline/ids';
import 'server-only';
import { createT } from '@/core/i18n/messages';
import { getArabicStyle } from '@/core/i18n/server';
import { runTool } from '@/features/ai-tools/server';
import { hasPendingStartForm } from '@/features/player-shell/server';
import type { AccountAction, AnswerSource } from '@/features/ko-core';
import { localDate } from '@/lib/dates';
import { KoModelError, maxHistoryChars, parseHistory } from '@/features/ko-agent';
import { koPreviewMessages } from '@/features/ko-core';
import { getKoActor } from './account';
import { resolveContext } from './context';
import type { KoActor } from './account';
import { approvalLifetimeMs, mealLogPayload, verifyApproval } from './approval';
import { confirmMealApproval, mealToolContext } from './log-meal';
import { koAccountConfig } from '@/features/ko-entry/server';
import { commitApproval, executeIntent, say } from './execute';
import { reviewAnswer } from './answer-guard';
import { chatReply as reply } from './reply';
import { appendMemoryFacts, loadFacts } from './facts';
import { readChatMemory, rememberFromPlan } from './chat-memory';
import { maxImage, readChatMedia } from './chat-media';
import { feedbackIntents } from './feedback';
import { groundIntent } from './ground';
import { planIntent } from './intents';
import { normalizeName } from './match';
import { messages } from '../messages';
import { mealReceipt } from './meal-receipt';
import { verifyKoApprovalSecret } from './secret-check';
import { chooseSwap } from './swap';
import { isValidSwapChoice, readSwapApproval } from './numeric-swap';
import type { AccountReply } from './execute';
import { isBigAction } from './limits';
import { creditsOut, readCredits, refundTakenCredit, refundTakenUsage, takeCredit, takeUsage } from './usage';
import { quickKeys, readQuick } from './quick';

export { resolveContext } from './context';

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
    if (config) console.warn('KO request origin or host does not match KO_ORIGIN', { origin: request.headers.get('origin'), host: request.headers.get('host') });
    return reply({ error: 'unavailable' }, 404);
  }
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxImage + 70_000 + maxHistoryChars * 4 ||
      !request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'invalid' }, 400);

  try {
    const actor = await getKoActor();
    if (!actor || !config.pilots.has(actor.id)) return reply({ error: 'unauthorized' }, 403);
    // The approval secret signs approval tokens and the usage-warning proof,
    // so its mismatch fails KO loudly before any usage is taken. The
    // meal-receipt secret only signs the meal-points award at the end of a
    // meal reply, so a missing or mismatched meal secret never blocks the
    // reply itself — the award is skipped with a warning instead.
    if ((await verifyKoApprovalSecret(actor, config)).length) return reply({ error: 'unavailable' }, 404);
    const now = Date.now();
    const form = await request.formData().catch(() => null);
    if (!form) return reply({ error: 'invalid' }, 400);
    const locale = form.get('locale') === 'en' ? 'en' : 'ar';
    const style = locale === 'ar' ? await getArabicStyle() : undefined;
    const t = createT(messages, locale);
    const actionT = createT(messages, locale, style);
    if (form.get('usage') === '1') {
      if (actor.role !== 'captain') return reply({ error: 'unauthorized' }, 403);
      const { used, cap, month } = await readCredits(actor, locale);
      return reply({ used, cap, month });
    }
    if (await rateLimited(actor)) return reply({ error: 'rateLimit' }, 429);
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
    const quick = quickKeys.find(key => text === actionT(key) || text === t(key));
    const quickProgress = quick === 'quickProgress' && !audio && !photo && !explicitConfirm;
    const formPending = actor.role === 'player' && !quickProgress && (explicitConfirm || Boolean(text || audio || photo)) &&
      await hasPendingStartForm(actor.db, actor.id);
    const formReply = () => playerReply(say(actionT('startFormPending')), config.origin.protocol === 'https:');
    if (explicitConfirm || (!audio && !photo && ['نفذ', 'تمام نفذ', 'confirm', 'approve'].includes(command))) {
      const expired = () => reply(say(actionT('expired')), explicitConfirm || typeof token === 'string' ? 410 : 200);
      const action = typeof token === 'string' ? verifyApproval(token, actor.id, now, config.secret) : null;
      if (typeof token !== 'string' || !action || audio || photo || action.kind === 'swap_options') return expired();
      if (action.kind === 'meal_log') {
        if (actor.role !== 'player' || action.player !== actor.id) return expired();
        if (formPending) return formReply();
        const payload = mealLogPayload.safeParse(action.payload);
        if (!payload.success) return expired();
        const { mealId, eaten, name } = payload.data;
        const ctx = await mealToolContext(actor, now, request.signal);
        // Keep the meal on the day the player reviewed, including across local midnight.
        const result = await runTool({ ...ctx, now: new Date(action.expires - approvalLifetimeMs), confirmMeal: confirmMealApproval(actor, token) },
          'log_my_meal', { mealId, eaten });
        if (result.ok && result.data && typeof result.data === 'object' && 'replayed' in result.data) return expired();
        return result.ok ? reply(say(actionT(eaten ? 'mealEaten' : 'mealSkipped', { name }))) : reply(say(actionT('mealLogFailed')), 409);
      }
      if (actor.role !== 'captain') return expired();
      let creditTaken = false;
      try {
        creditTaken = isBigAction(action.kind) && (await takeCredit(actor, await readCredits(actor, locale), token));
        if (isBigAction(action.kind) && !creditTaken) return reply(creditsOut(await readCredits(actor, locale), actionT), 409);
        const result = await commitApproval(actor, action, token, locale, style);
        // 40001 means the prescription changed before ko_apply_action wrote
        // anything: its receipt insert rolls back with the failed call, so the
        // action did not apply and the credit is refunded. An action applied
        // by another device returns 'replayed', never 40001, so it is not
        // refunded here (and the receipt would block the refund anyway).
        if (creditTaken && result.text === actionT('changed')) await refundTakenCredit(actor, creditTaken, now, token);
        return reply(result, result.text === actionT('changed') ? 409 : 200);
      } catch {
        await refundTakenCredit(actor, creditTaken, now, token);
        return reply(say(actionT('actionFailed')), 502);
      }
    }
    if (actor.role === 'player' && !audio && !photo && /^[0-9٠-٩]+$/.test(text)) {
      const action = readSwapApproval(request, token, actor.id, now, config.secret);
      if (isValidSwapChoice(action, actor.id, text, parseHistory(form.get('history')))) {
        if (formPending) return formReply();
        return playerReply(await chooseSwap(actor, action?.payload, text, locale), config.origin.protocol === 'https:');
      }
    }
    const suggestions = createT(koPreviewMessages, locale);
    if (!audio && !photo && quick) {
      if (formPending) return formReply();
      const player = actor.role === 'captain' ? await resolveContext(actor, form.get('context')) : undefined;
      return reply({ ...say(await readQuick(actor, quick, locale, now, request.signal, actionT, player)), feedbackIntent: 'quick' });
    }
    if (!audio && !photo && text === suggestions('suggest.meal') && actor.role === 'player') {
      if (formPending) return formReply();
      const item = await executeIntent(actor, { kind: 'read_nutrition', args: {} }, locale, config.secret, now);
      return playerReply(item.kind === 'message' ? { ...item, feedbackIntent: 'quick' } : item, config.origin.protocol === 'https:');
    }
    const { media, status } = await readChatMedia(photo ?? audio, photo !== null, actor.role);
    if (status) return reply({ error: 'invalid' }, status);
    if (!text && !media) return reply({ error: 'invalid' }, 400);
    // Usage is taken before Gemini so an account at its cap never spends the shared free-tier quota.
    // A busy or failing Gemini is refunded below, so it costs the user nothing.
    const refundKey = uuidv7(now);
    const usageTaken = await takeUsage(actor, now, photo !== null, config.secret) === 'ok';
    if (!usageTaken) {
      return reply({ kind: 'message', text: actionT('limitReached'), quick: quickKeys.map(key => actionT(key)) });
    }
    const history = parseHistory(form.get('history'));
    const contextPlayer = await resolveContext(actor, form.get('context'));
    const [accountFacts, memoryState] = await Promise.all([
      process.env.KO_ANSWER === '0' || photo || formPending ? undefined
        : loadFacts(actor, now, request.signal, contextPlayer).catch(() => undefined),
      readChatMemory(actor, !photo && !formPending, contextPlayer?.id),
    ]);
    const facts = accountFacts === undefined ? undefined : appendMemoryFacts(accountFacts, memoryState.memories.map(row => row.text));
    const planned = await planIntent(actor.role, { text, media }, config.key, request.signal, contextPlayer?.name, history, fetch, facts, memoryState.learning)
      .catch(async (error: unknown) => {
        if (!(error instanceof KoModelError) || (error.status !== 429 && error.status !== 503)) {
          // Any other planIntent throw (timeout, 502, network) is a Gemini
          // failure too, so the taken usage is refunded here — not in the
          // outer catch, which also covers executeIntent throws where intents
          // may already have partially executed.
          await refundTakenUsage(actor, usageTaken, now, photo !== null, refundKey);
          throw error;
        }
        console.warn('KO model busy', error.status);
        return error.status;
      });
    if (planned === 429 || planned === 503) {
      await refundTakenUsage(actor, usageTaken, now, photo !== null, refundKey);
      if (planned === 429) return reply({ kind: 'message', text: actionT('koBusy'), quick: quickKeys.map(key => actionT(key)) });
      return reply(say(actionT('koBusyNow')));
    }
    const lastTurn = history.at(-1);
    const question = lastTurn?.role === 'ko' && /[?؟]\s*$/.test(lastTurn.text) ? lastTurn.text : '';
    const exclusive = planned.find(intent => intent.kind === 'meal_photo' || intent.kind === 'swap_exercise');
    const intents = (exclusive ? [exclusive] : planned).map(intent =>
      text ? groundIntent(intent, question ? question + '\n' + text : text) : intent);
    if (formPending && !intents.every(({ kind }) => kind === 'my_progress' || kind === 'why_not_counted')) return formReply();
    const texts: string[] = [];
    const actions: AccountAction[] = [];
    const sources = new Set<AnswerSource>();
    let feedbackIntent: string | undefined;
    let optionsToken: string | undefined;
    let upgrade: Extract<AccountReply, { kind: 'message' }>['upgrade'];
    let credits: Awaited<ReturnType<typeof readCredits>> | undefined;
    for (let intent of intents) {
      if (intent.kind === 'remember') continue;
      if (intent.kind === 'answer') {
        const answer = reviewAnswer(intent.args, facts ?? '', text);
        if (answer.ok) {
          feedbackIntent ??= intent.kind;
          texts.push(answer.text);
          for (const source of answer.sources) sources.add(source);
          continue;
        }
        console.warn('KO answer guard', answer.reason);
        intent = answer.fallback;
      }
      const big = isBigAction(intent.kind);
      if (big && actor.role === 'captain') {
        credits ??= await readCredits(actor, locale);
        if (credits.used >= credits.cap) {
          const blocked = creditsOut(credits, actionT);
          if (!texts.includes(blocked.text)) {
            texts.push(blocked.text);
            upgrade = blocked.upgrade;
          }
          continue;
        }
      }
      const item = await executeIntent(actor, intent, locale, config.secret, now, contextPlayer, request.signal, style);
      feedbackIntent ??= feedbackIntents.find(kind => kind === intent.kind);
      if (item.text) texts.push(item.text);
      if (item.kind === 'message') {
        actions.push(...(item.actions ?? []).map(action => big
          ? { ...action, detail: `${action.detail}\n${actionT('creditCost')}` } : action));
        optionsToken = item.optionsToken;
      }
    }
    const memory = await rememberFromPlan(actor, planned, memoryState, now);
    const result = {
      kind: 'message' as const,
      text: texts.join('\n\n') || (actions.length ? actionT(actions.length > 1 ? 'actionsReady' : 'actionReady') : t('unclear')),
      ...(actions.length && { actions }),
      ...(sources.size && { sources: [...sources].slice(0, 4) }),
      ...(optionsToken && { optionsToken }),
      ...(upgrade && { upgrade }),
      ...(memory && { memory }),
      ...(feedbackIntent && !actions.length && !upgrade && { feedbackIntent }),
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
