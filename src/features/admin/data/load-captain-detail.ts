'use server';
import { fetchCaptainDetail } from './dashboard';

// Server action for the client side panel; fetchCaptainDetail checks the admin role on every call.
export async function loadCaptainDetail(captainId: string) {
  return fetchCaptainDetail(captainId);
}
