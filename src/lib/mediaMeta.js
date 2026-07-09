// 资源 MIME / kind 归一化与展示（上传写入 DB，筛选以 DB 为准）

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

const EXT_TO_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function getUrlExt(url = '') {
  const seg = String(url).split('/').pop() || '';
  const clean = seg.split('?')[0];
  const parts = clean.split('.');
  if (parts.length < 2) return '';
  const ext = parts.pop().toLowerCase();
  if (!ext || ext.length > 8) return '';
  return ext;
}

export function getStorage(url = '') {
  if (url.startsWith('/rfile/')) return 'r2';
  if (url.startsWith('/cfile/')) return 'tg';
  if (url.startsWith('/file/')) return 'file';
  return 'other';
}

export function getStorageLabel(storage) {
  return ({ r2: 'R2', tg: 'TG', file: 'TG旧', other: '其他' })[storage] || storage;
}

/** 由 MIME 得到 kind（权威来源：上传时的 File.type / Content-Type） */
export function kindFromMime(mime = '') {
  const m = String(mime || '').toLowerCase().trim();
  if (!m) return '';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (
    m === 'application/pdf' ||
    m === 'application/x-pdf' ||
    m === 'application/epub+zip' ||
    m === 'application/epub' ||
    m === 'application/msword' ||
    m === 'application/vnd.ms-excel' ||
    m === 'application/vnd.ms-powerpoint' ||
    m.includes('wordprocessingml') ||
    m.includes('spreadsheetml') ||
    m.includes('presentationml') ||
    m.includes('msword') ||
    m.includes('ms-excel') ||
    m.includes('ms-powerpoint')
  ) {
    return 'doc';
  }
  return 'other';
}

/** 仅 URL 回退（无 mime 的历史行） */
export function kindFromUrl(url = '') {
  const ext = getUrlExt(url);
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  if (AUDIO_EXTS.has(ext)) return 'audio';
  if (DOC_EXTS.has(ext)) return 'doc';
  return 'other';
}

export function mimeFromUrl(url = '') {
  const ext = getUrlExt(url);
  return EXT_TO_MIME[ext] || '';
}

/**
 * 展示/前端用：优先 row.mime → row.kind → URL
 * @param {{ url?: string, mime?: string, kind?: string }} row
 */
export function getKind(rowOrUrl) {
  if (rowOrUrl && typeof rowOrUrl === 'object') {
    if (rowOrUrl.kind) return rowOrUrl.kind;
    if (rowOrUrl.mime) {
      const k = kindFromMime(rowOrUrl.mime);
      if (k) return k;
    }
    return kindFromUrl(rowOrUrl.url || '');
  }
  return kindFromUrl(String(rowOrUrl || ''));
}

export function getKindLabel(kind) {
  return (
    { image: '图片', video: '视频', audio: '音频', doc: '文档', other: '其他' }[kind] || kind
  );
}

export function getDocBadge(rowOrUrl) {
  const url = typeof rowOrUrl === 'object' ? rowOrUrl?.url : rowOrUrl;
  const mime = typeof rowOrUrl === 'object' ? rowOrUrl?.mime : '';
  const kind = getKind(typeof rowOrUrl === 'object' ? rowOrUrl : { url });
  if (kind === 'image') return 'IMG';
  if (kind === 'video') return 'VID';
  if (kind === 'audio') return 'AUD';
  const ext = getUrlExt(url || '').toUpperCase();
  if (ext) return ext;
  if (mime) {
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word') || mime.includes('msword')) return 'DOC';
    if (mime.includes('sheet') || mime.includes('excel')) return 'XLS';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPT';
    if (mime.includes('epub')) return 'EPUB';
  }
  return 'FILE';
}

export function isBlocked(rating) {
  return Number(rating) === 3;
}

export function kindExtList(kind) {
  if (kind === 'image') return [...IMAGE_EXTS];
  if (kind === 'video') return [...VIDEO_EXTS];
  if (kind === 'audio') return [...AUDIO_EXTS];
  if (kind === 'doc') return [...DOC_EXTS];
  return [];
}

/** 历史数据 URL 回退 SQL（仅 kind 列为空时使用） */
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
    return {
      sql: `(${img.map(() => `lower(${urlColumn}) LIKE ?`).join(' OR ')})`,
      binds: img.map((e) => `%.${e}`),
    };
  }

  return { sql: '', binds: [] };
}

/**
 * 筛选：优先 kind/mime 列；无元数据的旧行再回退 URL 扩展名
 */
export function kindFilterSql(kind, { urlColumn = 'url', kindColumn = 'kind', mimeColumn = 'mime' } = {}) {
  if (!kind) return { sql: '', binds: [] };

  if (kind === 'image') {
    const urlFb = kindSqlClause(urlColumn, 'image');
    return {
      sql: `(${kindColumn} = ? OR ${mimeColumn} LIKE ? OR (((${kindColumn} IS NULL OR ${kindColumn} = '') AND (${mimeColumn} IS NULL OR ${mimeColumn} = '')) AND ${urlFb.sql}))`,
      binds: ['image', 'image/%', ...urlFb.binds],
    };
  }

  if (kind === 'video') {
    const urlFb = kindSqlClause(urlColumn, 'video');
    return {
      sql: `(${kindColumn} = ? OR ${mimeColumn} LIKE ? OR (((${kindColumn} IS NULL OR ${kindColumn} = '') AND (${mimeColumn} IS NULL OR ${mimeColumn} = '')) AND ${urlFb.sql}))`,
      binds: ['video', 'video/%', ...urlFb.binds],
    };
  }

  if (kind === 'audio') {
    const urlFb = kindSqlClause(urlColumn, 'audio');
    return {
      sql: `(${kindColumn} = ? OR ${mimeColumn} LIKE ? OR (((${kindColumn} IS NULL OR ${kindColumn} = '') AND (${mimeColumn} IS NULL OR ${mimeColumn} = '')) AND ${urlFb.sql}))`,
      binds: ['audio', 'audio/%', ...urlFb.binds],
    };
  }

  if (kind === 'doc') {
    const urlFb = kindSqlClause(urlColumn, 'doc');
    // doc 以 kind=doc 或常见 document mime 为准
    return {
      sql: `(${kindColumn} = ? OR ${mimeColumn} LIKE 'application/pdf%' OR ${mimeColumn} LIKE '%epub%' OR ${mimeColumn} LIKE '%word%' OR ${mimeColumn} LIKE '%sheet%' OR ${mimeColumn} LIKE '%presentation%' OR ${mimeColumn} LIKE '%msword%' OR ${mimeColumn} LIKE '%ms-excel%' OR ${mimeColumn} LIKE '%ms-powerpoint%' OR ${mimeColumn} = 'application/vnd.ms-excel' OR ${mimeColumn} = 'application/vnd.ms-powerpoint' OR (((${kindColumn} IS NULL OR ${kindColumn} = '') AND (${mimeColumn} IS NULL OR ${mimeColumn} = '')) AND ${urlFb.sql}))`,
      binds: ['doc', ...urlFb.binds],
    };
  }

  return { sql: '', binds: [] };
}
