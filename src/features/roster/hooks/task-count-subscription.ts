type Visibility = EventTarget & { readonly visibilityState: DocumentVisibilityState };

export function subscribeTaskCount(url: string, publish: (count: number) => void, fetcher: typeof fetch,
  focusTarget: EventTarget, visibility: Visibility) {
  const controller = new AbortController();
  let disposed = false, pending = false;
  async function refresh() {
    if (disposed || pending) return;
    pending = true;
    try {
      const response = await fetcher(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) return;
      const data: unknown = await response.json();
      if (!disposed && typeof data === 'object' && data !== null && 'count' in data
        && typeof data.count === 'number' && Number.isSafeInteger(data.count) && data.count >= 0)
        publish(data.count);
    } catch {
      // Keep the last good count through network, parsing and cancellation failures.
    } finally { pending = false; }
  }
  function onReturn() {
    if (visibility.visibilityState === 'visible') void refresh();
  }
  focusTarget.addEventListener('focus', onReturn);
  visibility.addEventListener('visibilitychange', onReturn);
  return { refresh, dispose() {
    disposed = true;
    controller.abort();
    focusTarget.removeEventListener('focus', onReturn);
    visibility.removeEventListener('visibilitychange', onReturn);
  } };
}
