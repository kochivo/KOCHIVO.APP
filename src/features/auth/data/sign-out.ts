'use server';
import { authClient, runAction } from './auth-client';

export async function signOut() {
  return runAction(async () => {
    const { error } = await (await authClient()).auth.signOut();
    if (error) throw error;
    return { redirect: '/login' };
  });
}
