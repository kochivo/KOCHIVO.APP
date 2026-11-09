import { notFound } from 'next/navigation';
import { postKoDemoChat } from '@/features/ko-agent';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return postKoDemoChat(request);
}
