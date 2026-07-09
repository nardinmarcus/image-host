// 统一 D1 数据访问层 —— 全部参数化，消灭 SQL 注入

import {
  kindFromMime,
  kindFromUrl,
  mimeFromUrl,
  kindFilterSql,
} from '@/lib/mediaMeta';

const PAGE_SIZE = 12;
const INSIGHT_LIMIT = 5;
const INSIGHT_RANGES = { '7d': 7, '30d': 30 };

/**
 * 兼容历史中文时间与新的 ISO8601 时间，以便 D1 的时间范围统计不会漏掉旧日志。
 * 新写入一律是 ISO；此表达式只承担读取兼容层，不把修复负担放在运行时缓存上。
 */
function normalizedTimeSql(column) {
  return `CASE
    WHEN ${column} LIKE '____年%月%日 __:__:__' THEN printf(
      '%s-%02d-%02dT%s+08:00',
      substr(${column}, 1, 4),
      CAST(substr(${column}, 6, instr(substr(${column}, 6), '月') - 1) AS INTEGER),
      CAST(substr(${column}, instr(${column}, '月') + 1, instr(substr(${column}, instr(${column}, '月') + 1), '日') - 1) AS INTEGER),
      substr(${column}, instr(${column}, '日') + 2)
    )
    ELSE ${column}
  END`;
}

function insightRange(value) {
  const key = INSIGHT_RANGES[value] ? value : '30d';
  const days = INSIGHT_RANGES[key];
  const today = shanghaiDateKey(new Date());
  const startKey = shiftDateKey(today, -(days - 1));
  const endKey = shiftDateKey(today, 1);
  const previousStartKey = shiftDateKey(startKey, -days);
  return {
    key,
    days,
    startKey,
    start: `${startKey}T00:00:00+08:00`,
    end: `${endKey}T00:00:00+08:00`,
    previousStart: `${previousStartKey}T00:00:00+08:00`,
  };
}

function shanghaiDateKey(value) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function shiftDateKey(dateKey, offsetDays) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return value.toISOString().slice(0, 10);
}

function makeTrend(rows, { days, startKey }) {
  const values = new Map((rows || []).map((row) => [row.day, Number(row.pv || 0)]));
  return Array.from({ length: days }, (_, index) => {
    const day = shiftDateKey(startKey, index);
    return { day, pv: values.get(day) || 0 };
  });
}

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

  if (filters.metadata === 'missing_size') where.push('size_bytes IS NULL');
  else if (filters.metadata === 'unclassified') where.push('(kind IS NULL OR kind = \'\')');
  else if (filters.metadata === 'failed') where.push("metadata_status = 'failed'");

  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { sqlWhere, binds };
}

