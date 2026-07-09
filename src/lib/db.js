// 统一 D1 数据访问层 —— 全部参数化，消灭 SQL 注入
// 替换散落在 13 个路由里的 insertImgInfo / getRating / insertTgImgLog 等重复函数
// 参考: file/[name]/route.js:117-121 已有的正确 .bind() 写法

import { kindExtList, kindSqlClause } from '@/lib/mediaMeta';

const PAGE_SIZE = 12;

// 分页参数校验：非负整数，否则回退 0
function toPage(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

/**
 * 构建列表筛选 WHERE（全字面量白名单，无用户串直接拼列名）
 * filters: { storage?: 'r2'|'tg'|'file', kind?: 'image'|'video'|'audio'|'doc', blocked?: 'yes'|'no' }
 */
function buildImgFilters(query, filters = {}, urlColumn = 'url') {
  const where = [];
  const binds = [];

  if (query) {
    where.push(`${urlColumn} LIKE ?`);
    binds.push(`%${query}%`);
  }

  const storage = filters.storage;
  if (storage === 'r2') where.push(`${urlColumn} LIKE '/rfile/%'`);
  else if (storage === 'tg') where.push(`${urlColumn} LIKE '/cfile/%'`);
  else if (storage === 'file') where.push(`${urlColumn} LIKE '/file/%'`);

  const kindClause = kindSqlClause(urlColumn, filters.kind);
  if (kindClause.sql) {
    where.push(kindClause.sql);
    binds.push(...kindClause.binds);
  }

  if (filters.blocked === 'yes') where.push('rating = 3');
  else if (filters.blocked === 'no') where.push('(rating IS NULL OR rating != 3)');

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { sqlWhere, binds };
}

// 插入图片元信息
export async function insertImgInfo(env, { url, referer, ip, rating, time }) {
  return env.IMG.prepare(
    'INSERT INTO imginfo (url, referer, ip, rating, total, time) VALUES (?, ?, ?, ?, 1, ?)'
  ).bind(url, referer, ip, rating, time).run();
}

// 插入访问日志（append-only）
export async function insertTgImgLog(env, { url, referer, ip, time }) {
  return env.IMG.prepare(
    'INSERT INTO tgimglog (url, referer, ip, time) VALUES (?, ?, ?, ?)'
  ).bind(url, referer, ip, time).run();
}

// 获取单图评级 —— 统一返回 number | null
export async function getRating(env, url) {
  const r = await env.IMG.prepare('SELECT rating FROM imginfo WHERE url = ?').bind(url).first();
  return r?.rating ?? null;
}

// 访问计数 +1
export async function incrementTotal(env, url) {
  return env.IMG.prepare('UPDATE imginfo SET total = total + 1 WHERE url = ?').bind(url).run();
}

// 更新评级（拉黑/解封）
export async function updateRating(env, url, rating) {
  return env.IMG.prepare('UPDATE imginfo SET rating = ? WHERE url = ?').bind(rating, url).run();
}

// 删除图片元信息
export async function deleteImgInfo(env, url) {
  return env.IMG.prepare('DELETE FROM imginfo WHERE url = ?').bind(url).run();
}

// 图片列表（搜索 + 筛选），返回 { results, total }
export async function searchImgInfo(env, query, page, filters = {}) {
  const offset = toPage(page) * PAGE_SIZE;
  const { sqlWhere, binds } = buildImgFilters(query, filters, 'url');
  const listSql = `SELECT * FROM imginfo ${sqlWhere} ORDER BY id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM imginfo ${sqlWhere}`;
  const { results } = await env.IMG.prepare(listSql).bind(...binds, PAGE_SIZE, offset).all();
  const total = await env.IMG.prepare(countSql).bind(...binds).first();
  return { results, total: total.total };
}

// 访问日志列表（JOIN imginfo，搜索 + 筛选），返回 { results, total }
export async function searchLogs(env, query, page, filters = {}) {
  const offset = toPage(page) * PAGE_SIZE;
  // 日志表筛选 url 列加前缀，rating 在 imginfo
  const where = [];
  const binds = [];
  if (query) {
    where.push('tgimglog.url LIKE ?');
    binds.push(`%${query}%`);
  }
  if (filters.storage === 'r2') where.push("tgimglog.url LIKE '/rfile/%'");
  else if (filters.storage === 'tg') where.push("tgimglog.url LIKE '/cfile/%'");
  else if (filters.storage === 'file') where.push("tgimglog.url LIKE '/file/%'");

  const kindClause = kindSqlClause('tgimglog.url', filters.kind);
  if (kindClause.sql) {
    where.push(kindClause.sql);
    binds.push(...kindClause.binds);
  }
  if (filters.blocked === 'yes') where.push('imginfo.rating = 3');
  else if (filters.blocked === 'no') where.push('(imginfo.rating IS NULL OR imginfo.rating != 3)');

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const listSql = `SELECT tgimglog.*, imginfo.rating, imginfo.total FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ${sqlWhere} ORDER BY tgimglog.id DESC LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) as total FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ${sqlWhere}`;
  const { results } = await env.IMG.prepare(listSql).bind(...binds, PAGE_SIZE, offset).all();
  const total = await env.IMG.prepare(countSql).bind(...binds).first();
  return { results, total: total.total };
}

// 图片总数
export async function countImgInfo(env) {
  const r = await env.IMG.prepare('SELECT COUNT(*) as total FROM imginfo').first();
  return r?.total ?? 0;
}

// Top20 统计（访问日志按字段聚合，field 白名单防注入——GROUP BY 不支持 bind）
const STATS_FIELDS = ['ip', 'referer', 'url'];
export async function getTopStats(env, field, limit = 20) {
  if (!STATS_FIELDS.includes(field)) return [];
  const { results } = await env.IMG.prepare(
    `SELECT ${field} AS name, COUNT(*) AS count FROM tgimglog GROUP BY ${field} ORDER BY count DESC LIMIT ?`
  ).bind(limit).all();
  return results;
}
