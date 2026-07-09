'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowTrendUp,
  faChartLine,
  faDatabase,
  faEye,
  faFileLines,
  faHardDrive,
  faTriangleExclamation,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { getKindLabel, getStorageLabel } from '@/lib/mediaMeta';
import { formatTimeDisplay } from '@/lib/time';
import { formatBytes, formatDelta, formatNumber } from './adminFormat';

function MetricCard({ icon, label, value, hint, tone = 'stone', onClick }) {
  const body = (
    <>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tone === 'teal' ? 'bg-teal-50 text-teal-700' : tone === 'sky' ? 'bg-sky-50 text-sky-700' : 'bg-stone-100 text-stone-600'}`}>
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 text-left">
        <span className="block text-xs font-medium text-stone-500">{label}</span>
        <span className="mt-1 block truncate text-xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</span>
        <span className="mt-1 block truncate text-xs text-stone-500">{hint}</span>
      </span>
    </>
  );
  const className = 'flex min-h-28 items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow';
  if (onClick) {
    return <button type="button" onClick={onClick} className={`${className} w-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`}>{body}</button>;
  }
  return <div className={className}>{body}</div>;
}

function SectionCard({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return <div className="flex min-h-36 items-center justify-center rounded-lg bg-stone-50 px-4 text-center text-sm text-stone-500">{children}</div>;
}

function Trend({ items, range }) {
  const max = Math.max(...items.map((item) => Number(item.pv || 0)), 1);
  const labelEvery = range === '30d' ? 5 : 1;
  const total = items.reduce((sum, item) => sum + Number(item.pv || 0), 0);
  if (!total) return <EmptyState>该时间范围内暂无受管访问记录。</EmptyState>;

  return (
    <div>
      <div className="flex h-44 items-end gap-1" role="img" aria-label={`最近 ${range === '7d' ? '7' : '30'} 天共 ${total} 次访问的趋势图`}>
        {items.map((item, index) => {
          const height = Math.max((Number(item.pv || 0) / max) * 100, item.pv ? 5 : 0);
          return (
            <div key={item.day} className="group flex h-full min-w-0 flex-1 items-end" title={`${item.day}：${item.pv} PV`}>
              <div className="w-full rounded-t bg-teal-500/85 transition-colors group-hover:bg-teal-600" style={{ height: `${height}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-stone-400" aria-hidden="true">
        {items.map((item, index) => (
          <span key={item.day} className={index % labelEvery === 0 || index === items.length - 1 ? '' : 'invisible'}>
            {item.day.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

function Distribution({ items, label }) {
  const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);
  if (!items.length) return <EmptyState>暂无{label}数据。</EmptyState>;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="font-medium text-stone-700">{label === '文件类型' ? getKindLabel(item.name) : getStorageLabel(item.name)}</span>
            <span className="tabular-nums text-stone-500">{formatNumber(item.count)} 个{Number(item.bytes || 0) ? ` · ${formatBytes(item.bytes)}` : ''}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: `${(Number(item.count || 0) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminInsights({
  data,
  error,
  loading,
  range,
  onRangeChange,
  onBrowse,
  onOpenResource,
  onBackfill,
  backfilling,
}) {
  const metrics = data?.metrics;
  const metadata = data?.metadata;
  const attention = data?.attention;
  const coverage = metrics?.totalFiles ? Math.round((metrics.sizeCoveredFiles / metrics.totalFiles) * 100) : 0;
  const attentionItems = [
    { key: 'missing', label: '待补全文件大小', count: attention?.missingSize || 0, action: () => onBrowse({ metadata: 'missing_size', sort: 'size' }) },
    { key: 'unclassified', label: '类型待归类', count: attention?.unclassified || 0, action: () => onBrowse({ metadata: 'unclassified' }) },
    { key: 'failed', label: '采集失败待重试', count: attention?.metadataFailed || 0, action: () => onBrowse({ metadata: 'failed' }) },
    { key: 'inactive', label: '近期未访问', count: attention?.inactive || 0, action: () => onBrowse({ sort: 'inactive' }) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Asset intelligence</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">文件资产概览</h1>
          <p className="mt-1 text-sm text-stone-500">先看规模与变化，再决定要管理哪一批资源。</p>
        </div>
        <div className="inline-flex rounded-lg border border-stone-200 bg-white p-1 shadow-sm" aria-label="访问统计时间范围">
          {['7d', '30d'].map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={range === option}
              onClick={() => onRangeChange(option)}
              className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${range === option ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              近 {option === '7d' ? '7' : '30'} 天
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="status">
          概览暂时无法加载。请稍后重试；资源管理和访问日志仍可正常使用。
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-live="polite">
        <MetricCard icon={faFileLines} label="受管文件" value={metrics ? formatNumber(metrics.totalFiles) : '—'} hint="按唯一资源 URL 统计" onClick={() => onBrowse({ sort: 'newest' })} />
        <MetricCard icon={faHardDrive} label="已采集容量" value={metrics ? formatBytes(metrics.sizeBytes) : '—'} hint={metrics ? `覆盖 ${metrics.sizeCoveredFiles} / ${metrics.totalFiles} 个文件` : '正在读取'} tone="sky" onClick={() => onBrowse({ metadata: 'missing_size', sort: 'size' })} />
        <MetricCard icon={faEye} label={`PV · ${range === '7d' ? '7' : '30'} 天`} value={metrics ? formatNumber(metrics.pv) : '—'} hint={metrics ? formatDelta(metrics.pvDelta) : '正在读取'} tone="teal" onClick={() => onBrowse({ sort: 'views' })} />
        <MetricCard icon={faUsers} label="独立访问 IP" value={metrics ? formatNumber(metrics.uniqueIps) : '—'} hint="仅作为访问广度，不等同用户数" onClick={() => onBrowse({ sort: 'accessed' })} />
        <MetricCard icon={faArrowTrendUp} label="活跃文件" value={metrics ? formatNumber(metrics.activeFiles) : '—'} hint="该范围内至少被访问一次" tone="teal" onClick={() => onBrowse({ sort: 'accessed' })} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)]">
        <SectionCard title="访问趋势" action={<span className="text-xs text-stone-500">按上海时区聚合</span>}>
          {data ? <Trend items={data.trend || []} range={range} /> : <EmptyState>正在读取访问趋势…</EmptyState>}
        </SectionCard>

        <SectionCard
          title="数据覆盖"
          action={<FontAwesomeIcon icon={faDatabase} className="h-4 w-4 text-stone-400" aria-hidden="true" />}
        >
          {metadata ? (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="font-medium text-stone-800">大小信息已采集</span>
                  <span className="tabular-nums text-stone-600">{coverage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${coverage}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-500">已覆盖 {metadata.sizeCoveredFiles} / {metadata.totalFiles} 个文件；未知大小不会计为 0 B。</p>
              </div>
              {metadata.missingSize ? (
                <button type="button" onClick={onBackfill} disabled={backfilling} className="min-h-10 w-full rounded-lg border border-teal-200 bg-teal-50 px-3 text-sm font-medium text-teal-800 transition hover:bg-teal-100 disabled:cursor-wait disabled:opacity-60">
                  {backfilling ? '正在补全一批 R2 文件…' : '补全一批 R2 文件元数据'}
                </button>
              ) : <p className="text-sm text-emerald-700">目前没有等待补全大小的资源。</p>}
            </div>
          ) : <EmptyState>正在读取数据覆盖情况…</EmptyState>}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <SectionCard title="文件类型构成">
          {data ? <Distribution items={data.kinds || []} label="文件类型" /> : <EmptyState>正在读取类型分布…</EmptyState>}
        </SectionCard>
        <SectionCard title="存储位置构成">
          {data ? <Distribution items={data.storage || []} label="存储位置" /> : <EmptyState>正在读取存储分布…</EmptyState>}
        </SectionCard>
        <SectionCard title="需要关注" action={<FontAwesomeIcon icon={faTriangleExclamation} className="h-4 w-4 text-amber-600" aria-hidden="true" />}>
          {data ? (
            <div className="divide-y divide-stone-100">
              {attentionItems.map((item) => (
                <button key={item.key} type="button" onClick={item.action} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm hover:text-teal-700">
                  <span className="text-stone-600">{item.label}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-700">{formatNumber(item.count)}</span>
                </button>
              ))}
            </div>
          ) : <EmptyState>正在检查待关注资源…</EmptyState>}
        </SectionCard>
      </div>

      <SectionCard title="热门资源" action={<button type="button" onClick={() => onBrowse({ sort: 'views' })} className="text-xs font-medium text-teal-700 hover:text-teal-900">查看全部</button>}>
        {data?.hot?.length ? (
          <div className="divide-y divide-stone-100">
            {data.hot.map((item, index) => (
              <button key={item.url} type="button" onClick={() => onOpenResource(item.url)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left transition hover:bg-stone-50">
                <span className="w-6 text-center text-xs font-semibold tabular-nums text-stone-400">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-800">{item.url}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">最近访问：{formatTimeDisplay(item.last_accessed_at) || '—'}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-stone-900">{formatNumber(item.pv)} PV</span>
                  <span className="text-xs text-stone-500">点击查看详情</span>
                </span>
              </button>
            ))}
          </div>
        ) : <EmptyState>该时间范围内暂无热门资源。</EmptyState>}
      </SectionCard>
    </div>
  );
}
