'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { faSearchPlus, faTrashAlt, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import LoadingOverlay from '@/components/LoadingOverlay';

/**
 * 拖拽/粘贴上传队列：文件预览卡片 + 键盘可达 drop 区。
 */
export default function UploadQueue({
  selectedFiles,
  filePreviews,
  uploading,
  minHeight,
  onDrop,
  onDragOver,
  onPaste,
  onImageClick,
  onRemoveImage,
  onUploadOne,
  onOpenFilePicker,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenFilePicker?.();
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (e.dataTransfer?.types?.includes('Files')) setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const handleDropInternal = (e) => {
    dragCounter.current = 0;
    setIsDragging(false);
    onDrop(e);
  };

  return (
    <div
      className={`relative rounded-3xl border-2 border-dashed bg-white p-5 transition-colors focus:outline-none focus-visible:border-teal-400 focus-visible:ring-4 focus-visible:ring-teal-100 ${
        isDragging
          ? 'border-teal-500 bg-teal-50/50 ring-4 ring-teal-100'
          : 'border-slate-300 hover:border-slate-400'
      }`}
      onDrop={handleDropInternal}
      onDragOver={onDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onPaste={onPaste}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="拖拽文件到此处，或按 Enter 选择文件，也可粘贴截图"
      style={{ minHeight: selectedFiles.length === 0 ? 220 : undefined }}
    >
      {selectedFiles.length === 0 ? (
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center px-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-1">
            <FontAwesomeIcon icon={faUpload} className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            拖拽文件到这里，或按 Enter 选择
          </p>
          <p className="text-xs text-slate-400">也可以直接粘贴截图</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <LoadingOverlay loading={uploading} />
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="np-file-card relative rounded-2xl w-40 bg-white border border-slate-200 shadow-[0_2px_12px_rgb(15_23_42/0.06)] flex flex-col items-center overflow-hidden"
            >
              <div
                className="relative w-full h-32 cursor-pointer"
                onClick={() => onImageClick(index)}
                role="presentation"
              >
                {file.type.startsWith('image/') && (
                  <Image
                    src={filePreviews[index]}
                    alt={`预览 ${file.name}`}
                    fill={true}
                    className="object-cover"
                  />
                )}
                {file.type.startsWith('video/') && (
                  <video
                    src={filePreviews[index]}
                    controls
                    className="w-full h-full object-cover"
                  />
                )}
                {file.type.startsWith('audio/') && (
                  <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 p-2 gap-1">
                    <FontAwesomeIcon icon={faUpload} className="w-5 h-5 text-slate-400" />
                    <p className="text-xs text-slate-500 truncate w-full text-center">
                      {file.name}
                    </p>
                  </div>
                )}
                {(() => {
                  const name = file.name || '';
                  const t = file.type || '';
                  let label = null;
                  if (t === 'application/pdf' || t === 'application/x-pdf' || /\.pdf$/i.test(name)) label = 'PDF';
                  else if (t === 'application/epub+zip' || t === 'application/epub' || /\.epub$/i.test(name)) label = 'EPUB';
                  else if (/\.docx?$/i.test(name) || t.includes('word') || t === 'application/msword') label = 'Word';
                  else if (/\.xlsx?$/i.test(name) || t.includes('sheet') || t.includes('excel')) label = 'Excel';
                  else if (/\.pptx?$/i.test(name) || t.includes('presentation') || t.includes('powerpoint')) label = 'PPT';
                  if (label) {
                    return (
                      <div className="flex flex-col items-center justify-center w-full h-full bg-amber-50 text-slate-600 p-2 gap-1">
                        <span className="text-sm font-bold text-amber-700">{label}</span>
                        <p className="text-xs text-center break-all leading-tight line-clamp-2">{name}</p>
                      </div>
                    );
                  }
                  if (
                    !t.startsWith('image/') &&
                    !t.startsWith('video/') &&
                    !t.startsWith('audio/')
                  ) {
                    return (
                      <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-500 p-2">
                        <p className="text-xs text-center break-all line-clamp-3">{name}</p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex items-center justify-center w-full py-2 gap-1.5 border-t border-slate-100">
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                  onClick={() => onImageClick(index)}
                  aria-label={`预览 ${file.name}`}
                >
                  <FontAwesomeIcon icon={faSearchPlus} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => onRemoveImage(index)}
                  aria-label={`移除 ${file.name}`}
                >
                  <FontAwesomeIcon icon={faTrashAlt} className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                  onClick={() => onUploadOne(file)}
                  aria-label={`上传 ${file.name}`}
                >
                  <FontAwesomeIcon icon={faUpload} className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