// 插入图片元信息（写入 mime + kind，供后台精确筛选）
export async function insertImgInfo(
  env,
  { url, referer, ip, rating, time, mime = '', sizeBytes = null, metadataStatus }
) {
  const normalizedMime = (mime || mimeFromUrl(url) || '').toLowerCase();
  const kind =
    kindFromMime(normalizedMime) || kindFromUrl(url) || 'other';
  const normalizedSize = Number.isFinite(Number(sizeBytes)) && Number(sizeBytes) >= 0
    ? Math.trunc(Number(sizeBytes))
    : null;
  const status = metadataStatus || (normalizedSize === null ? 'pending' : 'partial');
  return env.IMG.prepare(
    'INSERT INTO imginfo (url, referer, ip, rating, total, time, mime, kind, size_bytes, metadata_status, metadata_checked_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)'
  )
    .bind(
      url,
      referer,
      ip,
      rating,
      time,
      normalizedMime || null,
      kind,
      normalizedSize,
      status,
      normalizedSize === null ? null : time
    )
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
  const { sqlWhere, binds } = buildImgFilters(query, filters, 'imginfo.url');
  const logTime = normalizedTimeSql('tgimglog.time');
  const sortSql = {
    newest: 'imginfo.id DESC',
    views: 'COALESCE(imginfo.total, 0) DESC, imginfo.id DESC',
    accessed: `datetime(MAX(${logTime})) DESC, imginfo.id DESC`,
    size: 'imginfo.size_bytes IS NULL ASC, imginfo.size_bytes DESC, imginfo.id DESC',
    inactive: `datetime(MAX(${logTime})) ASC, imginfo.id DESC`,
  }[filters.sort] || 'imginfo.id DESC';
  const listSql = `SELECT imginfo.*, MAX(${logTime}) AS last_accessed_at
    FROM imginfo
    LEFT JOIN tgimglog ON tgimglog.url = imginfo.url
    ${sqlWhere}
    GROUP BY imginfo.id
    ORDER BY ${sortSql}
    LIMIT ? OFFSET ?`;
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
  const listSql = `SELECT tgimglog.*, imginfo.rating, imginfo.total, imginfo.mime, imginfo.kind, imginfo.size_bytes, imginfo.metadata_status FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ${sqlWhere} ORDER BY tgimglog.id DESC LIMIT ? OFFSET ?`;
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

const kindSql = `CASE
  WHEN kind IS NOT NULL AND kind != '' THEN kind
  WHEN mime LIKE 'image/%' THEN 'image'
  WHEN mime LIKE 'video/%' THEN 'video'
  WHEN mime LIKE 'audio/%' THEN 'audio'
  WHEN mime IS NOT NULL AND mime != '' THEN 'doc'
  ELSE 'other'
END`;

const storageSql = `CASE
  WHEN url LIKE '/rfile/%' THEN 'r2'
  WHEN url LIKE '/cfile/%' THEN 'tg'
  WHEN url LIKE '/file/%' THEN 'file'
  ELSE 'other'
END`;

// 历史库没有 url 唯一约束。洞察按最新资产记录去重，避免重复元数据放大日志聚合。
const managedAssetRows = `(SELECT * FROM imginfo
  WHERE id IN (SELECT MAX(id) FROM imginfo GROUP BY url))`;

/** 管理概览：在当前数据规模直接从 D1 聚合，日汇总表留到日志量验证后再引入。 */
export async function getAdminInsights(env, requestedRange) {
  const range = insightRange(requestedRange);
  const logTime = normalizedTimeSql('tgimglog.time');
  const assetTime = normalizedTimeSql('media.time');
  const inRange = `datetime(${logTime}) >= datetime(?) AND datetime(${logTime}) < datetime(?)`;
  const managedLogs = `FROM tgimglog JOIN ${managedAssetRows} AS media ON media.url = tgimglog.url`;
  const [assets, access, previous, trend, kinds, storage, hot, attention] = await Promise.all([
    env.IMG.prepare(`SELECT
      COUNT(*) AS total_files,
      COUNT(size_bytes) AS size_covered_files,
      COALESCE(SUM(size_bytes), 0) AS size_bytes,
      SUM(CASE WHEN size_bytes IS NULL THEN 1 ELSE 0 END) AS missing_size,
      SUM(CASE WHEN kind IS NULL OR kind = '' THEN 1 ELSE 0 END) AS unclassified,
      SUM(CASE WHEN metadata_status = 'failed' THEN 1 ELSE 0 END) AS metadata_failed
      FROM ${managedAssetRows}`).first(),
    env.IMG.prepare(`SELECT COUNT(*) AS pv,
      COUNT(DISTINCT CASE WHEN tgimglog.ip IN ('', 'unknown', 'Unknown') THEN NULL ELSE tgimglog.ip END) AS unique_ips,
      COUNT(DISTINCT tgimglog.url) AS active_files
      ${managedLogs} WHERE ${inRange}`).bind(range.start, range.end).first(),
    env.IMG.prepare(`SELECT COUNT(*) AS pv ${managedLogs} WHERE ${inRange}`)
      .bind(range.previousStart, range.start)
      .first(),
    env.IMG.prepare(`SELECT date(datetime(${logTime}), '+8 hours') AS day, COUNT(*) AS pv
      ${managedLogs} WHERE ${inRange}
      GROUP BY day ORDER BY day ASC`).bind(range.start, range.end).all(),
    env.IMG.prepare(`SELECT ${kindSql} AS name, COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS bytes
      FROM ${managedAssetRows} GROUP BY name ORDER BY count DESC`).all(),
    env.IMG.prepare(`SELECT ${storageSql} AS name, COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS bytes
      FROM ${managedAssetRows} GROUP BY name ORDER BY count DESC`).all(),
    env.IMG.prepare(`SELECT
      tgimglog.url,
      MAX(media.mime) AS mime,
      MAX(media.kind) AS kind,
      MAX(media.size_bytes) AS size_bytes,
      MAX(media.metadata_status) AS metadata_status,
      COUNT(*) AS pv,
      MAX(${logTime}) AS last_accessed_at
      FROM tgimglog
      JOIN ${managedAssetRows} AS media ON media.url = tgimglog.url
      WHERE ${inRange}
      GROUP BY tgimglog.url
      ORDER BY pv DESC, datetime(last_accessed_at) DESC
      LIMIT ?`).bind(range.start, range.end, INSIGHT_LIMIT).all(),
    env.IMG.prepare(`SELECT
      SUM(CASE WHEN size_bytes IS NULL THEN 1 ELSE 0 END) AS missing_size,
      SUM(CASE WHEN kind IS NULL OR kind = '' THEN 1 ELSE 0 END) AS unclassified,
      SUM(CASE WHEN metadata_status = 'failed' THEN 1 ELSE 0 END) AS metadata_failed,
      SUM(CASE WHEN datetime(${assetTime}) < datetime(?) AND NOT EXISTS (
        SELECT 1 FROM tgimglog
        WHERE tgimglog.url = media.url AND ${inRange}
      ) THEN 1 ELSE 0 END) AS inactive
      FROM ${managedAssetRows} AS media`).bind(range.start, range.start, range.end).first(),
  ]);

  const pv = Number(access?.pv || 0);
  const previousPv = Number(previous?.pv || 0);
  return {
    range: range.key,
    metrics: {
      totalFiles: Number(assets?.total_files || 0),
      sizeBytes: Number(assets?.size_bytes || 0),
      sizeCoveredFiles: Number(assets?.size_covered_files || 0),
      pv,
      pvDelta: pv - previousPv,
      uniqueIps: Number(access?.unique_ips || 0),
      activeFiles: Number(access?.active_files || 0),
    },
    metadata: {
      totalFiles: Number(assets?.total_files || 0),
      sizeCoveredFiles: Number(assets?.size_covered_files || 0),
      missingSize: Number(assets?.missing_size || 0),
      unclassified: Number(assets?.unclassified || 0),
      failed: Number(assets?.metadata_failed || 0),
    },
    trend: makeTrend(trend.results, range),
    kinds: kinds.results || [],
    storage: storage.results || [],
    hot: hot.results || [],
    attention: {
      missingSize: Number(attention?.missing_size || 0),
      unclassified: Number(attention?.unclassified || 0),
      metadataFailed: Number(attention?.metadata_failed || 0),
      inactive: Number(attention?.inactive || 0),
    },
  };
}

export async function getMediaDetail(env, url, requestedRange) {
  const range = insightRange(requestedRange);
  const logTime = normalizedTimeSql('tgimglog.time');
  const inRange = `datetime(${logTime}) >= datetime(?) AND datetime(${logTime}) < datetime(?)`;
  const media = await env.IMG.prepare(`SELECT imginfo.*, MAX(${logTime}) AS last_accessed_at
    FROM imginfo LEFT JOIN tgimglog ON tgimglog.url = imginfo.url
    WHERE imginfo.url = ?
    GROUP BY imginfo.id
    ORDER BY imginfo.id DESC
    LIMIT 1`).bind(url).first();
  if (!media) return null;

  const [access, trend, referers] = await Promise.all([
    env.IMG.prepare(`SELECT COUNT(*) AS pv,
      COUNT(DISTINCT CASE WHEN ip IN ('', 'unknown', 'Unknown') THEN NULL ELSE ip END) AS unique_ips
      FROM tgimglog WHERE url = ? AND ${inRange}`)
      .bind(url, range.start, range.end)
      .first(),
    env.IMG.prepare(`SELECT date(datetime(${logTime}), '+8 hours') AS day, COUNT(*) AS pv
      FROM tgimglog WHERE url = ? AND ${inRange}
      GROUP BY day ORDER BY day ASC`).bind(url, range.start, range.end).all(),
    env.IMG.prepare(`SELECT COALESCE(NULLIF(referer, ''), '(直接访问)') AS name, COUNT(*) AS count
      FROM tgimglog WHERE url = ? AND ${inRange}
      GROUP BY name ORDER BY count DESC LIMIT ?`).bind(url, range.start, range.end, INSIGHT_LIMIT).all(),
  ]);

  return {
    media,
    range: range.key,
    access: {
      pv: Number(access?.pv || 0),
      uniqueIps: Number(access?.unique_ips || 0),
    },
    trend: makeTrend(trend.results, range),
    referers: referers.results || [],
  };
}

export async function listR2MetadataCandidates(env, limit = 20) {
  const { results } = await env.IMG.prepare(`SELECT url FROM imginfo
    WHERE url LIKE '/rfile/%' AND (size_bytes IS NULL OR metadata_status IN ('pending', 'failed'))
    ORDER BY id DESC LIMIT ?`).bind(Math.max(1, Math.min(Number(limit) || 20, 50))).all();
  return results || [];
}

export async function setMediaMetadata(env, url, { sizeBytes, mime, status, checkedAt }) {
  const normalizedMime = (mime || '').toLowerCase().trim();
  const kind = kindFromMime(normalizedMime);
  return env.IMG.prepare(`UPDATE imginfo SET
      size_bytes = COALESCE(?, size_bytes),
      mime = COALESCE(NULLIF(?, ''), mime),
      kind = CASE WHEN ? != '' THEN ? ELSE kind END,
      metadata_status = ?,
      metadata_checked_at = ?
    WHERE url = ?`)
    .bind(sizeBytes ?? null, normalizedMime, kind, kind, status, checkedAt, url)
    .run();
}

export async function countR2MetadataCandidates(env) {
  const row = await env.IMG.prepare(`SELECT COUNT(*) AS total FROM imginfo
    WHERE url LIKE '/rfile/%' AND (size_bytes IS NULL OR metadata_status IN ('pending', 'failed'))`).first();
  return Number(row?.total || 0);
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
