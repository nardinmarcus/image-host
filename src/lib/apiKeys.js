// API Key 生成与校验（仅存 SHA-256，明文只在创建时返回一次）

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa 在 edge 可用
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashApiKey(rawKey) {
  const data = new TextEncoder().encode(rawKey);
  const dig = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(dig);
}

/** 生成 ih_ 前缀密钥；返回 { raw, prefix, hash } */
export async function generateApiKey() {
  const rand = crypto.getRandomValues(new Uint8Array(24));
  const raw = `ih_${bytesToBase64Url(rand)}`;
  const hash = await hashApiKey(raw);
  const prefix = raw.slice(0, 12); // ih_ + 前几位，列表展示用
  return { raw, prefix, hash };
}

/** 从请求头提取 API Key：Authorization: Bearer / X-API-Key */
export function extractApiKeyFromRequest(request) {
  const x = request.headers.get('x-api-key') || request.headers.get('X-API-Key');
  if (x && x.trim()) return x.trim();
  const auth = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  return '';
}
