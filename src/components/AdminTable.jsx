'use client';

import { useState, useEffect, useRef } from 'react';
import Switcher from '@/components/SwitchButton';
import { toast } from 'react-toastify';
import TooltipItem from '@/components/Tooltip';
import FullScreenIcon from '@/components/FullScreenIcon';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { formatTimeDisplay } from '@/lib/time';
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

function isImageKind(url) {
  return getKind(url) === 'image';
}
function isVideoKind(url) {
  return getKind(url) === 'video';
}

/**
 * A 表视图 + C 网格视图。layout: 'table' | 'grid'
 */
export default function AdminTable({ data: initialData = [], layout = 'table' }) {
  const [data, setData] = useState(initialData);
  const [modalData, setModalData] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setModalData(null);
    }
  };

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

  const renderPreview = (url, index, className = 'w-full h-full object-cover') => {
    const full = resolveUrl(url);
    const kind = getKind(url);
    if (kind === 'image') {
      return <img src={full} alt="" className={className} />;
    }
    if (kind === 'video') {
      return <video src={full} className={className} muted playsInline />;
    }
    const badge = getDocBadge(url);
    return (
      <div className="w-full h-full flex items-center justify-center bg-amber-50 text-amber-900 text-xs font-semibold">
        {badge}
      </div>
    );
  };

  function toggleFullScreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.querySelector('.PhotoView-Portal')?.requestFullscreen?.();
  }

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

  const KindBadge = ({ url }) => (
    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-600">
      {getKindLabel(getKind(url))}
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
                  <div
                    className="aspect-square bg-stone-100 cursor-pointer relative"
                    onClick={() => setModalData(item)}
                  >
                    {renderPreview(item.url, index)}
                    {isBlocked(item.rating) && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-red-600 text-white px-1.5 py-0.5 rounded">
                        拉黑
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1.5 flex-1 flex flex-col">
                    <div className="flex gap-1 flex-wrap">
                      <StorageBadge url={item.url} />
                      <KindBadge url={item.url} />
                    </div>
                    <p className="text-xs text-stone-600 truncate" title={item.url}>
                      {item.url}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      {formatTimeDisplay(item.time)} · PV {item.total ?? 0}
                    </p>
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
        {modalData && (
          <DetailModal
            modalData={modalData}
            modalRef={modalRef}
            onClose={() => setModalData(null)}
            onOutside={handleClickOutside}
            onCopy={handleCopy}
            resolveUrl={resolveUrl}
          />
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
              <th className="py-2.5 px-3 font-medium">时间</th>
              <th className="py-2.5 px-3 font-medium">IP</th>
              <th className="py-2.5 px-3 font-medium">PV</th>
              <th className="py-2.5 px-3 font-medium sticky right-0 bg-stone-50 z-10">操作</th>
            </tr>
          </thead>
          <tbody>
            <PhotoProvider
              maskOpacity={0.5}
              toolbarRender={({ rotate, onRotate, onScale, scale }) => (
                <>
                  <svg className="PhotoView-Slider__toolbarIcon" width="44" height="44" viewBox="0 0 768 768" fill="white" onClick={() => onScale(scale + 0.5)}>
                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM415.5 223.5v129h129v63h-129v129h-63v-129h-129v-63h129v-129h63z" />
                  </svg>
                  <svg className="PhotoView-Slider__toolbarIcon" width="44" height="44" viewBox="0 0 768 768" fill="white" onClick={() => onScale(scale - 0.5)}>
                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM223.5 352.5h321v63h-321v-63z" />
                  </svg>
                  <svg className="PhotoView-Slider__toolbarIcon" onClick={() => onRotate(rotate + 90)} width="44" height="44" fill="white" viewBox="0 0 768 768">
                    <path d="M565.5 202.5l75-75v225h-225l103.5-103.5c-34.5-34.5-82.5-57-135-57-106.5 0-192 85.5-192 192s85.5 192 192 192c84 0 156-52.5 181.5-127.5h66c-28.5 111-127.5 192-247.5 192-141 0-255-115.5-255-256.5s114-256.5 255-256.5c70.5 0 135 28.5 181.5 75z" />
                  </svg>
                  {typeof document !== 'undefined' && document.fullscreenEnabled && (
                    <FullScreenIcon onClick={toggleFullScreen} />
                  )}
                </>
              )}
            >
              {data.map((item, index) => {
                const full = resolveUrl(item.url);
                const previewable = isImageKind(item.url) || isVideoKind(item.url);
                return (
                  <tr key={item.url || index} className="border-t border-stone-100 hover:bg-stone-50/80">
                    <td className="p-2 sticky left-0 bg-white z-10 w-16">
                      <div className="w-12 h-12 rounded-md overflow-hidden border border-stone-200 bg-stone-50">
                        {previewable ? (
                          isVideoKind(item.url) ? (
                            <PhotoView
                              width={400}
                              height={400}
                              render={({ scale, attrs }) => {
                                const width = attrs.style.width;
                                const offset = (width - 400) / 400;
                                return (
                                  <div {...attrs} className={`flex-none bg-white ${attrs.className || ''}`}>
                                    {renderPreview(item.url, index)}
                                  </div>
                                );
                              }}
                            >
                              {renderPreview(item.url, index)}
                            </PhotoView>
                          ) : (
                            <PhotoView src={full}>{renderPreview(item.url, index)}</PhotoView>
                          )
                        ) : (
                          renderPreview(item.url, index)
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <button
                        type="button"
                        className="text-left text-stone-800 truncate block w-full hover:text-sky-700"
                        onClick={() => setModalData(item)}
                        title={item.url}
                      >
                        {item.url}
                      </button>
                      {isBlocked(item.rating) && (
                        <span className="text-[10px] text-red-600 font-medium">已拉黑</span>
                      )}
                    </td>
                    <td className="px-3 py-2"><StorageBadge url={item.url} /></td>
                    <td className="px-3 py-2"><KindBadge url={item.url} /></td>
                    <td className="px-3 py-2 text-stone-500 whitespace-nowrap text-xs">
                      {formatTimeDisplay(item.time)}
                    </td>
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

      {modalData && (
        <DetailModal
          modalData={modalData}
          modalRef={modalRef}
          onClose={() => setModalData(null)}
          onOutside={handleClickOutside}
          onCopy={handleCopy}
          resolveUrl={resolveUrl}
        />
      )}
    </div>
  );
}

function DetailModal({ modalData, modalRef, onClose, onOutside, onCopy, resolveUrl }) {
  const full = resolveUrl(modalData.url);
  return (
    <div onClick={onOutside} className="fixed z-50 inset-0 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" />
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl w-full max-w-md p-5 shadow-xl"
      >
        <button
          type="button"
          className="absolute top-3 right-3 text-stone-400 hover:text-red-600"
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>
        <h3 className="text-sm font-semibold text-stone-800 mb-1">资源详情</h3>
        <p className="text-xs text-stone-500 mb-3 break-all">{modalData.url}</p>
        <div className="flex flex-col gap-2">
          {[
            full,
            `![file](${full})`,
            `<a href="${full}" target="_blank">${full}</a>`,
          ].map((text, i) => (
            <input
              key={i}
              readOnly
              value={text}
              onClick={() => onCopy(text)}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-xs text-stone-700 cursor-pointer"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
