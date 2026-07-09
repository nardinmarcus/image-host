// 共享 R2 上传（网页路由 + 开放 API 复用）

import { insertImgInfo } from '@/lib/db';
import { jsonErr, getClientIp, getReferer, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB, corsHeaders } from '@/lib/http';
import { normalizeUploadMime, isAllowedApiMime, extFromMimeOrName } from '@/lib/mime';
import { nowTime } from '@/lib/time';

/**
 * 将 file 写入 R2 并记入 imginfo。
 * @returns {Response}
 */
export async function uploadFileToR2(request, env, file, { refererOverride } = {}) {
  if (!env.IMGRS) {
    return jsonErr('IMGRS is not Set', 500);
  }
  if (!file) return jsonErr('No file uploaded', 400);
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonErr(`file too large (max ${MAX_UPLOAD_MB}MB)`, 413);
  }

  const fileType = normalizeUploadMime(file);
  if (!isAllowedApiMime(fileType)) {
    return jsonErr(
      'invalid file type (image/video/audio/pdf/epub/doc/xls/ppt)',
      400
    );
  }

  const filename = file.name || 'file';
  const ext = extFromMimeOrName(fileType, filename);
  const key = `${crypto.randomUUID()}.${ext}`;
  const req_url = new URL(request.url);
  const clientIp = getClientIp(request);
  const Referer = refererOverride || getReferer(request);

  const header = new Headers();
  header.set('content-type', fileType || 'application/octet-stream');
  header.set('content-length', `${file.size}`);

  try {
    const object = await env.IMGRS.put(key, file, { httpMetadata: header });
    if (object === null) return jsonErr('object not found', 404);

    const publicUrl = `${req_url.origin}/api/rfile/${key}`;
    const data = {
      url: publicUrl,
      code: 200,
      name: filename,
      mime: fileType,
      key,
    };

    if (!env.IMG) {
      return Response.json({ ...data, msg: '1' }, { status: 200, headers: corsHeaders });
    }

    const time = await nowTime();
    try {
      await insertImgInfo(env, {
        url: `/rfile/${key}`,
        referer: Referer,
        ip: clientIp,
        rating: 0,
        time,
        mime: fileType,
      });
      return Response.json(
        {
          ...data,
          msg: '2',
          clientIp,
          nowTime: time,
        },
        { status: 200, headers: corsHeaders }
      );
    } catch (error) {
      console.error('uploadR2 insertImgInfo error:', error);
      try {
        await insertImgInfo(env, {
          url: `/rfile/${key}`,
          referer: Referer,
          ip: clientIp,
          rating: -1,
          time,
          mime: fileType,
        });
      } catch {
        /* ignore */
      }
      // 文件已上传成功，仍返回 URL
      return Response.json(
        { ...data, msg: '2', warning: 'db write failed' },
        { status: 200, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('uploadR2 error:', error);
    return jsonErr('internal error');
  }
}
