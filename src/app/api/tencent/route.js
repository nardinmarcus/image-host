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
    const res = await fetch('https://openai.weixin.qq.com/weixinh5/webapp/h774yvzC2xlB4bIgGfX2stc4kvC85J/cos/upload', {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    // console.log(res);
    const resdata = await res.json()

    const data = {
      "url": resdata.url,
      "code": 200,
      "name": resdata.filekey
    }

    try {
      if (env.IMG) {
        const time = await nowTime()
        await insertImgInfo(env, { url: resdata.url, referer: Referer, ip: clientIp, rating: 7, time });
    }
    } catch (error) {

    }


    return Response.json(data, {
      status: 200,
      headers: corsHeaders,
    }

    )


  } catch (error) {
    return jsonErr('internal error');
  }

}
