'use client';

import { useState, useEffect } from 'react';
import Switcher from '@/components/SwitchButton';
import { toast } from 'react-toastify';
import TooltipItem from '@/components/Tooltip';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { formatTimeDisplay } from '@/lib/time';
import { formatBytes, metadataStatusClass, metadataStatusLabel } from '@/components/admin/adminFormat';
import {
  getStorage,
  getStorageLabel,
  getKind,
  getKindLabel,
  getDocBadge,
  isBlocked,
} from '@/lib/mediaMeta';

function resolveUrl(url) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return url?.startsWith('/file/') ||
    url?.startsWith('/cfile/') ||
    url?.startsWith('/rfile/')
    ? `${origin}/api${url}`
    : url;
}

function isImageKind(item) {
  return getKind(item) === 'image';
}
function isVideoKind(item) {
  return getKind(item) === 'video';
}

/**
 * 资源浏览器：保留表格/网格与快速操作，详情由父层抽屉统一承载。
 */
export default function AdminTable({ data: initialData = [], layout = 'table', onSelect, onRefresh }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('链接复制成功'));
  };

  const deleteItem = async (initName) => {
    try {
      const res = await fetch(`/api/admin/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: initName }),
      });
      const res_data = await res.json();
      if (res_data.success) {
        toast.success('删除成功');
        setData((prev) => prev.filter((item) => item.url !== initName));
        onRefresh?.();
      } else {
        toast.error(res_data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (url) => {
    const storage = getStorage(url);
    const msg =
      storage === 'tg' || storage === 'file'
        ? '将从站内移除记录。\n注意：Telegram 频道中的文件不会被删除。\n确定继续？'
        : storage === 'r2'
          ? '将删除 R2 对象与站内记录，链接将不可访问。\n确定继续？'
          : '确定删除该项目？';
    if (window.confirm(msg)) await deleteItem(url);
  };

  const renderPreview = (item, className = 'w-full h-full object-cover') => {
    const url = typeof item === 'string' ? item : item.url;
    const full = resolveUrl(url);
    const kind = getKind(typeof item === 'string' ? { url } : item);
    if (kind === 'image') {
      return <img src={full} alt="" className={className} />;
    }
    if (kind === 'video') {
      return <video src={full} className={className} muted playsInline />;
    }
    const badge = getDocBadge(typeof item === 'string' ? { url } : item);
    return (
      <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-900 text-xs font-semibold">
        {badge}
      </div>
    );
  };

  const StorageBadge = ({ url }) => {
    const s = getStorage(url);
    const colors = {
      r2: 'bg-sky-50 text-sky-800',
      tg: 'bg-violet-50 text-violet-800',
      file: 'bg-stone-100 text-stone-600',
      other: 'bg-stone-100 text-stone-500',
    };
    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${colors[s]}`}>
        {getStorageLabel(s)}
      </span>
    );
  };

  const KindBadge = ({ item }) => (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600"
      title={item.mime || ''}
    >
      {getKindLabel(getKind(item))}
    </span>
  );

  // —— 网格视图（C）——
  if (layout === 'grid') {
    return (
      <div>
        {data.length === 0 ? (
          <div className="text-center text-stone-400 py-16 text-sm">暂无资源</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {data.map((item, index) => {
              const full = resolveUrl(item.url);
              return (
                <div
                  key={item.url || index}
                  className="bg-white border border-stone-200 rounded-xl overflow-hidden flex flex-col shadow-sm"
                >
                  <button
                    type="button"
                    className="aspect-square w-full bg-stone-100 cursor-pointer relative text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                    onClick={() => onSelect?.(item)}
                    aria-label={`查看资源详情：${item.url}`}
                  >
                    {renderPreview(item)}
                    {isBlocked(item.rating) && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-red-600 text-white px-1.5 py-0.5 rounded">
                        拉黑
                      </span>
                    )}
                  </button>
                  <div className="p-2.5 space-y-1.5 flex-1 flex flex-col">
                    <div className="flex gap-1 flex-wrap">
                      <StorageBadge url={item.url} />
                      <KindBadge item={item} />
                    </div>
                    <p className="text-xs text-stone-600 truncate" title={item.url}>
                      {item.url}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {formatTimeDisplay(item.time)} · PV {item.total ?? 0}
                    </p>
                    <p className="text-[11px] text-stone-400">{formatBytes(item.size_bytes)} · {metadataStatusLabel(item.metadata_status)}</p>
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <button
                        type="button"
                        className="text-xs text-sky-700 hover:underline"
                        onClick={() => handleCopy(full)}
                      >
                        复制
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => handleDelete(item.url)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // —— 表视图（A）——
  return (
    <div className="overflow-x-auto border border-stone-200 rounded-xl bg-white">
      {data.length === 0 ? (
        <div className="text-center text-stone-400 py-16 text-sm">暂无资源</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-stone-50 text-stone-500 text-left">
              <th className="py-2.5 px-3 font-medium sticky left-0 bg-stone-50 z-10">预览</th>
              <th className="py-2.5 px-3 font-medium">路径</th>
              <th className="py-2.5 px-3 font-medium">来源</th>
              <th className="py-2.5 px-3 font-medium">类型</th>
              <th className="py-2.5 px-3 font-medium">大小</th>
              <th className="py-2.5 px-3 font-medium">时间</th>
              <th className="py-2.5 px-3 font-medium">最近访问</th>
              <th className="py-2.5 px-3 font-medium">IP</th>
              <th className="py-2.5 px-3 font-medium">PV</th>
              <th className="py-2.5 px-3 font-medium sticky right-0 bg-stone-50 z-10">操作</th>
            </tr>
          </thead>
          <tbody>
            <PhotoProvider maskOpacity={0.5}>
              {data.map((item, index) => {
                const full = resolveUrl(item.url);
                const previewable = isImageKind(item) || isVideoKind(item);
                return (
                  <tr key={item.url || index} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="p-2 sticky left-0 bg-white z-10 w-16">
                      <div className="w-12 h-12 rounded-md overflow-hidden border border-stone-200 bg-stone-50">
                        {previewable ? (
                          isVideoKind(item) ? (
                            <PhotoView
                              width={400}
                              height={400}
                              render={({ attrs }) => {
                                return (
                                  <div {...attrs} className={`flex-none bg-white ${attrs.className || ''}`}>
                                    {renderPreview(item)}
                                  </div>
                                );
                              }}
                            >
                              {renderPreview(item)}
                            </PhotoView>
                          ) : (
                            <PhotoView src={full}>{renderPreview(item)}</PhotoView>
                          )
                        ) : (
                          renderPreview(item)
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <button
                        type="button"
                        className="text-left text-stone-800 truncate block w-full hover:text-sky-700"
                        onClick={() => onSelect?.(item)}
                        title={item.url}
                      >
                        {item.url}
                      </button>
                      {isBlocked(item.rating) && (
                        <span className="text-[10px] text-red-600 font-medium">已拉黑</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><StorageBadge url={item.url} /></td>
                    <td className="px-3 py-2"><KindBadge item={item} /></td>
                    <td className="px-3 py-2 text-xs text-stone-600 whitespace-nowrap">
                      <span>{formatBytes(item.size_bytes)}</span>
                      <span className={`mt-1 block w-fit rounded px-1 py-0.5 text-[10px] font-medium ${metadataStatusClass(item.metadata_status)}`}>{metadataStatusLabel(item.metadata_status)}</span>
                    </td>
                    <td className="px-3 py-2 text-stone-500 whitespace-nowrap text-xs">
                      {formatTimeDisplay(item.time)}
                    </td>
                    <td className="px-3 py-2 text-stone-500 whitespace-nowrap text-xs">{formatTimeDisplay(item.last_accessed_at) || '尚无访问'}</td>
                    <td className="px-3 py-2 text-stone-500 max-w-[100px] truncate text-xs">
                      <TooltipItem tooltipsText={item.ip} position="bottom">{item.ip}</TooltipItem>
                    </td>
                    <td className="px-3 py-2 text-stone-700 font-variant-numeric tabular-nums">
                      {item.total ?? 0}
                    </td>
                    <td className="px-3 py-2 sticky right-0 bg-white z-10">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          className="text-xs text-sky-700 px-2 py-1 rounded hover:bg-sky-50"
                          onClick={() => handleCopy(full)}
                        >
                          复制
                        </button>
                        <Switcher initialChecked={item.rating} initName={item.url} />
                        <button
                          type="button"
                          onClick={() => handleDelete(item.url)}
                          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </PhotoProvider>
          </tbody>
        </table>
      )}

    </div>
  );
}
