import { rankImageResponse } from '@/features/share-card';

export async function GET(request: Request) {
  return rankImageResponse(request);
}
