import { loadTasks } from '@/features/captain-workspace/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const { tasks } = await loadTasks();
    return Response.json({ count: tasks.length }, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthenticated')
      return Response.json({ count: null }, { status: 401, headers });
    console.error('Unable to load captain task count', error);
    return Response.json({ count: null }, { status: 500, headers });
  }
}
