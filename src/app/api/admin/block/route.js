import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { updateRating } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

export async function PUT(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return jsonErr('forbidden', 403);
  }
  let { rating, name } = await request.json();
  if (!Number.isInteger(rating) || !name) {
    return jsonErr('invalid input', 400);
  }
  const { env } = getRequestContext();
  try {
    const setData = await updateRating(env, name, rating);
    return jsonOk({ message: setData.success });
  } catch (error) {
    console.error('admin/block error:', error);
    return jsonErr('internal error');
  }
}
