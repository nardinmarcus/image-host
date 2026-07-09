'use client';

import { faImages, faTrashAlt, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import ProviderSelect from '@/components/ProviderSelect';
import UploadQueue from '@/components/UploadQueue';

/**
 * 上传区总成：标题统计 + 接口选择 + 队列 + 操作栏。
 */
export default function UploadPanel({
  total,
  ip,
  selectedOption,
  onSelectChange,
  isAuth,
  selectedFiles,
  filePreviews,
  uploading,
  minHeight,
  totalSizeMB,
  fileInputRef,
  onFileChange,
  onDrop,
  onDragOver,
  onPaste,
  onImageClick,
  onRemoveImage,
  onUploadOne,
  onClear,
  onUploadAll,
}) {
  const openFilePicker = () => {
    fileInputRef?.current?.click();
  };

  // 选择器始终放宽文档扩展名，避免系统对话框灰掉；实际上传由服务端校验。
  const accept = [
    'image/*',
    'video/*',
    'audio/*',
    '.pdf,application/pdf',
    '.epub,application/epub+zip',
    '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].join(',');
  const typeHint =
    selectedOption === 'tgchannel'
      ? '图片/视频/音频/PDF/EPUB/Word/Excel/PPT → 发到 TG 频道'
      : '图片/视频存 R2；文档/音频/PDF 会自动切 TG 发频道';

  return (
    <section className="flex flex-col gap-5">
      {/* 标题 + 统计 */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          上传你的图片
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          最大 20 MB（{typeHint}）。本站已托管{' '}
          <span className="font-semibold text-teal-600 tabular-nums">{total}</span>{' '}
          张图片；你的 IP：<span className="font-semibold text-teal-600">{ip}</span>
        </p>
      </div>

      {/* 接口选择 */}
      <ProviderSelect
        value={selectedOption}
        onChange={onSelectChange}
        isAuth={isAuth}
      />

      {/* 拖拽/粘贴上传队列 */}
      <UploadQueue
        selectedFiles={selectedFiles}
        filePreviews={filePreviews}
        uploading={uploading}
        minHeight={minHeight}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaste={onPaste}
        onImageClick={onImageClick}
        onRemoveImage={onRemoveImage}
        onUploadOne={onUploadOne}
        onOpenFilePicker={openFilePicker}
      />

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700"
        >
          <FontAwesomeIcon icon={faImages} className="w-4 h-4" />
          选择文件
        </label>
        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onFileChange}
          multiple
          accept={accept}
        />

        <div className="flex-1 flex items-center px-4 py-2.5 rounded-xl bg-slate-100/70 text-sm text-slate-600">
          已选择 <span className="font-semibold text-slate-900 mx-1 tabular-nums">{selectedFiles.length}</span> 张，共{' '}
          <span className="font-semibold text-slate-900 mx-1 tabular-nums">{totalSizeMB}</span> MB
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={selectedFiles.length === 0}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-red-500 font-semibold text-sm border border-red-200 ${
              selectedFiles.length === 0 ? 'opacity-40 pointer-events-none' : 'hover:bg-red-50'
            }`}
            onClick={onClear}
          >
            <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4" />
            清除
          </button>
          <button
            type="button"
            disabled={uploading || selectedFiles.length === 0}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold text-sm shadow-sm hover:bg-slate-800 ${
              uploading || selectedFiles.length === 0 ? 'pointer-events-none opacity-50' : ''
            }`}
            onClick={onUploadAll}
          >
            <FontAwesomeIcon icon={faUpload} className="w-4 h-4" />
            上传
          </button>
        </div>
      </div>
    </section>
  );
}
