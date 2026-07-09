'use client';

/**
 * 主存储：R2 / TG Channel（需登录）。
 * telegraph/58/tencent 等 fallback 默认不暴露。
 */
export default function ProviderSelect({ value, onChange, isAuth }) {
  return (
    <div className="flex flex-col sm:flex-col md:w-auto lg:flex-row xl:flex-row 2xl:flex-row mx-auto items-center">
      <span className="text-lg sm:text-sm md:text-sm lg:text-xl xl:text-xl 2xl:text-xl">
        上传接口：
      </span>
      <select
        value={value}
        onChange={onChange}
        disabled={!isAuth}
        className="text-lg p-2 border rounded text-center w-auto sm:w-auto md:w-auto lg:w-auto xl:w-auto 2xl:w-36 disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="选择上传接口"
      >
        <option value="r2">R2</option>
        <option value="tgchannel">TG_Channel</option>
      </select>
      {!isAuth && (
        <span className="ml-2 text-xs text-amber-600">需登录后上传</span>
      )}
    </div>
  );
}
