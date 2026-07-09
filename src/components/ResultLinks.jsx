'use client';

import { toast } from 'react-toastify';
import { faCheck, faCopy, faLink } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const formats = [
  { id: 'viewLinks', label: '直链', format: (file) => file.url },
  { id: 'markdownLinks', label: 'Markdown', format: (file) => `![${file.name}](${file.url})` },
  { id: 'htmlLinks', label: 'HTML', format: (file) => `<img src="${file.url}" alt="${file.name}" />` },
  { id: 'bbcodeLinks', label: 'BBCode', format: (file) => `[img]${file.url}[/img]` },
];

function formatFor(id, file) {
  return formats.find((format) => format.id === id)?.format(file) || file.url;
}

function previewType(file) {
  if (file.type.startsWith('image/')) return 'img';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'doc';
}

export default function ResultLinks({ uploadedFiles, activeTab, onTabChange, onPreviewClick }) {
  if (!uploadedFiles.length) return null;

  const copy = async (value, successMessage = '已复制到剪贴板') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('复制失败，请检查浏览器权限');
    }
  };
  const activeFormat = formats.find((format) => format.id === activeTab) || formats[0];

  return (
    <section className="mt-10" aria-labelledby="result-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Ready to share</p><h2 id="result-title" className="mt-1 text-xl font-extrabold text-slate-900">上传完成</h2><p className="mt-1 text-sm text-slate-500">先复制常用格式；其余格式可一次复制全部结果。</p></div>
        <button type="button" onClick={() => copy(uploadedFiles.map((file) => file.url).join('\n'), '已复制全部直链')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"><FontAwesomeIcon icon={faCopy} className="h-4 w-4" />复制全部直链</button>
      </div>

      <div className="mt-4 space-y-3">
        {uploadedFiles.map((file) => (
          <article key={file.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_12px_rgb(15_23_42/0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => onPreviewClick(file.url, previewType(file))} className="min-w-0 text-left"><p className="truncate text-sm font-semibold text-slate-800" title={file.name}>{file.name}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-teal-600" />{file.storage === 'tgchannel' ? '已发送到 Telegram 频道' : '已保存到可删除托管'}</p></button>
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => copy(file.url, '已复制直链')} className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"><FontAwesomeIcon icon={faLink} className="h-3.5 w-3.5 shrink-0 text-teal-600" /><span className="truncate">复制直链</span></button>
                <button type="button" onClick={() => copy(formatFor('markdownLinks', file), '已复制 Markdown')} className="inline-flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"><FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5 shrink-0 text-teal-600" /><span className="truncate">复制 Markdown</span></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="批量复制格式">
        {formats.map((format) => <button key={format.id} type="button" role="tab" aria-selected={activeTab === format.id} onClick={() => onTabChange(format.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === format.id ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>{format.label}</button>)}
      </div>
      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-700">全部 {activeFormat.label}</p><button type="button" onClick={() => copy(uploadedFiles.map((file) => activeFormat.format(file)).join('\n'), `已复制全部 ${activeFormat.label}`)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-teal-700 shadow-sm hover:bg-teal-50"><FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />复制全部</button></div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-700">{uploadedFiles.map((file) => activeFormat.format(file)).join('\n')}</pre>
      </div>
    </section>
  );
}
