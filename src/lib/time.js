// 统一时间获取 —— 消除多处复制
// 存储：ISO8601 + Asia/Shanghai 偏移（可排序/可筛选）
// 展示：formatTimeDisplay 兼容旧「2026年7月9日 …」与 ISO

/**
 * 当前时间（上海）ISO8601，例：2026-07-09T22:14:18+08:00
 * 保持 async 签名，兼容既有 await nowTime() 调用。
 */
export async function nowTime() {
  // sv-SE → "YYYY-MM-DD HH:mm:ss"
  const local = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${local.replace(' ', 'T')}+08:00`;
}

/**
 * 后台/日志展示用。旧中文本地化字符串原样返回；ISO 转成 zh-CN 可读。
 */
export function formatTimeDisplay(time) {
  if (time == null || time === '') return '';
  const s = String(time);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    }
  }
  return s;
}
