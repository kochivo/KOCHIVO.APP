'use client';
import { loadSettings } from './settings';

export async function loadCaptainSettings() {
  const result = await loadSettings();
  if (!result.data) throw new Error(result.error);
  return result.data;
}
