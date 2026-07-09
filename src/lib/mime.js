// 上传 MIME 归一化与白名单（R2 / TG 共用）

/** 扩展名 → 标准 MIME（空 type / 非标准 type 时兜底） */
const EXT_MIME = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** 非标准 / 别名 MIME → 标准 */
const ALIAS_MIME = {
  'application/x-pdf': 'application/pdf',
  'application/epub': 'application/epub+zip',
  'application/x-zip-compressed': null, // 不猜，靠扩展名
};

/** R2 / TG 均可存的文档类（可删优先 R2） */
export const DOC_MIMES = new Set([
  'application/epub+zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

/** 仅 TG 的文档（历史策略：PDF 走 TG sendDocument） */
export const TG_ONLY_DOC_MIMES = new Set(['application/pdf']);

/**
 * 浏览器常给空 type 或非标准 type，用扩展名兜底。
 * @param {{ type?: string, name?: string }} file
 * @returns {string} 归一化 MIME
 */
export function normalizeUploadMime(file) {
  const rawType = (file?.type || '').toLowerCase().trim();
  const name = file?.name || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  if (ext && EXT_MIME[ext]) {
    // 扩展名优先（macOS 常给空 type 或 application/octet-stream）
    if (
      !rawType ||
      rawType === 'application/octet-stream' ||
      rawType === 'application/x-zip-compressed' ||
      rawType === 'application/zip' ||
      ALIAS_MIME[rawType] !== undefined ||
      rawType === EXT_MIME[ext]
    ) {
      return EXT_MIME[ext];
    }
  }

  if (ALIAS_MIME[rawType]) return ALIAS_MIME[rawType];
  if (rawType === 'application/epub') return 'application/epub+zip';
  if (EXT_MIME[ext]) return EXT_MIME[ext];

  return rawType;
}

export function extFromMimeOrName(mime, name = '') {
  if (name.includes('.')) return name.split('.').pop().toLowerCase();
  for (const [ext, m] of Object.entries(EXT_MIME)) {
    if (m === mime) return ext;
  }
  return 'bin';
}

/** R2：图片/视频/音频/PDF + 办公文档（API 与可删存储统一走 R2） */
export function isAllowedR2Mime(mime) {
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    TG_ONLY_DOC_MIMES.has(mime) ||
    DOC_MIMES.has(mime)
  );
}

/** 开放 API 上传白名单（与 R2 一致） */
export function isAllowedApiMime(mime) {
  return isAllowedR2Mime(mime);
}

/** TG：图片/视频/音频/PDF + 同上文档 */
export function isAllowedTgMime(mime) {
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    TG_ONLY_DOC_MIMES.has(mime) ||
    DOC_MIMES.has(mime)
  );
}

/** TG sendDocument 用的 MIME 集合 */
export function isTgDocumentMime(mime) {
  return TG_ONLY_DOC_MIMES.has(mime) || DOC_MIMES.has(mime);
}

export function isPdfMime(mime, name = '') {
  return mime === 'application/pdf' || /\.pdf$/i.test(name);
}

export function isEpubMime(mime, name = '') {
  return mime === 'application/epub+zip' || /\.epub$/i.test(name);
}

export function isOfficeDocMime(mime, name = '') {
  if (DOC_MIMES.has(mime) && mime !== 'application/epub+zip') return true;
  return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(name || '');
}

export function officeDocLabel(mime, name = '') {
  const n = (name || '').toLowerCase();
  if (mime.includes('word') || mime === 'application/msword' || /\.docx?$/i.test(n)) return 'Word';
  if (mime.includes('sheet') || mime.includes('excel') || /\.xlsx?$/i.test(n)) return 'Excel';
  if (mime.includes('presentation') || mime.includes('powerpoint') || /\.pptx?$/i.test(n)) return 'PPT';
  if (isEpubMime(mime, name)) return 'EPUB';
  if (isPdfMime(mime, name)) return 'PDF';
  return '文档';
}
