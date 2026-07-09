export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { getMediaInfo, incrementTotal, insertTgImgLog } from '@/lib/db';
import { extFromMimeOrName } from '@/lib/mime';
import { getClientIp, getReferer, jsonErr, corsHeaders, applyMediaCacheHeaders, redirectTo } from '@/lib/http';
import { nowTime } from '@/lib/time';

function contentTypeFromFileName(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    pdf: 'application/pdf', epub: 'application/epub+zip', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp4: 'video/mp4', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac', aac: 'audio/aac',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

function safeDownloadName(fileName, mime) {
  const cleanName = (fileName || 'download').replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleanName.includes('.') ? cleanName : `${cleanName}.${extFromMimeOrName(mime)}`;
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return jsonErr('TG_BOT_TOKEN or TG_CHAT_ID is not Set', 500);

  const requestUrl = new URL(request.url);
  const clientIp = getClientIp(request);
  const referer = getReferer(request);
  const isAdmin = (await auth())?.user?.role === 'admin';
  const managedUrl = `/cfile/${name}`;

  let mediaInfo = null;
  try {
    if (env.IMG) {
      mediaInfo = await getMediaInfo(env, managedUrl);
      if (!mediaInfo) return jsonErr('not found', 404);
    }
    if (mediaInfo?.rating === 3 && !isAdmin) {
      ctx.waitUntil(logRequest(env, managedUrl, referer, clientIp));
      return redirectTo(`${requestUrl.origin}/img/blocked.png`);
    }
  } catch (error) {
    console.error('cfile metadata error:', error);
    return jsonErr('internal error');
  }

  const cacheKey = new Request(requestUrl.toString(), request);
  const cache = caches.default;
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    if (!isAdmin && env.IMG) ctx.waitUntil(logRequest(env, managedUrl, referer, clientIp));
    return cachedResponse;
  }

  try {
    const filePath = await getFilePath(env, name);
    if (!filePath) return jsonErr('file not found', 404);
    const telegramResponse = await fetch(`https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${filePath}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    if (!telegramResponse.ok || !telegramResponse.body) return jsonErr('fetch file failed', 502);

    const fileName = filePath.split('/').pop();
    const mime = mediaInfo?.mime || telegramResponse.headers.get('content-type') || contentTypeFromFileName(fileName);
    const headers = new Headers(telegramResponse.headers);
    headers.set('Content-Type', mime);
    headers.set('Content-Disposition', `attachment; filename="${safeDownloadName(fileName, mime)}"`);
    headers.set('Access-Control-Allow-Origin', '*');
    applyMediaCacheHeaders(headers);

    const response = new Response(telegramResponse.body, { status: telegramResponse.status, headers });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    if (!isAdmin && env.IMG) ctx.waitUntil(logRequest(env, managedUrl, referer, clientIp));
    return response;
  } catch (error) {
    console.error('cfile/[name] error:', error);
    return jsonErr('internal error');
  }
}

async function getFilePath(env, fileId) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${fileId}`);
    const data = await response.json();
    return data.ok ? data.result.file_path : null;
  } catch {
    return null;
  }
}

async function logRequest(env, url, referer, ip) {
  try {
    const time = await nowTime();
    await insertTgImgLog(env, { url, referer, ip, time });
    await incrementTotal(env, url);
  } catch (error) {
    console.error('cfile logRequest error:', error);
  }
}
