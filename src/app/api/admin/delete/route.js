import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { deleteImgInfo } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';

export const runtime = 'edge';

export async function DELETE(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return jsonErr('forbidden', 403);
  }
  let { name } = await request.json();
  if (!name) {
    return jsonErr('invalid input', 400);
  }
  const { env } = getRequestContext();
  try {
    // 联动删 R2 对象 + 清 edge 缓存（仅 R2 存储的图片）
    if (typeof name === 'string' && name.startsWith('/rfile/') && env.IMGRS) {
      const key = name.slice('/rfile/'.length);
      try {
        await env.IMGRS.delete(key);
      } catch (e) {
        console.error('delete R2 object error:', e);
      }
      // 清 rfile edge 缓存，删除后原链接立即 404（注：仅清当前 CF 节点，全球其他节点需等 TTL）
      try {
        const req_url = new URL(request.url);
        await caches.default.delete(`${req_url.origin}/api/rfile/${key}`);
      } catch (e) {
        console.error('clear rfile cache error:', e);
      }
    }
    const setData = await deleteImgInfo(env, name);
    return jsonOk({ message: setData.success });
  } catch (error) {
    console.error('admin/delete error:', error);
    return jsonErr('internal error');
  }
}
