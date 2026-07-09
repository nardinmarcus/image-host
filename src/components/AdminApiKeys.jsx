'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { formatTimeDisplay } from '@/lib/time';

/**
 * 后台 · API Key 管理 + 内嵌文档
 */
export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState(null); // 刚创建的明文
  const [creating, setCreating] = useState(false);

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://image.namooca.com';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/apikeys');
      const data = await res.json();
      if (data?.success) setKeys(data.data || []);
      else toast.error(data?.message || '加载失败');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/admin/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || 'default' }),
      });
      const data = await res.json();
      if (!data?.success) {
        toast.error(data?.message || '创建失败');
        return;
      }
      setNewKey(data.data?.api_key || null);
      setName('');
      toast.success('已创建，请立即复制保存密钥');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id, enabled) => {
    try {
      const res = await fetch('/api/admin/apikeys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(enabled ? '已启用' : '已禁用');
        load();
      } else toast.error(data?.message || '操作失败');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('确定删除该 API Key？使用此 Key 的客户端将立即失效。')) return;
    try {
      const res = await fetch('/api/admin/apikeys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success('已删除');
        load();
      } else toast.error(data?.message || '删除失败');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('已复制'));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <section className="bg-white border border-stone-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-stone-900 mb-1">API Keys</h2>
        <p className="text-sm text-stone-500 mb-4">
          用 Base URL + API Key 在外部服务上传文件。密钥仅在创建时显示一次，请妥善保存。
        </p>

        <form onSubmit={createKey} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名称（如 n8n / 脚本）"
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
            maxLength={64}
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {creating ? '创建中…' : '创建 Key'}
          </button>
        </form>

        {newKey && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <p className="font-medium text-amber-900 mb-2">请立即复制完整密钥（只显示一次）：</p>
            <code className="block break-all bg-white border border-amber-100 rounded px-2 py-2 text-xs text-stone-800 mb-2">
              {newKey}
            </code>
            <button
              type="button"
              onClick={() => copy(newKey)}
              className="text-sm px-3 py-1.5 rounded-lg bg-amber-900 text-white"
            >
              复制密钥
            </button>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="text-sm px-3 py-1.5 ml-2 text-stone-600"
            >
              我已保存
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">加载中…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">暂无 API Key，先创建一个</p>
        ) : (
          <div className="border border-stone-200 rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-left">
                  <th className="py-2 px-3 font-medium">名称</th>
                  <th className="py-2 px-3 font-medium">前缀</th>
                  <th className="py-2 px-3 font-medium">状态</th>
                  <th className="py-2 px-3 font-medium">创建</th>
                  <th className="py-2 px-3 font-medium">最近使用</th>
                  <th className="py-2 px-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-stone-100">
                    <td className="py-2 px-3">{k.name}</td>
                    <td className="py-2 px-3 font-mono text-xs text-stone-600">
                      {k.key_prefix}…
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          k.enabled
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {k.enabled ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-500">
                      {formatTimeDisplay(k.created_at)}
                    </td>
                    <td className="py-2 px-3 text-xs text-stone-500">
                      {k.last_used_at ? formatTimeDisplay(k.last_used_at) : '—'}
                    </td>
                    <td className="py-2 px-3 space-x-2">
                      <button
                        type="button"
                        className="text-xs text-sky-700 hover:underline"
                        onClick={() => toggle(k.id, !k.enabled)}
                      >
                        {k.enabled ? '禁用' : '启用'}
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => remove(k.id)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* API 文档 */}
      <section className="bg-white border border-stone-200 rounded-xl p-5 prose prose-sm prose-stone max-w-none">
        <h2 className="text-base font-semibold text-stone-900 !mt-0">API 文档</h2>

        <h3 className="text-sm font-semibold">Base URL</h3>
        <pre className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs overflow-x-auto">
          {baseUrl}
        </pre>
        <button
          type="button"
          className="text-xs text-sky-700 mb-4"
          onClick={() => copy(baseUrl)}
        >
          复制 Base URL
        </button>

        <h3 className="text-sm font-semibold">鉴权</h3>
        <p className="text-stone-600">任选一种请求头：</p>
        <pre className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs overflow-x-auto">
{`Authorization: Bearer ih_xxxxxxxx
# 或
X-API-Key: ih_xxxxxxxx`}
        </pre>

        <h3 className="text-sm font-semibold">上传文件</h3>
        <p className="text-stone-600">
          <code>POST /api/v1/upload</code> · multipart/form-data · 字段名 <code>file</code>
          （也接受 <code>image</code> / <code>media</code>）
        </p>
        <p className="text-stone-600">
          大小上限 20MB。类型：图片 / 视频 / 音频 / PDF / EPUB / Word / Excel / PPT。
          文件写入 <strong>R2</strong>，并出现在后台「资源」列表。
        </p>

        <h4 className="text-sm font-semibold">curl 示例</h4>
        <pre className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{`curl -X POST "${baseUrl}/api/v1/upload" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@/path/to/photo.jpg"`}
        </pre>
        <button
          type="button"
          className="text-xs text-sky-700 mb-2"
          onClick={() =>
            copy(
              `curl -X POST "${baseUrl}/api/v1/upload" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -F "file=@/path/to/photo.jpg"`
            )
          }
        >
          复制 curl
        </button>

        <h4 className="text-sm font-semibold">成功响应示例</h4>
        <pre className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs overflow-x-auto">
{`{
  "success": true,
  "code": 200,
  "url": "${baseUrl}/api/rfile/xxxxxxxx-xxxx.png",
  "name": "photo.jpg",
  "mime": "image/jpeg",
  "key": "xxxxxxxx-xxxx.png"
}`}
        </pre>

        <h4 className="text-sm font-semibold">错误码</h4>
        <ul className="text-stone-600 text-sm list-disc pl-5">
          <li><code>401</code> — 缺少/无效/已禁用的 API Key</li>
          <li><code>400</code> — 无文件或类型不允许</li>
          <li><code>413</code> — 超过 20MB</li>
          <li><code>500</code> — 服务端错误（如未绑定 R2）</li>
        </ul>

        <h4 className="text-sm font-semibold">n8n / Make / 脚本</h4>
        <p className="text-stone-600">
          HTTP 节点：Method POST，URL 填 Base URL + <code>/api/v1/upload</code>，
          Header 加 <code>Authorization: Bearer …</code>，Body 选 multipart，字段 <code>file</code>。
        </p>
      </section>
    </div>
  );
}
