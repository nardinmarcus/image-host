'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { faCheck, faFileArrowUp, faRotateRight, faSearchPlus, faTrashAlt, faTriangleExclamation, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const statusMeta = {
  ready: { label: '准备上传', className: 'bg-slate-100 text-slate-600' },
  uploading: { label: '上传中', className: 'bg-sky-50 text-sky-700' },
  success: { label: '已完成', className: 'bg-teal-50 text-teal-700' },
  error: { label: '上传失败', className: 'bg-red-50 text-red-700' },
};

function fileLabel(file) {
  const name = file.name || '';
  if (/\.pdf$/i.test(name)) return 'PDF';
  if (/\.epub$/i.test(name)) return 'EPUB';
  if (/\.docx?$/i.test(name)) return 'Word';
  if (/\.xlsx?$/i.test(name)) return 'Excel';
  if (/\.pptx?$/i.test(name)) return 'PPT';
  if (file.type.startsWith('audio/')) return '音频';
  return '文件';
}

export default function UploadQueue({ queue, onDrop, onPaste, onOpenFilePicker, onPreview, onRemove, onRetry }) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const empty = queue.length === 0;

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragCounter.current += 1;
    if (event.dataTransfer?.types?.includes('Files')) setIsDragging(true);
  };
  const handleDragLeave = (event) => {
    event.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const handleDrop = (event) => {
    dragCounter.current = 0;
    setIsDragging(false);
    onDrop(event);
  };
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenFilePicker();
    }
  };

  return (
    <div className={`relative rounded-3xl border-2 border-dashed bg-white p-5 transition-colors focus-visible:outline-none focus-visible:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-100 ${isDragging ? 'border-teal-500 bg-teal-50/50 ring-4 ring-teal-100' : 'border-slate-300 hover:border-slate-400'}`} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onPaste={onPaste} onClick={empty ? onOpenFilePicker : undefined} onKeyDown={handleKeyDown} tabIndex={0} role="button" aria-label="点击、拖拽或粘贴文件到上传队列">
      {empty ? (
        <div className="flex h-52 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50"><FontAwesomeIcon icon={faUpload} className="h-5 w-5 text-teal-600" /></div>
          <p className="text-sm font-semibold text-slate-700">点击、拖拽文件到这里，或按 Enter 选择</p>
          <p className="text-xs text-slate-400">也可以直接粘贴截图</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {queue.map((item) => {
            const { file } = item;
            const status = statusMeta[item.status];
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            return (
              <article key={item.id} className="relative flex min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_12px_rgb(15_23_42/0.06)]">
                <button type="button" onClick={() => onPreview(item.id)} className="relative h-24 w-24 shrink-0 overflow-hidden bg-slate-50 text-left focus-visible:z-10" aria-label={`预览 ${file.name}`}>
                  {isImage ? <Image src={item.previewUrl} alt="" fill className="object-cover" /> : null}
                  {isVideo ? <video src={item.previewUrl} className="h-full w-full object-cover" muted /> : null}
                  {!isImage && !isVideo ? <span className="flex h-full w-full items-center justify-center bg-amber-50 px-2 text-center text-xs font-bold text-amber-700">{fileLabel(file)}</span> : null}
                </button>
                <div className="flex min-w-0 flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800" title={file.name}>{file.name}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  {item.status === 'uploading' ? <div className="mt-2"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${item.progress}%` }} /></div><p className="mt-1 text-xs text-teal-700">{item.progress}%</p></div> : null}
                  {item.status === 'error' ? <p className="mt-2 line-clamp-2 text-xs text-red-600">{item.error}</p> : null}
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <button type="button" onClick={() => onPreview(item.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700" aria-label={`预览 ${file.name}`}><FontAwesomeIcon icon={faSearchPlus} className="h-3.5 w-3.5" /></button>
                    {item.status === 'error' ? <button type="button" onClick={() => onRetry(item.id)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-teal-700 hover:bg-teal-50" aria-label={`重试上传 ${file.name}`}><FontAwesomeIcon icon={faRotateRight} className="h-3 w-3" />重试</button> : null}
                    {item.status === 'success' ? <span className="inline-flex h-8 items-center gap-1 px-2 text-xs font-semibold text-teal-700"><FontAwesomeIcon icon={faCheck} className="h-3 w-3" />结果已生成</span> : null}
                    {item.status === 'ready' ? <span className="inline-flex h-8 items-center gap-1 px-2 text-xs text-slate-500"><FontAwesomeIcon icon={faFileArrowUp} className="h-3 w-3" />等待上传</span> : null}
                    <button type="button" disabled={item.status === 'uploading'} onClick={() => onRemove(item.id)} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label={`移除 ${file.name}`}><FontAwesomeIcon icon={item.status === 'error' ? faTriangleExclamation : faTrashAlt} className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
