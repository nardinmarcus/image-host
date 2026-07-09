export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { extractApiKeyFromRequest, hashApiKey } from '@/lib/apiKeys';
import { findEnabledApiKeyByHash } from '@/lib/db';
import { corsHeaders, jsonErr } from '@/lib/http';
import { uploadFileToR2 } from '@/lib/uploadR2';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}

/**
 * 开放上传 API
 * POST multipart: file=@...
 * Header: Authorization: Bearer ih_xxx  或  X-API-Key: ih_xxx
 */
export async function POST(request) {
  const rawKey = extractApiKeyFromRequest(request);
  if (!rawKey) {
    return jsonErr('missing api key (use Authorization: Bearer or X-API-Key)', 401);
  }
  if (!rawKey.startsWith('ih_')) {
    return jsonErr('invalid api key format', 401);
  }

  const { env } = getRequestContext();
  const keyHash = await hashApiKey(rawKey);
  const keyRow = await findEnabledApiKeyByHash(env, keyHash);
  if (!keyRow) {
    return jsonErr('invalid or disabled api key', 401);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonErr('expected multipart/form-data', 400);
  }

  const file = formData.get('file') || formData.get('image') || formData.get('media');
  if (!file || typeof file === 'string') {
    return jsonErr('No file uploaded (field name: file)', 400);
  }

  const res = await uploadFileToR2(request, env, file, {
    refererOverride: `api:${keyRow.name || keyRow.id}`,
  });

  // 附加 api 元信息（若已是 JSON 成功体）
  if (res.ok) {
    try {
      const body = await res.json();
      return Response.json(
        {
          success: true,
          ...body,
          api_key_id: keyRow.id,
        },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
          },
        }
      );
    } catch {
      return res;
    }
  }
  return res;
}
