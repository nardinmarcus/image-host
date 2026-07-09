import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { getTopStats } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

// Top20 访问统计（IP / Referer / 图片 URL），README 承诺但原代码缺失的功能
export async function GET(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return jsonErr('forbidden', 403);
  }
  const { env } = getRequestContext();
  try {
    const [ips, referers, imgs] = await Promise.all([
      getTopStats(env, 'ip'),
      getTopStats(env, 'referer'),
      getTopStats(env, 'url'),
    ]);
    return jsonOk({ data: { ips, referers, imgs } });
  } catch (error) {
    console.error('admin/stats error:', error);
    return jsonErr('internal error');
  }
}
