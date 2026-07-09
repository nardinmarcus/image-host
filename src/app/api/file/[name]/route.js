export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { insertTgImgLog, getRating, incrementTotal, insertImgInfo } from '@/lib/db';
import { getClientIp, getReferer, jsonErr, applyMediaCacheHeaders, redirectTo } from '@/lib/http';
import { nowTime } from '@/lib/time';

function withMediaCache(res) {
  const headers = new Headers(res.headers);
  if (res.status === 200) {
    applyMediaCacheHeaders(headers);
  } else {
    headers.set('Cache-Control', 'no-store');
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();

  const clientIp = getClientIp(request);
  const Referer = getReferer(request);
  const req_url = new URL(request.url);
  const url = `/file/${name}`;

  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  try {
    const isAdmin = (await auth())?.user?.role === 'admin';
    const rating = env.IMG ? await getRating(env, url) : null;

    if (rating === 3 && !isAdmin) {
      ctx.waitUntil(logRequest(env, url, Referer, clientIp));
      return redirectTo(`${req_url.origin}/img/blocked.png`);
    }

    // 已有缓存：直接返回（仍记访问日志）
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      if (!isAdmin && env.IMG) ctx.waitUntil(logRequest(env, url, Referer, clientIp));
      return cachedResponse;
    }

    const res = await fetch(`https://telegra.ph/file/${name}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (isAdmin || !env.IMG) {
      const out = withMediaCache(res);
      if (out.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, out.clone()));
      }
      return out;
    }

    if (rating !== null) {
      ctx.waitUntil(logRequest(env, url, Referer, clientIp));
      const out = withMediaCache(res);
      if (out.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, out.clone()));
      }
      return out;
    }

    if (env.PROXYALLIMG) {
      try {
        const rating_index = await getModerateContentRating(env, url);
        const time = await nowTime();
        await insertImgInfo(env, { url, referer: Referer, ip: clientIp, rating: rating_index, time, mime: res.headers.get('content-type') || 'image/jpeg' });
        if (rating_index === 3) {
          return redirectTo(`${req_url.origin}/img/blocked.png`);
        }
        const out = withMediaCache(res);
        if (out.status === 200) {
          ctx.waitUntil(cache.put(cacheKey, out.clone()));
        }
        return out;
      } catch (error) {
        console.error('file moderate error:', error);
        return withMediaCache(res);
      }
    }

    return redirectTo(`https://telegra.ph/file/${name}`);
  } catch (error) {
    console.error('file/[name] error:', error);
    return jsonErr('internal error');
  }
}

async function logRequest(env, url, referer, ip) {
  try {
    const time = await nowTime();
    await insertTgImgLog(env, { url, referer, ip, time });
    await incrementTotal(env, url);
  } catch (error) {
    console.error('file logRequest error:', error);
  }
}

// 调用 ModerateContent API 鉴黄（原样保留，阶段 3 处理 console.log 泄露 apikey）
async function getModerateContentRating(env, url) {
  try {
    const apikey = env.ModerateContentApiKey;
    const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : '';
    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;
    if (ratingApi) {
      const res = await fetch(`${ratingApi}url=https://telegra.ph${url}`);
      const data = await res.json();
      return data.hasOwnProperty('rating_index') ? data.rating_index : -1;
    }
    return 0;
  } catch (error) {
    return -1;
  }
}
