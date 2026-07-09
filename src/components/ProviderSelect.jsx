'use client';

/**
 * 主存储：R2 / TG Channel（需登录）。
 * telegraph/58/tencent 等 fallback 默认不暴露。
 */
export default function ProviderSelect({ value, onChange, isAuth }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-sm font-medium text-slate-600">上传接口</span>
      <select
        value={value}
        onChange={onChange}
        disabled={!isAuth}
        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
        aria-label="选择上传接口"
      >
        <option value="r2">R2</option>
        <option value="tgchannel">TG_Channel</option>
      </select>
      {!isAuth && (
        <span className="text-xs text-amber-600 font-medium">需登录后上传</span>
      )}
    </div>
  );
}
