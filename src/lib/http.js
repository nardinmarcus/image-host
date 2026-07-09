// 统一 HTTP 工具：CORS、响应封装、IP/Referer 提取
// 替换 14 个路由里各自重复定义的 corsHeaders / IP 提取逻辑

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

// 成功响应（统一 envelope: { code, success, message, ...data }）
export function jsonOk(data = {}, status = 200) {
  return Response.json({ code: status, success: true, message: 'success', ...data }, {
    status,
    headers: corsHeaders,
  });
}

// 错误响应（脱敏：不把 error.message 返回给客户端，避免泄露 DB 结构）
export function jsonErr(message = 'internal error', status = 500) {
  return Response.json({ code: status, success: false, message }, {
    status,
    headers: corsHeaders,
  });
}

// 提取客户端 IP —— edge runtime 无 request.socket，用 Cloudflare 标准 header
export function getClientIp(request) {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip');
  return ip ? ip.split(',')[0].trim() : 'unknown';
}

// 提取 Referer
export function getReferer(request) {
  return request.headers.get('Referer') || 'Referer';
}

/**
 * 上传体积上限（R2 / TG 等主路径共用）。
 * 20MB：对齐 Telegram Bot getFile 可拉取上限，过大则 cfile 读回失败。
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_MB = 20;

/**
 * 媒体分发缓存策略（rfile/cfile/file 统一）：
 * - 浏览器 1h（删除后用户侧不至于一年残留）
 * - 共享/edge 1d（配合 caches.default；删 R2 时已 caches.default.delete）
 * UUID 文件名本身不可变；勿对 404/鉴黄拦截用此头。
 */
export const MEDIA_CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400';

export function applyMediaCacheHeaders(headers) {
  if (headers instanceof Headers) {
    headers.set('Cache-Control', MEDIA_CACHE_CONTROL);
    return headers;
  }
  return { ...headers, 'Cache-Control': MEDIA_CACHE_CONTROL };
}
