export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { insertImgInfo } from '@/lib/db';
import { corsHeaders, jsonErr, getClientIp, getReferer, MAX_UPLOAD_BYTES, MAX_UPLOAD_MB } from '@/lib/http';
import { nowTime } from '@/lib/time';

/**
 *
 * 接口来自：https://github.com/BlueSkyXN/WorkerJS_CloudFlare_ImageBed/blob/main/cloudflare-worker-js-api/API_IMG_58img.js
 *
 *
 */


export async function POST(request) {
  const { env, cf, ctx } = getRequestContext();
  const clientIp = getClientIp(request);
  const Referer = getReferer(request);

  const req_url = new URL(request.url);


  const formData = await request.formData();
  const imageFile = formData.get('file')
  if (!imageFile) return new Response('Image file not found', { status: 400 });
  if (imageFile.size > MAX_UPLOAD_BYTES) return jsonErr(`file too large (max ${MAX_UPLOAD_MB}MB)`, 413);
  if (!imageFile.type.startsWith('image/') && !imageFile.type.startsWith('video/')) return jsonErr('invalid file type', 400);
  // 将文件数据转换为 ArrayBuffer
  const arrayBuffer = await imageFile.arrayBuffer();

  // 将 ArrayBuffer 转换为 Base64
  const base64EncodedData = bufferToBase64(arrayBuffer);

  // 构建请求负载
  const payload = {
    "Pic-Size": "0*0",
    "Pic-Encoding": "base64",
    "Pic-Path": "/nowater/webim/big/",
    "Pic-Data": base64EncodedData
  };


  try {
    const res = await fetch('https://upload.58cdn.com.cn/json/nowater/webim/big/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    // console.log(res);
    const result = await res.text();
    const random_number = Math.floor(Math.random() * 8) + 1;
    const finalUrl = `https://pic${random_number}.58cdn.com.cn/nowater/webim/big/${result}`;
    const data = {
      "url": finalUrl,
      "code": 200,
      "name": result
    }

    try {
      if (env.IMG) {
        const time = await nowTime()
        await insertImgInfo(env, { url: finalUrl, referer: Referer, ip: clientIp, rating: 7, time, mime: imageFile.type || 'image/jpeg' });
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

// ArrayBuffer 转 Base64
function bufferToBase64(buf) {
  var binary = '';
  var bytes = new Uint8Array(buf);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // 使用 btoa 进行 Base64 编码
  return btoa(binary);
}
