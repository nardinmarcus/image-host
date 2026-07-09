export const runtime = 'edge';

import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { getMediaInfo, incrementTotal, insertTgImgLog } from '@/lib/db';
import { getClientIp, getReferer, jsonErr, corsHeaders, applyMediaCacheHeaders, redirectTo } from '@/lib/http';
import { nowTime } from '@/lib/time';

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();
  if (!env.IMGRS) return jsonErr('IMGRS is not Set', 500);

  const requestUrl = new URL(request.url);
  const clientIp = getClientIp(request);
  const referer = getReferer(request);
  const isAdmin = (await auth())?.user?.role === 'admin';
  const managedUrl = `/rfile/${name}`;

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
    console.error('rfile metadata error:', error);
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
    const range = parseRangeHeader(request.headers.get('range'));
    const object = await env.IMGRS.get(name, range ? { range } : undefined);
    if (object === null) return jsonErr('not found', 404);

    const headers = mediaHeaders(object.httpMetadata);
    headers.set('etag', object.httpEtag);
    if (request.headers.get('range') === null) applyMediaCacheHeaders(headers);
    if (object.range) {
      headers.set('content-range', `bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`);
    }
    const status = object.body ? (request.headers.get('range') !== null ? 206 : 200) : 304;
    const response = new Response(object.body, { headers, status });
    if (status === 200) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    if (!isAdmin && env.IMG) ctx.waitUntil(logRequest(env, managedUrl, referer, clientIp));
    return response;
  } catch (error) {
    console.error('rfile/[name] error:', error);
    return jsonErr('internal error');
  }
}

async function logRequest(env, url, referer, ip) {
  try {
    const time = await nowTime();
    await insertTgImgLog(env, { url, referer, ip, time });
    await incrementTotal(env, url);
  } catch (error) {
    console.error('rfile logRequest error:', error);
  }
}

function parseRangeHeader(value) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value || '');
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) return { suffix: Number(match[2]) };

  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset)) return null;
  if (!match[2]) return { offset };

  const end = Number(match[2]);
  if (!Number.isSafeInteger(end) || end < offset) return null;
  return { offset, length: end - offset + 1 };
}

function mediaHeaders(metadata = {}) {
  const headers = new Headers();
  const values = {
    'content-type': metadata.contentType,
    'content-language': metadata.contentLanguage,
    'content-disposition': metadata.contentDisposition,
    'content-encoding': metadata.contentEncoding,
    'cache-control': metadata.cacheControl,
  };
  for (const [name, value] of Object.entries(values)) {
    if (value) headers.set(name, value);
  }
  if (metadata.cacheExpiry) headers.set('expires', new Date(metadata.cacheExpiry).toUTCString());
  return headers;
}
