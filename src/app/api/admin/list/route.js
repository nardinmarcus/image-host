import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { searchImgInfo } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

export async function POST(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return jsonErr('forbidden', 403);
  }
  const { env } = getRequestContext();
  try {
    const body = await request.json();
    const { page, query, storage, kind, blocked } = body || {};
    const filters = { storage, kind, blocked };
    const { results, total } = await searchImgInfo(env, query, page, filters);
    return jsonOk({ data: results, page, total });
  } catch (error) {
    console.error('admin/list error:', error);
    return jsonErr('internal error');
  }
}
