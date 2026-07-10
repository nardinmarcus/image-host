export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { generateApiKey } from '@/lib/apiKeys';
import {
  listApiKeys,
  createApiKey,
  setApiKeyEnabled,
  deleteApiKey,
} from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';
import { nowTime } from '@/lib/time';

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') return null;
  return session;
}

/** 列出 API Keys（不含明文） */
export async function GET() {
  if (!(await requireAdmin())) return jsonErr('forbidden', 403);
  const { env } = getRequestContext();
  try {
    const keys = await listApiKeys(env);
    return jsonOk({ data: keys });
  } catch (e) {
    console.error('apikeys list error:', e);
    return jsonErr('internal error');
  }
}

/** 创建 Key；响应里 raw 只返回一次 */
export async function POST(request) {
  if (!(await requireAdmin())) return jsonErr('forbidden', 403);
  const { env } = getRequestContext();
  try {
    const body = await request.json().catch(() => ({}));
    const name = (body.name || 'default').toString().slice(0, 64);
    const { raw, prefix, hash } = await generateApiKey();
    const createdAt = await nowTime();
    await createApiKey(env, {
      name,
      keyPrefix: prefix,
      keyHash: hash,
      createdAt,
    });
    return jsonOk({
      data: {
        name,
        key_prefix: prefix,
        created_at: createdAt,
        // 明文仅此一次
        api_key: raw,
      },
      message: 'save this api_key now; it will not be shown again',
    });
  } catch (e) {
    console.error('apikeys create error:', e);
    return jsonErr('internal error');
  }
}

/** 启用/禁用 { id, enabled } */
export async function PUT(request) {
  if (!(await requireAdmin())) return jsonErr('forbidden', 403);
  const { env } = getRequestContext();
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return jsonErr('invalid id', 400);
    await setApiKeyEnabled(env, id, !!body.enabled);
    return jsonOk({ message: 'updated' });
  } catch (e) {
    console.error('apikeys put error:', e);
    return jsonErr('internal error');
  }
}

/** 删除 { id } */
export async function DELETE(request) {
  if (!(await requireAdmin())) return jsonErr('forbidden', 403);
  const { env } = getRequestContext();
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) return jsonErr('invalid id', 400);
    await deleteApiKey(env, id);
    return jsonOk({ message: 'deleted' });
  } catch (e) {
    console.error('apikeys delete error:', e);
    return jsonErr('internal error');
  }
}
