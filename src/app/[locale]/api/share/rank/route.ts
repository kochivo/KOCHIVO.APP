import { rankImageResponse } from '@/features/share-card';
import { ranksEnabled } from '@/lib/ranks-enabled';

export async function GET(request: Request) {
  if (!ranksEnabled()) return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  return rankImageResponse(request);
}
