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
    // 联动删 R2 对象（仅 R2 存储的图片），IMGRS 未配置或对象不存在则忽略
    if (typeof name === 'string' && name.startsWith('/rfile/') && env.IMGRS) {
      try {
        await env.IMGRS.delete(name.slice('/rfile/'.length));
      } catch (e) {
        console.error('delete R2 object error:', e);
      }
    }
    const setData = await deleteImgInfo(env, name);
    return jsonOk({ message: setData.success });
  } catch (error) {
    console.error('admin/delete error:', error);
    return jsonErr('internal error');
  }
}
