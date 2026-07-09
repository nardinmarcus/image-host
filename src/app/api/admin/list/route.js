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
    let { page, query } = await request.json();
    const { results, total } = await searchImgInfo(env, query, page);
    return jsonOk({ data: results, page, total });
  } catch (error) {
    console.error('admin/list error:', error);
    return jsonErr('internal error');
  }
}
