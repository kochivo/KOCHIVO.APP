export const LOCAL_USER_KEY = 'kochivo.local-user';

export function readRememberedUser(): string | null {
  try { return window.localStorage.getItem(LOCAL_USER_KEY); }
  catch { return null; }
}

export function rememberLocalUser(userId: string | null) {
  try {
    if (userId) window.localStorage.setItem(LOCAL_USER_KEY, userId);
    else window.localStorage.removeItem(LOCAL_USER_KEY);
  } catch { /* Local offline entry is unavailable when storage is blocked. */ }
}
