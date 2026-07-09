import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { getAdminInsights } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

export async function GET(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return jsonErr('forbidden', 403);
  }
  const { env } = getRequestContext();
  try {
    const range = new URL(request.url).searchParams.get('range');
    const data = await getAdminInsights(env, range);
    return jsonOk({ data });
  } catch (error) {
    console.error('admin/stats error:', error);
    return jsonErr('internal error');
  }
}
