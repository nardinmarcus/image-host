export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { insertTgImgLog, getRating, incrementTotal, insertImgInfo } from '@/lib/db';
import { getClientIp, getReferer, jsonErr } from '@/lib/http';
import { nowTime } from '@/lib/time';

export async function GET(request, { params }) {
  const { name } = params;
  const { env } = getRequestContext();

  const clientIp = getClientIp(request);
  const Referer = getReferer(request);
  const req_url = new URL(request.url);
  const url = `/file/${name}`;

  try {
    const res = await fetch(`https://telegra.ph/file/${name}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const isAdminReferer = Referer === `${req_url.origin}/admin`
      || Referer === `${req_url.origin}/list`
      || Referer === `${req_url.origin}/`;

    if (isAdminReferer || !env.IMG) {
      return res;
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
      return res;
    }

    if (env.PROXYALLIMG) {
      try {
        const rating_index = await getModerateContentRating(env, url);
        await insertImgInfo(env, { url, referer: Referer, ip: clientIp, rating: rating_index, time });
        if (rating_index === 3) {
          return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
        }
        return res;
      } catch (error) {
        console.error('file moderate error:', error);
        return res;
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
    console.log(`${ratingApi}url=https://telegra.ph${url}`);
    if (ratingApi) {
      const res = await fetch(`${ratingApi}url=https://telegra.ph${url}`);
      const data = await res.json();
      return data.hasOwnProperty('rating_index') ? data.rating_index : -1;
    }
    return 0;
  } catch (error) {
    console.log('error');
    return -1;
  }
}
