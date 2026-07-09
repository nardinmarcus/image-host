'use client';

const options = [
  {
    id: 'r2',
    title: '可删除托管',
    description: '保存在 Namoo Pix 的 R2 存储。可从后台删除，适合需要长期管理的文件。',
  },
  {
    id: 'tgchannel',
    title: '发送到 Telegram 频道',
    description: '文件会发至频道；后台删除只能让本站链接失效，不能删除频道原文件。',
  },
];

export default function ProviderSelect({ value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-800">文件保存到哪里？</legend>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">请选择与你的删除和留存需求一致的方式。</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
              className={`min-h-28 text-left rounded-2xl border p-4 transition ${selected ? 'border-teal-500 bg-teal-50 shadow-[0_2px_12px_rgb(13_148_136/0.10)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <span className={`block text-sm font-bold ${selected ? 'text-teal-800' : 'text-slate-800'}`}>{option.title}</span>
              <span className="mt-1.5 block text-xs leading-5 text-slate-600">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
