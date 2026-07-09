import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { getMediaDetail } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

/** 单一资源的元数据与访问表现，原始 IP 仍只留在访问日志页。 */
export async function GET(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return jsonErr('forbidden', 403);

  const params = new URL(request.url).searchParams;
  const url = params.get('url') || '';
  if (!url || url.length > 2048) return jsonErr('invalid url', 400);

  try {
    const { env } = getRequestContext();
    const data = await getMediaDetail(env, url, params.get('range'));
    if (!data) return jsonErr('not found', 404);
    return jsonOk({ data });
  } catch (error) {
    console.error('admin/resource error:', error);
    return jsonErr('internal error');
  }
}
