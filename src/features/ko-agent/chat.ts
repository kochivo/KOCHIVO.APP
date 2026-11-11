import 'server-only';
import { z } from 'zod';
import { uuidv7 } from '@/core/offline/ids';
import { koAudioTypes, koMaxAudio, koMaxText } from '@/features/ko-core';
import { createDemoPlan, executeDemoTool, isKoDemoOrigin } from './demo-plan';
import type { DemoPlan } from './demo-plan';
import { selectKoTool } from './gemini';

const demoCookie = 'kochivo_ko_demo';
const sessions = new Map<string, DemoPlan>();
const roleSchema = z.enum(['captain', 'player']);
const sessionSchema = z.uuidv7();
const maxBody = koMaxAudio + 4096;
const audioTypes = new Set<string>(koAudioTypes);

function reply(body: object, status = 200, id?: string) {
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (id) headers.set('Set-Cookie', `${demoCookie}=${id}; Path=/dev/ko; HttpOnly; SameSite=Strict`);
  return Response.json(body, { status, headers });
}

export async function postKoDemoChat(request: Request) {
  if (!isKoDemoOrigin(process.env.NODE_ENV, request.headers.get('host'), request.headers.get('origin'))) {
    return reply({ error: 'unavailable' }, 404);
  }
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return reply({ error: 'configuration' }, 503);
  const size = Number(request.headers.get('content-length'));
  if (!Number.isSafeInteger(size) || size <= 0) return reply({ error: 'invalid' }, 400);
  if (size > maxBody) return reply({ error: 'tooLarge' }, 413);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) return reply({ error: 'invalid' }, 415);
  const form = await request.formData().catch(() => null);
  const role = roleSchema.safeParse(form?.get('role'));
  const text = form?.get('text');
  const audio = form?.get('audio');
  if (!role.success || (text !== null && audio !== null)) return reply({ error: 'invalid' }, 400);
  let input: Parameters<typeof selectKoTool>[1];
  if (typeof text === 'string' && text.trim().length > 0 && text.length <= koMaxText) {
    input = { text: text.trim() };
  } else if (audio instanceof File && audio.size > 0 && audio.size <= koMaxAudio) {
    const mime = audio.type.split(';', 1)[0] ?? '';
    if (!audioTypes.has(mime)) return reply({ error: 'invalidAudio' }, 415);
    input = { audio: new Uint8Array(await audio.arrayBuffer()), mimeType: mime === 'audio/mp4' ? 'audio/m4a' : mime };
  } else {
    return reply({ error: 'invalid' }, 400);
  }

  const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)kochivo_ko_demo=([^;]+)/)?.[1];
  const saved = sessionSchema.safeParse(cookie);
  const existing = saved.success ? sessions.get(saved.data) : undefined;
  const plan = existing ?? createDemoPlan();
  const id = existing && saved.success ? saved.data : uuidv7();
  try {
    const call = await selectKoTool(role.data, input, key, request.signal);
    if (request.signal.aborted) return reply({ error: 'failed' }, 499);
    const result = call ? executeDemoTool(plan, role.data, call) : { kind: 'unsupported' };
    sessions.delete(id);
    sessions.set(id, plan);
    if (sessions.size > 100) {
      const oldest = sessions.keys().next().value;
      if (oldest) sessions.delete(oldest);
    }
    return reply(result, 200, id);
  } catch {
    return reply({ error: 'failed' }, 502);
  }
}
