'use client';

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

  return (
    <div
      className="border-2 border-dashed border-slate-400 rounded-md relative focus:outline-none focus:ring-2 focus:ring-blue-400"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onPaste={onPaste}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="拖拽文件到此处，或按 Enter 选择文件，也可粘贴截图"
      style={{ minHeight }}
    >
      <div className="flex flex-wrap gap-3 min-h-[240px]">
        <LoadingOverlay loading={uploading} />
        {selectedFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="relative rounded-2xl w-44 h-48 ring-offset-2 ring-2 mx-3 my-3 flex flex-col items-center"
          >
            <div
              className="relative w-36 h-36"
              onClick={() => onImageClick(index)}
              role="presentation"
            >
              {file.type.startsWith('image/') && (
                <Image
                  src={filePreviews[index]}
                  alt={`Preview ${file.name}`}
                  fill={true}
                />
              )}
              {file.type.startsWith('video/') && (
                <video
                  src={filePreviews[index]}
                  controls
                  className="w-full h-full"
                />
              )}
              {file.type.startsWith('audio/') && (
                <div className="flex flex-col items-center justify-center w-full h-full bg-gray-100 p-2">
                  <p className="text-xs text-gray-600 truncate w-full text-center mb-1">
                    {file.name}
                  </p>
                  <audio src={filePreviews[index]} controls className="w-full" />
                </div>
              )}
              {(file.type === 'application/pdf' ||
                file.type === 'application/x-pdf' ||
                /\.pdf$/i.test(file.name || '')) && (
                <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-700 p-2">
                  <p className="text-sm text-center break-all">PDF<br />{file.name}</p>
                </div>
              )}
              {(file.type === 'application/epub+zip' ||
                file.type === 'application/epub' ||
                /\.epub$/i.test(file.name || '')) && (
                <div className="flex items-center justify-center w-full h-full bg-amber-50 text-gray-700 p-2">
                  <p className="text-sm text-center break-all">EPUB<br />{file.name}</p>
                </div>
              )}
              {!file.type.startsWith('image/') &&
                !file.type.startsWith('video/') &&
                !file.type.startsWith('audio/') &&
                file.type !== 'application/pdf' &&
                file.type !== 'application/x-pdf' &&
                !/\.pdf$/i.test(file.name || '') &&
                file.type !== 'application/epub+zip' &&
                file.type !== 'application/epub' &&
                !/\.epub$/i.test(file.name || '') && (
                <div className="flex items-center justify-center w-full h-full bg-gray-200 text-gray-700">
                  <p>{file.name}</p>
                </div>
              )}
            </div>
            <div className="flex flex-row items-center justify-center w-full mt-3">
              <button
                type="button"
                className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                onClick={() => onImageClick(index)}
                aria-label={`预览 ${file.name}`}
              >
                <FontAwesomeIcon icon={faSearchPlus} />
              </button>
              <button
                type="button"
                className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                onClick={() => onRemoveImage(index)}
                aria-label={`移除 ${file.name}`}
              >
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
              <button
                type="button"
                className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer mx-2"
                onClick={() => onUploadOne(file)}
                aria-label={`上传 ${file.name}`}
              >
                <FontAwesomeIcon icon={faUpload} />
              </button>
            </div>
          </div>
        ))}

        {selectedFiles.length === 0 && (
          <div className="absolute -z-10 left-0 top-0 w-full h-full flex items-center justify-center">
            <div className="text-gray-500 text-center px-4">
              拖拽文件到这里，或按 Enter 选择文件，也可粘贴截图
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
