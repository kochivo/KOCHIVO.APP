import { captureFeedback, flush, getClient } from '@sentry/nextjs';
import type { DeviceRole } from '@/core/pwa/device-role';

// Import this module on submit so only these SDK exports enter the client graph.
export async function captureUserFeedback(input: { message: string; url: string; role: DeviceRole; id: string }): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  let eventId: string | undefined;
  let delivered = false;
  const unsubscribe = client.on('afterSendEvent', (event, response) => {
    if (event.event_id === eventId) {
      const status = response?.statusCode ?? 0;
      delivered = status >= 200 && status < 300;
    }
  });
  try {
    // This SDK returns an id immediately, even when delivery later fails.
    eventId = captureFeedback({ message: input.message, url: input.url }, {
      captureContext: { tags: { role: input.role }, user: { id: input.id } },
    });
    const flushed = await flush(5000);
    return flushed && delivered;
  } finally { unsubscribe(); }
}
