// 统一 D1 数据访问层 —— 全部参数化，消灭 SQL 注入

import {
  kindFromMime,
  kindFromUrl,
  mimeFromUrl,
  kindFilterSql,
} from '@/lib/mediaMeta';

const PAGE_SIZE = 12;

function toPage(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function buildImgFilters(query, filters = {}, urlColumn = 'url') {
  const where = [];
  const binds = [];

  if (query) {
    where.push(`${urlColumn} LIKE ?`);
    binds.push(`%${query}%`);
  }

  if (filters.storage === 'r2') where.push(`${urlColumn} LIKE '/rfile/%'`);
  else if (filters.storage === 'tg') where.push(`${urlColumn} LIKE '/cfile/%'`);
  else if (filters.storage === 'file') where.push(`${urlColumn} LIKE '/file/%'`);

  const kindClause = kindFilterSql(filters.kind, {
    urlColumn,
    kindColumn: 'kind',
    mimeColumn: 'mime',
  });
  if (kindClause.sql) {
    where.push(kindClause.sql);
    binds.push(...kindClause.binds);
  }

  if (filters.blocked === 'yes') where.push('rating = 3');
  else if (filters.blocked === 'no') where.push('(rating IS NULL OR rating != 3)');

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { sqlWhere, binds };
}

// 插入图片元信息（写入 mime + kind，供后台精确筛选）
export async function insertImgInfo(env, { url, referer, ip, rating, time, mime = '' }) {
  const normalizedMime = (mime || mimeFromUrl(url) || '').toLowerCase();
  const kind =
    kindFromMime(normalizedMime) || kindFromUrl(url) || 'other';
  return env.IMG.prepare(
    'INSERT INTO imginfo (url, referer, ip, rating, total, time, mime, kind) VALUES (?, ?, ?, ?, 1, ?, ?, ?)'
  )
    .bind(url, referer, ip, rating, time, normalizedMime || null, kind)
    .run();
}

export async function insertTgImgLog(env, { url, referer, ip, time }) {
  return env.IMG.prepare(
    'INSERT INTO tgimglog (url, referer, ip, time) VALUES (?, ?, ?, ?)'
  )
    .bind(url, referer, ip, time)
    .run();
}

export async function getRating(env, url) {
  const r = await env.IMG.prepare('SELECT rating FROM imginfo WHERE url = ?')
    .bind(url)
    .first();
  return r?.rating ?? null;
}

/** 受本站管理的媒体元数据。缺失记录意味着资源已删除或从未受管。 */
export async function getMediaInfo(env, url) {
  return env.IMG.prepare('SELECT rating, mime FROM imginfo WHERE url = ?')
    .bind(url)
    .first();
}

export async function incrementTotal(env, url) {
  return env.IMG.prepare('UPDATE imginfo SET total = total + 1 WHERE url = ?')
    .bind(url)
    .run();
}

export async function updateRating(env, url, rating) {
  return env.IMG.prepare('UPDATE imginfo SET rating = ? WHERE url = ?')
    .bind(rating, url)
    .run();
}

export async function deleteImgInfo(env, url) {
  return env.IMG.prepare('DELETE FROM imginfo WHERE url = ?').bind(url).run();
}

export async function searchImgInfo(env, query, page, filters = {}) {
  const offset = toPage(page) * PAGE_SIZE;
  const { sqlWhere, binds } = buildImgFilters(query, filters, 'url');
  const listSql = `SELECT * FROM imginfo ${sqlWhere} ORDER BY id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM imginfo ${sqlWhere}`;
  const { results } = await env.IMG.prepare(listSql)
    .bind(...binds, PAGE_SIZE, offset)
    .all();
  const total = await env.IMG.prepare(countSql).bind(...binds).first();
  return { results, total: total.total };
}

export async function searchLogs(env, query, page, filters = {}) {
  const offset = toPage(page) * PAGE_SIZE;
  const where = [];
  const binds = [];
  if (query) {
    where.push('tgimglog.url LIKE ?');
    binds.push(`%${query}%`);
  }
  if (filters.storage === 'r2') where.push("tgimglog.url LIKE '/rfile/%'");
  else if (filters.storage === 'tg') where.push("tgimglog.url LIKE '/cfile/%'");
  else if (filters.storage === 'file') where.push("tgimglog.url LIKE '/file/%'");

  const kindClause = kindFilterSql(filters.kind, {
    urlColumn: 'tgimglog.url',
    kindColumn: 'imginfo.kind',
    mimeColumn: 'imginfo.mime',
  });
  if (kindClause.sql) {
    where.push(kindClause.sql);
    binds.push(...kindClause.binds);
  }
  if (filters.blocked === 'yes') where.push('imginfo.rating = 3');
  else if (filters.blocked === 'no') {
    where.push('(imginfo.rating IS NULL OR imginfo.rating != 3)');
  }

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT tgimglog.*, imginfo.rating, imginfo.total, imginfo.mime, imginfo.kind FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ${sqlWhere} ORDER BY tgimglog.id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ${sqlWhere}`;
  const { results } = await env.IMG.prepare(listSql)
    .bind(...binds, PAGE_SIZE, offset)
    .all();
  const total = await env.IMG.prepare(countSql).bind(...binds).first();
  return { results, total: total.total };
}

export async function countImgInfo(env) {
  const r = await env.IMG.prepare('SELECT COUNT(*) as total FROM imginfo').first();
  return r?.total ?? 0;
}

const STATS_FIELDS = ['ip', 'referer', 'url'];
export async function getTopStats(env, field, limit = 20) {
  if (!STATS_FIELDS.includes(field)) return [];
  const { results } = await env.IMG.prepare(
    `SELECT ${field} AS name, COUNT(*) AS count FROM tgimglog GROUP BY ${field} ORDER BY count DESC LIMIT ?`
  )
    .bind(limit)
    .all();
  return results;
}

// —— API Keys ——
export async function listApiKeys(env) {
  const { results } = await env.IMG.prepare(
    'SELECT id, name, key_prefix, enabled, created_at, last_used_at FROM api_keys ORDER BY id DESC'
  ).all();
  return results || [];
}

export async function createApiKey(env, { name, keyPrefix, keyHash, createdAt }) {
  return env.IMG.prepare(
    'INSERT INTO api_keys (name, key_prefix, key_hash, enabled, created_at) VALUES (?, ?, ?, 1, ?)'
  )
    .bind(name, keyPrefix, keyHash, createdAt)
    .run();
}

export async function setApiKeyEnabled(env, id, enabled) {
  return env.IMG.prepare('UPDATE api_keys SET enabled = ? WHERE id = ?')
    .bind(enabled ? 1 : 0, id)
    .run();
}

export async function deleteApiKey(env, id) {
  return env.IMG.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run();
}

/** 用 hash 查有效密钥；命中则更新 last_used_at */
export async function findEnabledApiKeyByHash(env, keyHash) {
  const row = await env.IMG.prepare(
    'SELECT id, name, enabled FROM api_keys WHERE key_hash = ? AND enabled = 1'
  )
    .bind(keyHash)
    .first();
  if (!row) return null;
  try {
    const now = new Date().toISOString();
    await env.IMG.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
      .bind(now, row.id)
      .run();
  } catch {
    /* ignore */
  }
  return row;
}
