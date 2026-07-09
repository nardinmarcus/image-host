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

  // R2：图片/视频；TG_Channel：另支持音频与 PDF
  const accept =
    selectedOption === 'tgchannel'
      ? 'image/*,video/*,audio/*,application/pdf'
      : 'image/*,video/*';
  const typeHint =
    selectedOption === 'tgchannel'
      ? '图片/视频/音频/PDF'
      : '图片/视频';

  return (
    <>
      <div className="flex flex-row">
        <div className="flex flex-col">
          <div className="text-gray-800 text-lg">文件上传</div>
          <div className="mb-4 text-sm text-gray-500">
            最大 20 MB（{typeHint}）；本站已托管{' '}
            <span className="text-cyan-600">{total}</span> 张图片; 你访问本站的IP是：
            <span className="text-cyan-600">{ip}</span>
          </div>
        </div>
        <ProviderSelect
          value={selectedOption}
          onChange={onSelectChange}
          isAuth={isAuth}
        />
      </div>

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

      <div className="w-full rounded-md shadow-sm overflow-hidden mt-4 grid grid-cols-8">
        <div className="md:col-span-1 col-span-8">
          <label
            htmlFor="file-upload"
            className="w-full h-10 bg-blue-500 cursor-pointer flex items-center justify-center text-white"
          >
            <FontAwesomeIcon
              icon={faImages}
              style={{ width: '20px', height: '20px' }}
              className="mr-2"
            />
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
        </div>
        <div className="md:col-span-5 col-span-8">
          <div className="w-full h-10 bg-slate-200 leading-10 px-4 text-center md:text-left">
            已选择 {selectedFiles.length} 张，共 {totalSizeMB} M
          </div>
        </div>
        <div className="md:col-span-1 col-span-3">
          <button
            type="button"
            className="w-full bg-red-500 cursor-pointer h-10 flex items-center justify-center text-white"
            onClick={onClear}
          >
            <FontAwesomeIcon
              icon={faTrashAlt}
              style={{ width: '20px', height: '20px' }}
              className="mr-2"
            />
            清除
          </button>
        </div>
        <div className="md:col-span-1 col-span-5">
          <button
            type="button"
            className={`w-full bg-green-500 cursor-pointer h-10 flex items-center justify-center text-white ${
              uploading ? 'pointer-events-none opacity-50' : ''
            }`}
            onClick={onUploadAll}
          >
            <FontAwesomeIcon
              icon={faUpload}
              style={{ width: '20px', height: '20px' }}
              className="mr-2"
            />
            上传
          </button>
        </div>
      </div>
    </>
  );
}
