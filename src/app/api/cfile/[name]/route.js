export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getRating, incrementTotal, insertTgImgLog } from '@/lib/db';
import { getClientIp, getReferer, jsonErr, corsHeaders, applyMediaCacheHeaders } from '@/lib/http';
import { nowTime } from '@/lib/time';


function getContentType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'epub': 'application/epub+zip',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'html': 'text/html',
    'json': 'application/json',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska',
    'mp3': 'audio/mpeg',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// 读文件头魔术字节判断 MIME（TG getFile 返回的 file_path 常无扩展名，按扩展名推断会得到 octet-stream 导致乱码）
function detectMimeType(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0xFF && b[1] === 0xD8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  // RIFF：先 WAVE 再 WEBP（同为 RIFF 头）
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) {
    if (b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return 'audio/wav';
    if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  }
  // %PDF
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'application/pdf';
  // ID3 mp3 / frame sync
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return 'audio/mpeg';
  if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return 'audio/mpeg';
  // Ogg
  if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return 'audio/ogg';
  return null;
}


export async function OPTIONS(request) {
  return new Response(null, {
    headers: corsHeaders
  });
}

export async function GET(request, { params }) {
  const { name } = params;
  const { env, ctx } = getRequestContext();
  const req_url = new URL(request.url);

  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
    return jsonErr('TG_BOT_TOKEN or TG_CHAT_ID is not Set', 500);
  }

  const clientIp = getClientIp(request);
  const Referer = getReferer(request);

  const cacheKey = new Request(req_url.toString(), request);
  const cache = caches.default;

  const isAdminReferer = Referer === `${req_url.origin}/admin`
    || Referer === `${req_url.origin}/list`
    || Referer === `${req_url.origin}/`;

  let rating;

  try {
    rating = await getRating(env, `/cfile/${name}`);
    if (rating === 3 && !isAdminReferer) {
      await logRequest(env, name, Referer, clientIp);
      return Response.redirect(`${req_url.origin}/img/blocked.png`, 302);
    }
  } catch (error) {
    console.error('cfile getRating error:', error);
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
    const file_path = await getFile_path(env, name);
    if (file_path === 'error') {
      return jsonErr('file not found', 500);
    }
    const fileName = file_path.split('/').pop();

    const res = await fetch(`https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${file_path}`, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    if (!res.ok) {
      return jsonErr('fetch file failed', 500);
    }

    const fileBuffer = await res.arrayBuffer();
    const mimeType = detectMimeType(fileBuffer);
    const contentType = mimeType || getContentType(fileName);
    // 文件名补扩展名（TG file_path 常无扩展名，如 file_244）
    const ext = mimeType ? mimeType.split('/')[1].replace('jpeg', 'jpg') : '';
    const downloadName = ext && !fileName.includes('.') ? `${fileName}.${ext}` : fileName;
    const responseHeaders = applyMediaCacheHeaders({
      "Content-Disposition": `attachment; filename=${downloadName}`,
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType
    });
    const response_img = new Response(fileBuffer, {
      headers: responseHeaders
    });

    ctx.waitUntil(cache.put(cacheKey, response_img.clone()));

    if (isAdminReferer || !env.IMG) {
      return response_img;
    }
    await logRequest(env, name, Referer, clientIp);
    return response_img;
  } catch (error) {
    console.error('cfile/[name] error:', error);
    return jsonErr('internal error');
  }
}


async function getFile_path(env, file_id) {
  try {
    const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${file_id}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        "User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome"
      },
    })

    let responseData = await res.json();

    if (responseData.ok) {
      const file_path = responseData.result.file_path
      return file_path
    } else {
      return "error";
    }
  } catch (error) {
    return "error";
  }
}


// 异步日志记录（修复：原 UPDATE 误写 /rfile/，应为 /cfile/）
async function logRequest(env, name, referer, ip) {
  try {
    const time = await nowTime();
    const url = `/cfile/${name}`;
    await insertTgImgLog(env, { url, referer, ip, time });
    await incrementTotal(env, url);
  } catch (error) {
    console.error('cfile logRequest error:', error);
  }
}
