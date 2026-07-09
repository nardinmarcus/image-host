'use client';

import { useRef } from 'react';
import { toast } from 'react-toastify';

const TABS = [
  { id: 'preview', label: '预览' },
  { id: 'htmlLinks', label: 'HTML' },
  { id: 'markdownLinks', label: 'Markdown' },
  { id: 'bbcodeLinks', label: 'BBCode' },
  { id: 'viewLinks', label: '链接' },
];

const LINK_TEMPLATES = {
  htmlLinks: (d) => `<img src="${d.url}" alt="${d.name}" />`,
  markdownLinks: (d) => `![${d.name}](${d.url})`,
  bbcodeLinks: (d) => `[img]${d.url}[/img]`,
  viewLinks: (d) => `${d.url}`,
};

/**
 * 上传结果：预览 / HTML / Markdown / BBCode / 直链。
 */
export default function ResultLinks({
  uploadedImages,
  activeTab,
  onTabChange,
  onPreviewClick,
}) {
  const parentRef = useRef(null);

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('链接复制成功');
    } catch {
      toast.error('链接复制失败');
    }
  };

  const handleCopyCode = async () => {
    const codeElements = parentRef.current?.querySelectorAll('code');
    if (!codeElements?.length) return;
    const values = Array.from(codeElements).map((code) => code.textContent);
    try {
      await navigator.clipboard.writeText(values.join('\n'));
      toast.success('链接复制成功');
    } catch (error) {
      toast.error(`链接复制失败\n${error}`);
    }
  };

  const renderFile = (data, index) => {
    const fileUrl = data.url;
    if (data.type.startsWith('image/')) {
      return (
        <img
          key={`image-${index}`}
          src={data.url}
          alt={`Uploaded ${index}`}
          className="object-cover w-36 h-40 m-2"
          onClick={() => onPreviewClick(fileUrl, 'img')}
        />
      );
    }
    if (data.type.startsWith('video/')) {
      return (
        <video
          key={`video-${index}`}
          src={data.url}
          className="object-cover w-36 h-40 m-2"
          controls
          onClick={() => onPreviewClick(fileUrl, 'video')}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
    if (data.type.startsWith('audio/')) {
      return (
        <div
          key={`audio-${index}`}
          className="w-36 h-40 m-2 flex flex-col items-center justify-center bg-slate-100 rounded"
        >
          <span className="text-xs text-gray-500 mb-1 truncate w-full px-1 text-center">
            {data.name}
          </span>
          <audio src={data.url} controls className="w-32" />
        </div>
      );
    }
    if (data.type === 'application/pdf') {
      return (
        <a
          key={`pdf-${index}`}
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-36 h-40 m-2 flex items-center justify-center bg-slate-100 rounded text-sm text-blue-600 underline"
        >
          PDF 打开
        </a>
      );
    }
    return (
      <img
        key={`image-${index}`}
        src={data.url}
        alt={`Uploaded ${index}`}
        className="object-cover w-36 h-40 m-2"
        onClick={() => onPreviewClick(fileUrl, 'other')}
      />
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'preview') {
      return (
        <div className="flex flex-col">
          {uploadedImages.map((data, index) => (
            <div
              key={index}
              className="m-2 rounded-2xl ring-offset-2 ring-2 ring-slate-100 flex flex-row"
            >
              {renderFile(data, index)}
              <div className="flex flex-col justify-center w-4/5">
                {[
                  { text: data.url },
                  { text: `![${data.name}](${data.url})` },
                  {
                    text: `<a href="${data.url}" target="_blank"><img src="${data.url}"></a>`,
                  },
                  { text: `[img]${data.url}[/img]` },
                ].map((item, i) => (
                  <input
                    key={`input-${i}`}
                    readOnly
                    value={item.text}
                    onClick={() => handleCopy(item.text)}
                    className="px-3 my-1 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 focus:outline-none placeholder-gray-400"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    const tpl = LINK_TEMPLATES[activeTab];
    if (!tpl) return null;

    return (
      <div
        ref={parentRef}
        className="p-4 bg-slate-100"
        onClick={handleCopyCode}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCopyCode();
          }
        }}
        aria-label="点击复制全部链接"
      >
        {uploadedImages.map((data, index) => (
          <div key={index} className="mb-2">
            <code className="w-2 break-all">{tpl(data)}</code>
          </div>
        ))}
      </div>
    );
  };

  if (uploadedImages.length === 0) return null;

  return (
    <div className="w-full mt-4 min-h-[200px] mb-[60px]">
      <div className="flex flex-wrap gap-3 mb-4 border-b border-gray-300">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 ${
              activeTab === tab.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderTabContent()}
    </div>
  );
}
