// 统一 D1 数据访问层 —— 全部参数化，消灭 SQL 注入
// 替换散落在 13 个路由里的 insertImgInfo / getRating / insertTgImgLog 等重复函数
// 参考: file/[name]/route.js:117-121 已有的正确 .bind() 写法

const PAGE_SIZE = 10;

// 分页参数校验：非负整数，否则回退 0
function toPage(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : 0;
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

// 图片列表（带搜索），返回 { results, total }
// 注：原 admin/list 有 query 分支无 ORDER BY，分页结果不确定，这里统一加 ORDER BY id DESC 修复
export async function searchImgInfo(env, query, page) {
  const offset = toPage(page) * PAGE_SIZE;
  if (query) {
    const like = `%${query}%`;
    const { results } = await env.IMG.prepare(
      'SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).bind(like, PAGE_SIZE, offset).all();
    const total = await env.IMG.prepare(
      'SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?'
    ).bind(like).first();
    return { results, total: total.total };
  }
  const { results } = await env.IMG.prepare(
    'SELECT * FROM imginfo ORDER BY id DESC LIMIT ? OFFSET ?'
  ).bind(PAGE_SIZE, offset).all();
  const total = await env.IMG.prepare('SELECT COUNT(*) as total FROM imginfo').first();
  return { results, total: total.total };
}

// 访问日志列表（JOIN imginfo，带搜索），返回 { results, total }
export async function searchLogs(env, query, page) {
  const offset = toPage(page) * PAGE_SIZE;
  if (query) {
    const like = `%${query}%`;
    const { results } = await env.IMG.prepare(
      'SELECT tgimglog.*, imginfo.rating, imginfo.total FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url WHERE tgimglog.url LIKE ? ORDER BY tgimglog.id DESC LIMIT ? OFFSET ?'
    ).bind(like, PAGE_SIZE, offset).all();
    const total = await env.IMG.prepare(
      'SELECT COUNT(*) as total FROM tgimglog WHERE url LIKE ?'
    ).bind(like).first();
    return { results, total: total.total };
  }
  const { results } = await env.IMG.prepare(
    'SELECT tgimglog.*, imginfo.rating, imginfo.total FROM tgimglog JOIN imginfo ON tgimglog.url = imginfo.url ORDER BY tgimglog.id DESC LIMIT ? OFFSET ?'
  ).bind(PAGE_SIZE, offset).all();
  const total = await env.IMG.prepare('SELECT COUNT(*) as total FROM tgimglog').first();
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
