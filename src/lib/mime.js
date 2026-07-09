// 上传 MIME 归一化与白名单（R2 / TG 共用）

/**
 * 浏览器常给空 type 或非标准 type，用扩展名兜底。
 * @param {{ type?: string, name?: string }} file
 * @returns {string} 归一化 MIME
 */
export function normalizeUploadMime(file) {
  const rawType = (file?.type || '').toLowerCase().trim();
  const name = file?.name || '';

  if (
    rawType === 'application/pdf' ||
    rawType === 'application/x-pdf' ||
    /\.pdf$/i.test(name)
  ) {
    return 'application/pdf';
  }

  if (
    rawType === 'application/epub+zip' ||
    rawType === 'application/epub' ||
    /\.epub$/i.test(name)
  ) {
    return 'application/epub+zip';
  }

  return rawType;
}

/** R2：图片/视频/EPUB（文档可删、无 TG getFile 限制） */
export function isAllowedR2Mime(mime) {
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime === 'application/epub+zip'
  );
}

/** TG：图片/视频/音频/PDF/EPUB */
export function isAllowedTgMime(mime) {
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime === 'application/pdf' ||
    mime === 'application/epub+zip'
  );
}

export function isPdfMime(mime, name = '') {
  return mime === 'application/pdf' || /\.pdf$/i.test(name);
}

export function isEpubMime(mime, name = '') {
  return mime === 'application/epub+zip' || /\.epub$/i.test(name);
}
