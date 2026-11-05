export type DeviceRole = 'captain' | 'player';
const key = 'kochivo.role';

export function readDeviceRole(): DeviceRole | null {
  try {
    const role = window.localStorage.getItem(key);
    return role === 'captain' || role === 'player' ? role : null;
  } catch { return null; }
}

export function rememberDeviceRole(role: DeviceRole) {
  try { window.localStorage.setItem(key, role); }
  catch { /* Offline wording remains generic when storage is blocked. */ }
}

export function clearDeviceRole() {
  try { window.localStorage.removeItem(key); }
  catch { /* Sign-out must still work when storage is blocked. */ }
}
