// 统一 HTTP 工具：CORS、响应封装、IP/Referer 提取
// 替换 14 个路由里各自重复定义的 corsHeaders / IP 提取逻辑

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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
