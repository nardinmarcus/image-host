export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { insertImgInfo } from '@/lib/db';
import { corsHeaders, jsonErr, getClientIp, getReferer } from '@/lib/http';
import { nowTime } from '@/lib/time';

export async function POST(request) {
  const { env, cf, ctx } = getRequestContext();

  const clientIp = getClientIp(request);
  const Referer = getReferer(request);

  const req_url = new URL(request.url);

  const customDomain = env.CUSTOM_DOMAIN || req_url.origin;


  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400', // 24小时
      },
    });
  }

  try {
    // 透传流，无法缓冲校验，依赖上游限制
    const res = await fetch(`https://telegra.ph/upload?source=bugtracker`, {
    // const res = await fetch(`https://telegra.ph/upload`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })

    const resdata = await res.json()
    let data = {
      "url": `${customDomain}${resdata.src}`,
      "code": 200,
      "name": resdata.src
    }



    if (!env.IMG) {
      data.env_img = "null"
      return Response.json({
        ...data,
        msg: "1"
      }, {
        status: 200,
        headers: corsHeaders,
      })
    } else {
      const time = await nowTime()
      try {
        const rating_index = await getRating(env, resdata.src)
        await insertImgInfo(env, { url: resdata.src, referer: Referer, ip: clientIp, rating: rating_index, time });
        return Response.json({
          ...data,
          msg: "2",
          Referer:Referer,
          clientIp:clientIp,
          rating_index:rating_index,
          nowTime:time
        }, {
          status: 200,
          headers: corsHeaders,
        })

      } catch (error) {
        await insertImgInfo(env, { url: resdata.src, referer: Referer, ip: clientIp, rating: -1, time });


        return jsonErr('internal error');
      }


    }


  } catch (error) {
    // console.log(error);
    return jsonErr('internal error');
  }

}



async function getRating(env, url) {
  try {
    const apikey = env.ModerateContentApiKey
    const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : ""
    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;
    if (ratingApi) {
      const res = await fetch(`${ratingApi}url=https://telegra.ph${url}`);
      const data = await res.json();
      const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

      return rating_index;
    } else {
      return 0
    }


  } catch (error) {
    return -1
  }
}
