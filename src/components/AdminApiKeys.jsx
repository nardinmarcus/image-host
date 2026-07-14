'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatTimeDisplay } from '@/lib/time';

const INK = 'text-[#37352f]';
const DIVIDER = 'border-[#e9e9e7]';

function CodePanel({ children, label, onCopy, copyLabel = '复制' }) {
  return (
    <div className="overflow-hidden rounded-md bg-[#f7f6f3]">
      {(label || onCopy) && (
        <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#e9e9e7] px-3.5">
          <span className="text-xs font-medium text-[#787774]">{label}</span>
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="min-h-10 shrink-0 rounded-md px-2 text-xs font-medium text-[#787774] hover:bg-[#e9e9e7] hover:text-[#37352f]"
            >
              {copyLabel}
            </button>
          )}
        </div>
      )}
      <pre
        tabIndex="0"
        aria-label={label ? `${label}代码` : '代码示例'}
        className="overflow-x-auto p-3.5 font-mono text-[13px] leading-6 text-[#37352f] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a6a6a4]"
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

function StatusBadge({ enabled }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium ${
        enabled ? 'bg-[#dbeddb] text-[#2f5c3b]' : 'bg-[#e9e9e7] text-[#62615f]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-[#448361]' : 'bg-[#9b9a97]'}`}
      />
      {enabled ? '启用' : '禁用'}
    </span>
  );
}

function KeyActions({ apiKey, onToggle, onRemove }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onToggle(apiKey.id, !apiKey.enabled)}
        className="min-h-10 rounded-md px-2.5 text-sm font-medium text-[#62615f] hover:bg-[#efefed] hover:text-[#37352f]"
      >
        {apiKey.enabled ? '禁用' : '启用'}
      </button>
      <button
        type="button"
        onClick={() => onRemove(apiKey.id)}
        className="min-h-10 rounded-md px-2.5 text-sm font-medium text-[#d44c47] hover:bg-[#fbe4e4]"
      >
        删除
      </button>
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <div
        aria-hidden="true"
        className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f1f1ef] font-mono text-lg font-semibold text-[#62615f]"
      >
        {'</>'}
      </div>
      <h1 className="mt-5 text-[34px] font-bold leading-tight tracking-[-0.035em] text-[#37352f] sm:text-[38px]">
        API 工作台
      </h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-[#787774]">
        管理外部调用凭证，复制上传地址，并完成第一次文件上传。
      </p>
      <nav aria-label="本页目录" className="mt-5 flex flex-wrap gap-x-1 gap-y-1 text-sm text-[#787774]">
        {[
          ['#api-keys', '密钥'],
          ['#quick-start', '快速开始'],
          ['#authentication', '鉴权'],
          ['#upload-contract', '上传参数'],
          ['#response-errors', '响应与错误'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-md px-2 py-1.5 hover:bg-[#efefed] hover:text-[#37352f]">
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}

function EndpointCallout({ uploadUrl, onCopy }) {
  return (
    <section aria-labelledby="endpoint-title" className={`mt-8 border-y ${DIVIDER} py-5`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="endpoint-title" className="text-base font-semibold text-[#37352f]">
          上传地址
        </h2>
        <span className="text-sm text-[#787774]">开放上传 API</span>
      </div>
      <div className="mt-3 rounded-md bg-[#f7f6f3] p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="w-fit rounded border border-[#d8d8d5] bg-white px-2 py-1 font-mono text-xs font-semibold text-[#37352f]">
            POST
          </span>
          <code className="min-w-0 flex-1 break-all font-mono text-sm leading-6 text-[#37352f]">
            {uploadUrl}
          </code>
          <button
            type="button"
            onClick={onCopy}
            className="min-h-11 rounded-md bg-[#37352f] px-4 text-sm font-medium text-white hover:bg-[#2f2e2b]"
          >
            复制上传 URL
          </button>
        </div>
        <p className="mt-2 text-sm text-[#787774]">
          multipart/form-data <span aria-hidden="true">·</span> 最大 20MB{' '}
          <span aria-hidden="true">·</span> 写入 R2
        </p>
      </div>
    </section>
  );
}

function ApiKeyDatabase({
  keys,
  loading,
  loadFailed,
  name,
  newKey,
  creating,
  onNameChange,
  onCreate,
  onCopy,
  onDismissKey,
  onReload,
  onToggle,
  onRemove,
}) {
  return (
    <section id="api-keys" aria-labelledby="api-keys-title" className="scroll-mt-6 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="api-keys-title" className="text-xl font-semibold tracking-[-0.015em] text-[#37352f]">
              API Keys
            </h2>
            {!loading && !loadFailed && (
              <span className="text-sm tabular-nums text-[#9b9a97]">{keys.length}</span>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#787774]">
            为不同调用方分别创建密钥，方便独立停用和追踪使用时间。
          </p>
        </div>
      </div>

      <form onSubmit={onCreate} className="mt-5 rounded-md bg-[#f7f6f3] p-3">
        <label htmlFor="api-key-name" className="text-sm font-medium text-[#37352f]">
          新建密钥
        </label>
        <p id="api-key-name-help" className="mt-0.5 text-sm text-[#787774]">
          用调用方命名，例如 n8n、Make 或备份脚本。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            id="api-key-name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="输入 Key 名称"
            aria-describedby="api-key-name-help"
            className="min-h-11 min-w-0 rounded-md border border-[#d8d8d5] bg-white px-3 text-base text-[#37352f] placeholder:text-[#9b9a97] focus:border-[#9b9a97] focus:outline-none focus:ring-2 focus:ring-[#d8d8d5] sm:text-sm"
            maxLength={64}
          />
          <button
            type="submit"
            disabled={creating}
            className="min-h-11 rounded-md bg-[#37352f] px-4 text-sm font-medium text-white hover:bg-[#2f2e2b] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? '创建中…' : '创建 Key'}
          </button>
        </div>
      </form>

      {newKey && (
        <div role="status" aria-live="polite" className="mt-4 flex gap-3 rounded-md bg-[#fbf3db] p-4">
          <span aria-hidden="true" className="pt-0.5 text-lg">🔑</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#37352f]">立即保存完整密钥</p>
            <p className="mt-1 text-sm leading-6 text-[#787774]">完整密钥只显示一次，关闭后无法再次查看。</p>
            <code className="mt-3 block break-all rounded-md bg-white/70 px-3 py-2.5 font-mono text-xs leading-5 text-[#37352f]">
              {newKey}
            </code>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onCopy(newKey)}
                className="min-h-10 rounded-md bg-[#37352f] px-3.5 text-sm font-medium text-white hover:bg-[#2f2e2b]"
              >
                复制密钥
              </button>
              <button
                type="button"
                onClick={onDismissKey}
                className="min-h-10 rounded-md px-3.5 text-sm font-medium text-[#62615f] hover:bg-black/5"
              >
                我已保存
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`mt-5 border-y ${DIVIDER}`}>
        {loading ? (
          <p aria-live="polite" className="py-8 text-center text-sm text-[#787774]">
            正在加载 API Keys…
          </p>
        ) : loadFailed ? (
          <div role="alert" className="my-3 rounded-md bg-[#fbe4e4] p-4">
            <p className="text-sm font-semibold text-[#8f3330]">API Key 加载失败</p>
            <p className="mt-1 text-sm leading-6 text-[#8f3330]">无法读取现有密钥，请稍后重试。</p>
            <button
              type="button"
              onClick={onReload}
              className="mt-3 min-h-10 rounded-md bg-white/70 px-3 text-sm font-medium text-[#8f3330] hover:bg-white"
            >
              重新加载
            </button>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex items-center gap-3 py-6 text-sm text-[#787774]">
            <span aria-hidden="true" className="text-lg text-[#9b9a97]">＋</span>
            <span>还没有 API Key，使用上方表单创建第一枚密钥。</span>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[#e9e9e7] lg:hidden" aria-label="API Key 列表">
              {keys.map((apiKey) => (
                <li key={apiKey.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-[#37352f]">{apiKey.name}</p>
                      <code className="mt-1 block font-mono text-xs text-[#787774]">{apiKey.key_prefix}…</code>
                    </div>
                    <StatusBadge enabled={apiKey.enabled} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-[#9b9a97]">创建时间</dt>
                      <dd className="mt-1 leading-5 text-[#62615f]">{formatTimeDisplay(apiKey.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#9b9a97]">最近使用</dt>
                      <dd className="mt-1 leading-5 text-[#62615f]">
                        {apiKey.last_used_at ? formatTimeDisplay(apiKey.last_used_at) : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <KeyActions apiKey={apiKey} onToggle={onToggle} onRemove={onRemove} />
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">已有 API Key 及其状态和最近使用时间</caption>
                <thead className="bg-[#f7f6f3] text-xs text-[#787774]">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-medium">名称</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">前缀</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">状态</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">创建</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">最近使用</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e9e9e7]">
                  {keys.map((apiKey) => (
                    <tr key={apiKey.id} className="text-[#62615f] hover:bg-[#f7f6f3]/70">
                      <td className="px-3 py-2.5 font-medium text-[#37352f]">{apiKey.name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">{apiKey.key_prefix}…</td>
                      <td className="px-3 py-2.5"><StatusBadge enabled={apiKey.enabled} /></td>
                      <td className="px-3 py-2.5 text-xs">{formatTimeDisplay(apiKey.created_at)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {apiKey.last_used_at ? formatTimeDisplay(apiKey.last_used_at) : '—'}
                      </td>
                      <td className="px-3 py-1.5">
                        <KeyActions apiKey={apiKey} onToggle={onToggle} onRemove={onRemove} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function QuickStart() {
  const steps = [
    ['创建并保存 Key', '为调用方命名。完整密钥只出现一次，创建后立即保存。'],
    ['添加鉴权请求头', '使用 Authorization: Bearer ih_…，也可以使用 X-API-Key。'],
    ['发送 multipart 请求', '向上传地址发送 POST，并把文件放在 file 字段。'],
  ];

  return (
    <section id="quick-start" aria-labelledby="quick-start-title" className={`mt-12 scroll-mt-6 border-t ${DIVIDER} pt-10`}>
      <h2 id="quick-start-title" className="text-xl font-semibold tracking-[-0.015em] text-[#37352f]">
        快速开始
      </h2>
      <p className="mt-1 text-sm leading-6 text-[#787774]">第一次调用只需要完成下面三步。</p>
      <ol className="mt-6 grid gap-7 md:grid-cols-3">
        {steps.map(([title, body], index) => (
          <li key={title} className="border-l-2 border-[#d8d8d5] pl-4">
            <span className="text-xs font-medium text-[#9b9a97]">步骤 {index + 1}</span>
            <h3 className="mt-2 text-sm font-semibold text-[#37352f]">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#787774]">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ApiDocumentation({ baseUrl, uploadUrl, curlExample, responseExample, onCopy }) {
  return (
    <article aria-labelledby="documentation-title" className={`mt-12 border-t ${DIVIDER} pt-10`}>
      <header>
        <h2 id="documentation-title" className="text-2xl font-semibold tracking-[-0.02em] text-[#37352f]">
          API 文档
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#787774]">
          Base URL 是站点根地址。发送文件时，请始终使用完整上传地址。
        </p>
      </header>

      <section id="authentication" aria-labelledby="authentication-title" className="scroll-mt-6 pt-8">
        <h3 id="authentication-title" className="text-lg font-semibold text-[#37352f]">鉴权</h3>
        <p className="mt-1 text-sm leading-6 text-[#787774]">任选一种请求头，不要同时发送两个 Key。</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CodePanel label="Base URL" onCopy={() => onCopy(baseUrl)} copyLabel="复制 Base URL">
            {baseUrl}
          </CodePanel>
          <CodePanel label="请求头">
{`Authorization: Bearer ih_xxxxxxxx
# 或
X-API-Key: ih_xxxxxxxx`}
          </CodePanel>
        </div>
      </section>

      <section id="upload-contract" aria-labelledby="upload-contract-title" className={`mt-9 scroll-mt-6 border-t ${DIVIDER} pt-8`}>
        <h3 id="upload-contract-title" className="text-lg font-semibold text-[#37352f]">上传参数</h3>
        <dl className={`mt-4 divide-y divide-[#e9e9e7] border-y ${DIVIDER} text-sm`}>
          {[
            ['上传地址', uploadUrl],
            ['Method', 'POST'],
            ['Body', 'multipart/form-data'],
            ['文件字段', 'file，兼容 image / media'],
            ['大小上限', '20MB'],
            ['支持类型', '图片、视频、音频、PDF、EPUB、Word、Excel、PPT'],
            ['存储位置', 'R2；成功后出现在后台「资源」列表'],
          ].map(([term, value]) => (
            <div key={term} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
              <dt className="font-medium text-[#787774]">{term}</dt>
              <dd className={`min-w-0 break-words ${term === '上传地址' ? 'font-mono text-xs leading-5' : ''} ${INK}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="curl-title" className={`mt-9 border-t ${DIVIDER} pt-8`}>
        <h3 id="curl-title" className="text-lg font-semibold text-[#37352f]">curl 示例</h3>
        <p className="mt-1 text-sm leading-6 text-[#787774]">把示例 Key 和文件路径替换为你的真实值。</p>
        <div className="mt-4">
          <CodePanel label="Shell" onCopy={() => onCopy(curlExample)} copyLabel="复制 curl">
            {curlExample}
          </CodePanel>
        </div>
      </section>

      <section id="response-errors" aria-labelledby="response-errors-title" className={`mt-9 scroll-mt-6 border-t ${DIVIDER} pt-8`}>
        <h3 id="response-errors-title" className="text-lg font-semibold text-[#37352f]">响应与错误</h3>
        <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#37352f]">成功响应</h4>
            <p className="mt-1 text-sm leading-6 text-[#787774]">使用返回的 url 直接访问已上传文件。</p>
            <div className="mt-3"><CodePanel label="JSON">{responseExample}</CodePanel></div>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#37352f]">错误码</h4>
            <ul className={`mt-3 divide-y divide-[#e9e9e7] border-y ${DIVIDER} text-sm`}>
              {[
                ['400', '无文件或类型不允许'],
                ['401', 'Key 缺失、无效或已禁用'],
                ['413', '文件超过 20MB'],
                ['500', '服务端错误，例如未绑定 R2'],
              ].map(([code, description]) => (
                <li key={code} className="grid grid-cols-[44px_1fr] gap-3 py-3">
                  <code className="font-medium text-[#37352f]">{code}</code>
                  <span className="text-[#62615f]">{description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="integrations-title" className="mt-9 rounded-md bg-[#f7f6f3] p-4">
        <h3 id="integrations-title" className="text-sm font-semibold text-[#37352f]">n8n / Make / 脚本</h3>
        <p className="mt-2 text-sm leading-6 text-[#62615f]">
          HTTP 节点选择 <strong>POST</strong>，URL 填完整上传地址，Header 加{' '}
          <code>Authorization: Bearer …</code>，Body 选择 multipart，并把文件放在 <code>file</code> 字段。
        </p>
      </section>
    </article>
  );
}

export default function AdminApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [creating, setCreating] = useState(false);
  const [baseUrl, setBaseUrl] = useState('https://image.namooca.com');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch('/api/admin/apikeys');
      const data = await res.json();
      if (data?.success) setKeys(data.data || []);
      else {
        setKeys([]);
        setLoadFailed(true);
        toast.error(data?.message || '加载失败');
      }
    } catch (error) {
      setKeys([]);
      setLoadFailed(true);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    load();
  }, [load]);

  const createKey = async (event) => {
    event.preventDefault();
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
    } catch (error) {
      toast.error(error.message);
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
    } catch (error) {
      toast.error(error.message);
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
    } catch (error) {
      toast.error(error.message);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('已复制');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  const uploadUrl = `${baseUrl}/api/v1/upload`;
  const curlExample = [
    `curl -X POST "${uploadUrl}" \\`,
    '  -H "Authorization: Bearer YOUR_API_KEY" \\',
    '  -F "file=@/path/to/photo.jpg"',
  ].join('\n');
  const responseExample = `{
  "success": true,
  "code": 200,
  "url": "${baseUrl}/api/rfile/xxxxxxxx-xxxx.png",
  "name": "photo.jpg",
  "mime": "image/jpeg",
  "key": "xxxxxxxx-xxxx.png"
}`;

  return (
    <div className="-m-4 min-h-[calc(100%+2rem)] bg-white px-4 py-8 sm:px-8 lg:py-12">
      <div className="mx-auto w-full max-w-5xl pb-8 text-[#37352f]">
        <PageHeader />
        <EndpointCallout uploadUrl={uploadUrl} onCopy={() => copy(uploadUrl)} />
        <ApiKeyDatabase
          keys={keys}
          loading={loading}
          loadFailed={loadFailed}
          name={name}
          newKey={newKey}
          creating={creating}
          onNameChange={setName}
          onCreate={createKey}
          onCopy={copy}
          onDismissKey={() => setNewKey(null)}
          onReload={load}
          onToggle={toggle}
          onRemove={remove}
        />
        <QuickStart />
        <ApiDocumentation
          baseUrl={baseUrl}
          uploadUrl={uploadUrl}
          curlExample={curlExample}
          responseExample={responseExample}
          onCopy={copy}
        />
      </div>
    </div>
  );
}
