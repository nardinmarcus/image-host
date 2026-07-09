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
  const parts = clean.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
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

/** image | video | audio | doc | other */
export function getKind(url = '') {
  const ext = getUrlExt(url);
  if (!ext) return 'other';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (DOC_EXTS.has(ext)) return 'doc';
  return 'other';
}

export function getKindLabel(kind) {
  return (
    { image: '图片', video: '视频', audio: '音频', doc: '文档', other: '其他' }[kind] || kind
  );
}

export function getDocBadge(url = '') {
  const ext = getUrlExt(url).toUpperCase();
  if (!ext) return 'FILE';
  if (DOC_EXTS.has(ext.toLowerCase())) return ext;
  if (AUDIO_EXTS.has(ext.toLowerCase())) return ext;
  return ext;
}

export function isBlocked(rating) {
  return Number(rating) === 3;
}

/** 供 SQL LIKE 扩展名条件生成（仅白名单扩展名，防注入） */
export function kindExtList(kind) {
  if (kind === 'image') return [...IMAGE_EXTS];
  if (kind === 'video') return [...VIDEO_EXTS];
  if (kind === 'audio') return [...AUDIO_EXTS];
  if (kind === 'doc') return [...DOC_EXTS];
  return [];
}
