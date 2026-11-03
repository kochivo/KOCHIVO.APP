/** Keep the synchronous singleton available to existing callers without loading it at first paint. */
export async function loadSupabaseBrowser() {
  const { supabaseBrowser } = await import('./browser');
  return supabaseBrowser();
}
