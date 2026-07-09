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
          alt={`已上传 ${index}`}
          className="object-cover w-28 h-28 rounded-xl cursor-pointer"
          onClick={() => onPreviewClick(fileUrl, 'img')}
        />
      );
    }
    if (data.type.startsWith('video/')) {
      return (
        <video
          key={`video-${index}`}
          src={data.url}
          className="object-cover w-28 h-28 rounded-xl cursor-pointer"
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
          className="w-28 h-28 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-2 gap-1"
        >
          <span className="text-xs text-slate-500 truncate w-full px-1 text-center">
            {data.name}
          </span>
          <audio src={data.url} controls className="w-full" />
        </div>
      );
    }
    {
      const name = data.name || '';
      const t = data.type || '';
      let label = null;
      if (t === 'application/pdf' || /\.pdf$/i.test(name)) label = 'PDF 打开';
      else if (t === 'application/epub+zip' || t === 'application/epub' || /\.epub$/i.test(name)) label = 'EPUB 下载';
      else if (/\.docx?$/i.test(name) || t.includes('word') || t === 'application/msword') label = 'Word 下载';
      else if (/\.xlsx?$/i.test(name) || t.includes('sheet') || t.includes('excel')) label = 'Excel 下载';
      else if (/\.pptx?$/i.test(name) || t.includes('presentation') || t.includes('powerpoint')) label = 'PPT 下载';
      if (label) {
        return (
          <a
            key={`doc-${index}`}
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="w-28 h-28 flex items-center justify-center bg-amber-50 rounded-xl text-sm text-amber-700 font-semibold text-center px-2"
          >
            {label}
          </a>
        );
      }
    }
    return (
      <img
        key={`image-${index}`}
        src={data.url}
        alt={`已上传 ${index}`}
        className="object-cover w-28 h-28 rounded-xl cursor-pointer"
        onClick={() => onPreviewClick(fileUrl, 'other')}
      />
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'preview') {
      return (
        <div className="flex flex-col gap-3">
          {uploadedImages.map((data, index) => (
            <div
              key={index}
              className="flex flex-row items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgb(15_23_42/0.04)]"
            >
              {renderFile(data, index)}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {[
                  { text: data.url, label: 'URL' },
                  { text: `![${data.name}](${data.url})`, label: 'Markdown' },
                  {
                    text: `<a href="${data.url}" target="_blank"><img src="${data.url}"></a>`,
                    label: 'HTML',
                  },
                  { text: `[img]${data.url}[/img]`, label: 'BBCode' },
                ].map((item, i) => (
                  <input
                    key={`input-${i}`}
                    readOnly
                    value={item.text}
                    onClick={() => handleCopy(item.text)}
                    className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-700 focus:outline-none focus:border-teal-400 focus:bg-white cursor-pointer hover:border-slate-300 truncate"
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
        className="p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer"
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
          <div key={index} className="mb-2 last:mb-0">
            <code className="block text-xs text-slate-700 break-all font-mono leading-relaxed">{tpl(data)}</code>
          </div>
        ))}
      </div>
    );
  };

  if (uploadedImages.length === 0) return null;

  return (
    <div className="w-full mt-8">
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
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
