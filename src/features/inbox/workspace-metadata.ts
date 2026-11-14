import 'server-only';
import { getT } from '@/core/i18n/server';
import { conversationMessages } from './conversation-messages';
export async function workspaceTitle() { return (await getT(conversationMessages))('title'); }
