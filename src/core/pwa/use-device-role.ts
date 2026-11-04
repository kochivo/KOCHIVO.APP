'use client';
import { useEffect } from 'react';
import { rememberDeviceRole } from './device-role';
import type { DeviceRole } from './device-role';

export function useDeviceRole(role: DeviceRole) {
  useEffect(() => { rememberDeviceRole(role); }, [role]);
}
