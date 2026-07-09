import { formatTimeDisplay } from '@/lib/time';

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

export function formatBytes(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
    return '未采集';
  }
  const bytes = Number(value);
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export function formatDelta(value) {
  const delta = Number(value || 0);
  if (delta === 0) return '与上期持平';
  return `${delta > 0 ? '+' : ''}${formatNumber(delta)} 次较上期`;
}

export function formatShortDate(value) {
  if (!value) return '—';
  const display = formatTimeDisplay(value);
  return display.replace(/\s.*$/, '');
}

export function metadataStatusLabel(status) {
  return {
    complete: '信息完整',
    partial: '部分采集',
    pending: '等待补全',
    unavailable: '暂不可得',
    failed: '采集失败',
  }[status] || '等待补全';
}

export function metadataStatusClass(status) {
  return {
    complete: 'bg-emerald-50 text-emerald-700',
    partial: 'bg-sky-50 text-sky-700',
    pending: 'bg-amber-50 text-amber-800',
    unavailable: 'bg-stone-100 text-stone-600',
    failed: 'bg-red-50 text-red-700',
  }[status] || 'bg-amber-50 text-amber-800';
}
