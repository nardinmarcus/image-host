export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRating, incrementTotal, insertTgImgLog } from '@/lib/db';
import { getClientIp, getReferer, jsonErr, corsHeaders, applyMediaCacheHeaders } from '@/lib/http';
import { nowTime } from '@/lib/time';

export async function OPTIONS(request) {
  return new Response(null, {
    headers: corsHeaders
  });
}


//https://developers.cloudflare.com/r2/examples/demo-worker/
export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();

  if (!env.IMGRS) {
    return jsonErr('IMGRS is not Set', 500);
  }

  const clientIp = getClientIp(request);
  const Referer = getReferer(request);
  const req_url = new URL(request.url);

  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  const isAdminReferer = Referer === `${req_url.origin}/admin`
    || Referer === `${req_url.origin}/list`
    || Referer === `${req_url.origin}/`;

  let rating;

  try {
    rating = await getRating(env, `/rfile/${name}`);
    if (rating === 3 && !isAdminReferer) {
      await logRequest(env, name, Referer, clientIp);
      return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
    }
  } catch (error) {
    console.error('rfile getRating error:', error);
  }

  // 检查缓存
  let cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    if (!isAdminReferer) {
      await logRequest(env, name, Referer, clientIp);
    }
    return cachedResponse;
  }

  try {
    const object = await env.IMGRS.get(name, {
      range: request.headers,
      onlyIf: request.headers,
    });

    if (object === null) {
      return jsonErr('not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    // 仅完整 200 响应打长缓存；206 分段不进 caches.default
    if (request.headers.get('range') === null) {
      applyMediaCacheHeaders(headers);
    }

    if (object.range) {
      headers.set("content-range", `bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`)
    }

    const status = object.body ? (request.headers.get("range") !== null ? 206 : 200) : 304;

    let response_img = new Response(object.body, {
      headers,
      status
    });

    if (status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response_img.clone()));
    }

    if (isAdminReferer || !env.IMG) {
      return response_img;
    }
    await logRequest(env, name, Referer, clientIp);
    return response_img;

  } catch (error) {
    console.error('rfile/[name] error:', error);
    return jsonErr('internal error');
  }
}


// 异步日志记录
async function logRequest(env, name, referer, ip) {
  try {
    const time = await nowTime();
    const url = `/rfile/${name}`;
    await insertTgImgLog(env, { url, referer, ip, time });
    await incrementTotal(env, url);
  } catch (error) {
    console.error('rfile logRequest error:', error);
  }
}
