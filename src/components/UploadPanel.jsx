'use client';

import Link from 'next/link';
import { faImages, faTrashAlt, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ProviderSelect from '@/components/ProviderSelect';
import UploadQueue from '@/components/UploadQueue';

const accept = [
  'image/*', 'video/*', 'audio/*', '.pdf,application/pdf', '.epub,application/epub+zip',
  '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

export default function UploadPanel({
  total,
  selectedStorage,
  onStorageChange,
  isAuth,
  queue,
  totalSizeMB,
  canUpload,
  isUploading,
  fileInputRef,
  onFileChange,
  onDrop,
  onPaste,
  onPreview,
  onRemove,
  onRetry,
  onUploadAll,
  onClear,
}) {
  const openFilePicker = () => fileInputRef.current?.click();
  const successful = queue.filter((item) => item.status === 'success').length;
  const pending = queue.filter((item) => item.status !== 'success').length;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="upload-title">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Namoo Pix</p>
        <h1 id="upload-title" className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">上传文件</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">支持图片、视频、音频、PDF、EPUB 与 Office 文件，单个文件最大 20 MB。{total === '?' ? '' : `本站已托管 ${total} 个文件。`}</p>
      </div>

      {!isAuth ? (
        <div className="max-w-2xl rounded-3xl border border-teal-100 bg-white p-6 shadow-[0_2px_12px_rgb(15_23_42/0.04)]">
          <h2 className="text-base font-bold text-slate-900">登录后即可上传</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">登录后选择可删除托管，或在确认后将文件发送到 Telegram 频道。我们会在上传前说明删除边界。</p>
          <Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700"><FontAwesomeIcon icon={faUpload} className="h-4 w-4" />登录后上传</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <ProviderSelect value={selectedStorage} onChange={onStorageChange} />
          <div className="flex min-w-0 flex-col gap-5">
            <UploadQueue
              queue={queue}
              onDrop={onDrop}
              onPaste={onPaste}
              onOpenFilePicker={openFilePicker}
              onPreview={onPreview}
              onRemove={onRemove}
              onRetry={onRetry}
            />
            <input id="file-upload" ref={fileInputRef} type="file" className="hidden" onChange={onFileChange} multiple accept={accept} />
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center xl:grid-cols-[auto_minmax(0,1fr)_auto]">
              <label htmlFor="file-upload" className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700"><FontAwesomeIcon icon={faImages} className="h-4 w-4" />选择文件</label>
              <div className="rounded-xl bg-slate-100/70 px-4 py-3 text-sm text-slate-600">队列中 <strong className="tabular-nums text-slate-900">{pending}</strong> 个文件，共 <strong className="tabular-nums text-slate-900">{totalSizeMB}</strong> MB{successful ? <span className="ml-2 text-teal-700">已完成 {successful}</span> : null}</div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:w-fit sm:justify-self-end xl:col-span-1">
                <button type="button" disabled={!queue.length || isUploading} onClick={onClear} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><FontAwesomeIcon icon={faTrashAlt} className="h-4 w-4" />清除</button>
                <button type="button" disabled={!canUpload || isUploading} onClick={onUploadAll} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><FontAwesomeIcon icon={faUpload} className="h-4 w-4" />{isUploading ? '上传中…' : '上传全部'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
