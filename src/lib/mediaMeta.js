// 资源 URL → 存储来源 / 媒体类型（前后端共用逻辑，纯函数）

const IMAGE_EXTS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'heic', 'heif', 'tif', 'tiff',
]);
const VIDEO_EXTS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpeg', 'mpg', '3gp',
]);
const AUDIO_EXTS = new Set(['mp3', 'm4a', 'wav', 'ogg', 'flac', 'aac', 'opus']);
const DOC_EXTS = new Set([
  'pdf', 'epub', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

export function getUrlExt(url = '') {
  const seg = String(url).split('/').pop() || '';
  const clean = seg.split('?')[0];
  // Telegram file_id 很长且可含字符，但通常无「.扩展名」；
  // 仅当最后一段像 name.ext 且 ext 很短时才认扩展名
  const parts = clean.split('.');
  if (parts.length < 2) return '';
  const ext = parts.pop().toLowerCase();
  // 避免把无意义的长串当成扩展名
  if (!ext || ext.length > 8) return '';
  return ext;
}

/** r2 | tg | file | other */
export function getStorage(url = '') {
  if (url.startsWith('/rfile/')) return 'r2';
  if (url.startsWith('/cfile/')) return 'tg';
  if (url.startsWith('/file/')) return 'file';
  return 'other';
}

export function getStorageLabel(storage) {
  return ({ r2: 'R2', tg: 'TG', file: 'TG旧', other: '其他' })[storage] || storage;
}

function isMediaPath(url = '') {
  return (
    url.startsWith('/rfile/') ||
    url.startsWith('/cfile/') ||
    url.startsWith('/file/')
  );
}

/** image | video | audio | doc | other */
export function getKind(url = '') {
  const ext = getUrlExt(url);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (DOC_EXTS.has(ext)) return 'doc';
  // TG/telegraph 路径常无扩展名（file_id）；图床默认按图片展示与筛选
  if (!ext && isMediaPath(url)) return 'image';
  return 'other';
}

export function getKindLabel(kind) {
  return (
    { image: '图片', video: '视频', audio: '音频', doc: '文档', other: '其他' }[kind] || kind
  );
}

export function getDocBadge(url = '') {
  const ext = getUrlExt(url).toUpperCase();
  if (!ext) {
    if (isMediaPath(url)) return 'IMG';
    return 'FILE';
  }
  if (DOC_EXTS.has(ext.toLowerCase())) return ext;
  if (AUDIO_EXTS.has(ext.toLowerCase())) return ext;
  if (IMAGE_EXTS.has(ext.toLowerCase())) return ext;
  if (VIDEO_EXTS.has(ext.toLowerCase())) return ext;
  return ext;
}

export function isBlocked(rating) {
  return Number(rating) === 3;
}

/** 供 SQL / 逻辑使用的扩展名列表（仅白名单） */
export function kindExtList(kind) {
  if (kind === 'image') return [...IMAGE_EXTS];
  if (kind === 'video') return [...VIDEO_EXTS];
  if (kind === 'audio') return [...AUDIO_EXTS];
  if (kind === 'doc') return [...DOC_EXTS];
  return [];
}

/**
 * 生成 kind 筛选 SQL 片段（参数化 binds）
 * 图片：有图片扩展名 OR（媒体路径且非 视频/音频/文档 扩展名）
 * —— 覆盖 /cfile/{file_id} 无后缀的 TG 图
 */
export function kindSqlClause(urlColumn, kind) {
  if (!kind) return { sql: '', binds: [] };

  if (kind === 'video' || kind === 'audio' || kind === 'doc') {
    const exts = kindExtList(kind);
    if (!exts.length) return { sql: '', binds: [] };
    return {
      sql: `(${exts.map(() => `lower(${urlColumn}) LIKE ?`).join(' OR ')})`,
      binds: exts.map((e) => `%.${e}`),
    };
  }

  if (kind === 'image') {
    const img = kindExtList('image');
    const nonImg = [
      ...kindExtList('video'),
      ...kindExtList('audio'),
      ...kindExtList('doc'),
    ];
    const imgSql = img.map(() => `lower(${urlColumn}) LIKE ?`).join(' OR ');
    const notNonImg = nonImg.map(() => `lower(${urlColumn}) NOT LIKE ?`).join(' AND ');
    const mediaPath = `(${urlColumn} LIKE '/rfile/%' OR ${urlColumn} LIKE '/cfile/%' OR ${urlColumn} LIKE '/file/%')`;
    return {
      sql: `((${imgSql}) OR (${mediaPath} AND (${notNonImg})))`,
      binds: [...img.map((e) => `%.${e}`), ...nonImg.map((e) => `%.${e}`)],
    };
  }

  return { sql: '', binds: [] };
}
