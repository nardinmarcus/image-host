export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { insertTgImgLog, getRating, incrementTotal, insertImgInfo } from '@/lib/db';
import { getClientIp, getReferer, jsonErr, applyMediaCacheHeaders } from '@/lib/http';
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
    const isAdminReferer = Referer === `${req_url.origin}/admin`
      || Referer === `${req_url.origin}/list`
      || Referer === `${req_url.origin}/`;

    // 已有缓存：直接返回（仍记访问日志）
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      if (!isAdminReferer && env.IMG) {
        const time = await nowTime();
        try {
          await insertTgImgLog(env, { url, referer: Referer, ip: clientIp, time });
          await incrementTotal(env, url);
        } catch (error) {
          console.error('file cache log error:', error);
        }
      }
      return cachedResponse;
    }

    const res = await fetch(`https://telegra.ph/file/${name}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (isAdminReferer || !env.IMG) {
      const out = withMediaCache(res);
      if (out.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, out.clone()));
      }
      return out;
    }

    const time = await nowTime();
    await insertTgImgLog(env, { url, referer: Referer, ip: clientIp, time });

    const rating = await getRating(env, url);
    if (rating !== null) {
      try {
        await incrementTotal(env, url);
      } catch (error) {
        console.error('file incrementTotal error:', error);
      }
      if (rating === 3) {
        return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
      }
      const out = withMediaCache(res);
      if (out.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, out.clone()));
      }
      return out;
    }

    if (env.PROXYALLIMG) {
      try {
        const rating_index = await getModerateContentRating(env, url);
        await insertImgInfo(env, { url, referer: Referer, ip: clientIp, rating: rating_index, time });
        if (rating_index === 3) {
          return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
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

    return Response.redirect(`https://telegra.ph/file/${name}`, 302);
  } catch (error) {
    console.error('file/[name] error:', error);
    return jsonErr('internal error');
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
