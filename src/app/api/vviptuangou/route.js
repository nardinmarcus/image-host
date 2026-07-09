export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { insertImgInfo } from '@/lib/db';
import { corsHeaders, jsonErr, getClientIp, getReferer, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/http';
import { nowTime } from '@/lib/time';

/**
 *
 * 接口来自：https://github.com/BlueSkyXN/WorkerJS_CloudFlare_ImageBed/blob/main/cloudflare-worker-js-api/API_IMG_vviptuangou.js
 *
 */

export async function POST(request) {
  const { env, cf, ctx } = getRequestContext();
  const clientIp = getClientIp(request);
  const Referer = getReferer(request);

  const formData = await request.formData();
  const file = formData.get('file'); // 使用 'image' 字段名
  if (!file) {
    return new Response('No file uploaded', { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) return jsonErr(`file too large (max ${MAX_UPLOAD_MB}MB)`, 413);
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return jsonErr('invalid file type', 400);
  try {
    const newFormData = new FormData();
    newFormData.append('file', file, file.name); // 上传到目标服务器时使用 'file'
    const res = await fetch('https://api.vviptuangou.com/api/upload', {
      method: request.method,
      body: newFormData,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
        'Branchid': '1002',
        'Cache-Control': 'no-cache',
        'DNT': '1',
        'Origin': 'https://mlw10086.serv00.net',
        'Pragma': 'no-cache',
        'Priority': 'u=1, i',
        'Referer': 'https://mlw10086.serv00.net/',
        'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'Sign': env.VVIP_SIGN || '',
        'Source': 'h5',
        'Tenantid': '3',
        'Timestamp': `${Date.now()}`,
        'Token': env.VVIP_TOKEN || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    });
    // console.log(res);
    const resdata = await res.json()

    let correctImageUrl

    if (resdata.status === 1 && resdata.imgurl) {
      correctImageUrl = `https://assets.vviptuangou.com/${resdata.imgurl}`;
    } else {
      return Response.json({
        status: 500,
        message: ` ${resdata.message}`,
        success: false
      }
        , {
          status: 500,
          headers: corsHeaders,
        })
    }


    const data = {
      "url": correctImageUrl,
      "code": 200,
      "name": resdata.imgurl
    }
    try {
      if (env.IMG) {
        const time = await nowTime()
        await insertImgInfo(env, { url: correctImageUrl, referer: Referer, ip: clientIp, rating: 7, time });
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
