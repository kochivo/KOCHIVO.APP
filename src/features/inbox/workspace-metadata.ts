import 'server-only';
import { getT } from '@/core/i18n/server';
import { workspaceMessages } from './workspace-messages';
export async function workspaceTitle() { return (await getT(workspaceMessages))('title'); }
