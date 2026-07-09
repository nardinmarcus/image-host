'use client';

import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRightFromSquare,
  faCopy,
  faEye,
  faTrash,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import Switcher from '@/components/SwitchButton';
import {
  getDocBadge,
  getKind,
  getKindLabel,
  getStorage,
  getStorageLabel,
  isBlocked,
} from '@/lib/mediaMeta';
import { formatTimeDisplay } from '@/lib/time';
import {
  formatBytes,
  formatNumber,
  metadataStatusClass,
  metadataStatusLabel,
} from './adminFormat';

function resolveUrl(url) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return url?.startsWith('/file/') || url?.startsWith('/cfile/') || url?.startsWith('/rfile/')
    ? `${origin}/api${url}`
    : url;
}

function DetailTrend({ items }) {
  const max = Math.max(...items.map((item) => Number(item.pv || 0)), 1);
  if (!items.some((item) => item.pv)) return <p className="text-sm text-stone-500">该时间范围内暂无访问记录。</p>;
  return (
    <div className="flex h-20 items-end gap-1" role="img" aria-label="资源访问趋势">
      {items.map((item) => (
        <div key={item.day} className="group flex h-full min-w-0 flex-1 items-end" title={`${item.day}：${item.pv} PV`}>
          <div className="w-full rounded-t bg-teal-500/85 group-hover:bg-teal-600" style={{ height: `${Math.max((item.pv / max) * 100, item.pv ? 7 : 0)}%` }} />
        </div>
      ))}
    </div>
  );
}

function Preview({ media }) {
  const url = resolveUrl(media.url);
  const kind = getKind(media);
  if (kind === 'image') return <img src={url} alt={`文件预览：${media.url}`} className="h-full w-full object-contain" />;
  if (kind === 'video') return <video src={url} controls playsInline className="h-full w-full object-contain" />;
  return <span className="text-sm font-semibold tracking-wide text-amber-900">{getDocBadge(media)}</span>;
}

export default function AdminResourceDrawer({ url, range, onClose, onDeleted }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    let active = true;
    setDetail(null);
    setError('');
    fetch(`/api/admin/resource?url=${encodeURIComponent(url)}&range=${range}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.message || '获取资源详情失败');
        return payload.data;
      })
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((fetchError) => {
        if (active) setError(fetchError.message || '获取资源详情失败');
      });
    return () => {
      active = false;
    };
  }, [url, range]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const handleCopy = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error('复制失败，请检查浏览器权限');
    }
  };

  const handleDelete = async () => {
    const media = detail?.media;
    if (!media || deleting) return;
    const storage = getStorage(media.url);
    const message = storage === 'r2'
      ? '将删除 R2 对象与站内记录，链接将不可访问。确定继续？'
      : '将从站内移除记录。Telegram 中的原文件不会被删除。确定继续？';
    if (!window.confirm(message)) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/admin/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: media.url }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || '删除失败');
      toast.success('资源已删除');
      onDeleted();
    } catch (deleteError) {
      toast.error(deleteError.message || '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const media = detail?.media;
  const full = media ? resolveUrl(media.url) : '';
  const facts = media ? [
    ['存储位置', getStorageLabel(getStorage(media.url))],
    ['文件类型', getKindLabel(getKind(media))],
    ['MIME', media.mime || '未采集'],
    ['文件大小', formatBytes(media.size_bytes)],
    ['上传时间', formatTimeDisplay(media.time) || '未记录'],
    ['最近访问', formatTimeDisplay(media.last_accessed_at) || '尚无访问'],
    ['元数据', metadataStatusLabel(media.metadata_status)],
  ] : [];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="resource-detail-title">
      <button type="button" aria-label="关闭资源详情" className="absolute inset-0 h-full w-full bg-stone-950/35" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl md:w-[32rem]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-stone-200 px-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Resource detail</p>
            <h2 id="resource-detail-title" className="truncate text-base font-semibold text-stone-900">资源详情</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500" aria-label="关闭资源详情">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
          {!detail && !error ? <div className="space-y-3"><div className="h-48 animate-pulse rounded-xl bg-stone-100" /><div className="h-20 animate-pulse rounded-xl bg-stone-100" /></div> : null}
          {media ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="flex aspect-video items-center justify-center overflow-hidden bg-stone-100">
                  <Preview media={media} />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-800">{getStorageLabel(getStorage(media.url))}</span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-700">{getKindLabel(getKind(media))}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${metadataStatusClass(media.metadata_status)}`}>{metadataStatusLabel(media.metadata_status)}</span>
                    {isBlocked(media.rating) ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">已拉黑</span> : null}
                  </div>
                  <p className="break-all text-xs leading-5 text-stone-600">{media.url}</p>
                </div>
              </div>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">文件属性</h3>
                <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-stone-200 text-sm">
                  {facts.map(([label, value]) => (
                    <div key={label} className="border-b border-stone-100 px-3 py-2.5 even:border-l last:border-b-0 [&:nth-last-child(2):nth-child(odd)]:border-b-0">
                      <dt className="text-xs text-stone-500">{label}</dt>
                      <dd className="mt-0.5 break-all font-medium text-stone-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">访问表现</h3>
                  <span className="text-xs text-stone-500">近 {range === '7d' ? '7' : '30'} 天</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs text-teal-800">PV</p><p className="mt-1 text-lg font-semibold tabular-nums text-teal-950">{formatNumber(detail.access.pv)}</p></div>
                  <div className="rounded-xl bg-sky-50 p-3"><p className="text-xs text-sky-800">独立访问 IP</p><p className="mt-1 text-lg font-semibold tabular-nums text-sky-950">{formatNumber(detail.access.uniqueIps)}</p></div>
                </div>
                <div className="mt-3 rounded-xl border border-stone-200 p-3"><DetailTrend items={detail.trend || []} /></div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-stone-900">主要访问来源</h3>
                {detail.referers?.length ? <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 px-3">{detail.referers.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 truncate text-stone-600" title={item.name}>{item.name}</span><span className="font-medium tabular-nums text-stone-900">{formatNumber(item.count)}</span></div>)}</div> : <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-500">该范围内暂无来源记录。</p>}
              </section>
            </div>
          ) : null}
        </div>

        {media ? <footer className="border-t border-stone-200 bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleCopy(full, '直链已复制')} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"><FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />复制直链</button>
            <a href={full} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50"><FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5" />打开原件</a>
            <div className="flex min-h-10 items-center justify-center rounded-lg border border-stone-300"><Switcher initialChecked={media.rating} initName={media.url} /></div>
            <button type="button" onClick={handleDelete} disabled={deleting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"><FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />{deleting ? '删除中…' : '删除'}</button>
          </div>
        </footer> : null}
      </aside>
    </div>
  );
}
