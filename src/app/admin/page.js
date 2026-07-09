'use client';

import { signOut } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ToastContainer, toast } from 'react-toastify';
import AdminTable from '@/components/AdminTable';
import AdminApiKeys from '@/components/AdminApiKeys';
import AdminInsights from '@/components/admin/AdminInsights';
import AdminResourceDrawer from '@/components/admin/AdminResourceDrawer';

const NAV = [
  { id: 'stats', label: '概览' },
  { id: 'list', label: '资源' },
  { id: 'log', label: '访问日志' },
  { id: 'apikeys', label: 'API' },
];

const STORAGE_CHIPS = [
  { id: '', label: '全部来源' },
  { id: 'r2', label: 'R2' },
  { id: 'tg', label: 'TG' },
  { id: 'file', label: 'TG旧' },
];

const KIND_CHIPS = [
  { id: '', label: '全部类型' },
  { id: 'image', label: '图片' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
  { id: 'doc', label: '文档' },
];

const BLOCK_CHIPS = [
  { id: '', label: '全部状态' },
  { id: 'no', label: '正常' },
  { id: 'yes', label: '拉黑' },
];

const METADATA_CHIPS = [
  { id: '', label: '全部数据状态' },
  { id: 'missing_size', label: '待补全大小' },
  { id: 'unclassified', label: '类型待归类' },
  { id: 'failed', label: '采集失败' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: '最近上传' },
  { id: 'views', label: '最多访问' },
  { id: 'accessed', label: '最近访问' },
  { id: 'size', label: '最大文件' },
  { id: 'inactive', label: '最久未访问' },
];

function readInitialState() {
  const defaults = {
    view: 'stats',
    layout: 'table',
    query: '',
    storage: '',
    kind: '',
    blocked: '',
    metadata: '',
    sort: 'newest',
    page: 1,
    range: '30d',
    resource: '',
  };
  if (typeof window === 'undefined') return defaults;
  const params = new URLSearchParams(window.location.search);
  const allowedView = NAV.some((item) => item.id === params.get('view')) ? params.get('view') : defaults.view;
  const allowedLayout = ['table', 'grid'].includes(params.get('layout')) ? params.get('layout') : defaults.layout;
  const allowedRange = ['7d', '30d'].includes(params.get('range')) ? params.get('range') : defaults.range;
  const allowedSort = SORT_OPTIONS.some((item) => item.id === params.get('sort')) ? params.get('sort') : defaults.sort;
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  return {
    ...defaults,
    view: allowedView,
    layout: allowedLayout,
    query: params.get('q') || '',
    storage: STORAGE_CHIPS.some((item) => item.id === params.get('storage')) ? params.get('storage') || '' : '',
    kind: KIND_CHIPS.some((item) => item.id === params.get('kind')) ? params.get('kind') || '' : '',
    blocked: BLOCK_CHIPS.some((item) => item.id === params.get('blocked')) ? params.get('blocked') || '' : '',
    metadata: METADATA_CHIPS.some((item) => item.id === params.get('metadata')) ? params.get('metadata') || '' : '',
    sort: allowedSort,
    page,
    range: allowedRange,
    resource: params.get('resource') || '',
  };
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-8 rounded-full px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${active ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
    >
      {children}
    </button>
  );
}

export default function Admin() {
  const [initial] = useState(readInitialState);
  const [listData, setListData] = useState([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(initial.page);
  const [inputPage, setInputPage] = useState(String(initial.page));
  const [view, setView] = useState(initial.view);
  const [layout, setLayout] = useState(initial.layout);
  const [searchInput, setSearchInput] = useState(initial.query);
  const [query, setQuery] = useState(initial.query);
  const [storage, setStorage] = useState(initial.storage);
  const [kind, setKind] = useState(initial.kind);
  const [blocked, setBlocked] = useState(initial.blocked);
  const [metadata, setMetadata] = useState(initial.metadata);
  const [sort, setSort] = useState(initial.sort);
  const [range, setRange] = useState(initial.range);
  const [statsData, setStatsData] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [selectedResource, setSelectedResource] = useState(initial.resource);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(resultTotal / 12));
  const resetPage = useCallback(() => {
    setCurrentPage(1);
    setInputPage('1');
  }, []);

  const loadList = useCallback(async (page) => {
    if (view !== 'list' && view !== 'log') return;
    setListLoading(true);
    try {
      const response = await fetch(`/api/admin/${view}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: page - 1,
          query,
          storage: storage || undefined,
          kind: kind || undefined,
          blocked: blocked || undefined,
          metadata: view === 'list' ? metadata || undefined : undefined,
          sort: view === 'list' ? sort : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || '获取资源失败');
      setListData(payload.data || []);
      setResultTotal(payload.total || 0);
    } catch (error) {
      toast.error(error.message || '获取资源失败');
      setListData([]);
      setResultTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [blocked, kind, metadata, query, sort, storage, view]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const response = await fetch(`/api/admin/stats?range=${range}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || '获取概览失败');
      setStatsData(payload.data);
    } catch (error) {
      setStatsError(error.message || '获取概览失败');
    } finally {
      setStatsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    if (view === 'list' || view === 'log') loadList(currentPage);
  }, [currentPage, loadList, refreshKey, view]);

  useEffect(() => {
    if (view === 'stats') fetchStats();
  }, [fetchStats, view]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setInputPage(String(totalPages));
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('view', view);
    if (view === 'stats') params.set('range', range);
    if (view === 'list' || view === 'log') {
      if (query) params.set('q', query);
      if (storage) params.set('storage', storage);
      if (kind) params.set('kind', kind);
      if (blocked) params.set('blocked', blocked);
      params.set('page', String(currentPage));
      if (view === 'list') {
        params.set('layout', layout);
        params.set('sort', sort);
        if (metadata) params.set('metadata', metadata);
      }
    }
    if (selectedResource) params.set('resource', selectedResource);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [blocked, currentPage, kind, layout, metadata, query, range, selectedResource, sort, storage, view]);

  const setFilter = (setter, value) => {
    setter(value);
    resetPage();
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setQuery(searchInput.trim());
    resetPage();
  };

  const switchView = (nextView) => {
    setView(nextView);
    setSelectedResource('');
    resetPage();
  };

  const browseResources = (options = {}) => {
    setView('list');
    setSelectedResource('');
    setSearchInput(options.query || '');
    setQuery(options.query || '');
    setStorage(options.storage || '');
    setKind(options.kind || '');
    setBlocked(options.blocked || '');
    setMetadata(options.metadata || '');
    setSort(options.sort || 'newest');
    resetPage();
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const response = await fetch('/api/admin/metadata', { method: 'POST' });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.message || '补全失败');
      const { updated, remaining } = payload.data;
      toast.success(`已补全 ${updated} 个 R2 文件；剩余 ${remaining} 个`);
      fetchStats();
    } catch (error) {
      toast.error(error.message || '补全失败');
    } finally {
      setBackfilling(false);
    }
  };

  const handleDeleted = useCallback(() => {
    setSelectedResource('');
    setRefreshKey((key) => key + 1);
    fetchStats();
  }, [fetchStats]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((page) => page + 1);
      setInputPage(String(currentPage + 1));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((page) => page - 1);
      setInputPage(String(currentPage - 1));
    }
  };

  const handleJumpPage = () => {
    const page = Number.parseInt(inputPage, 10);
    if (Number.isInteger(page) && page >= 1 && page <= totalPages) setCurrentPage(page);
    else toast.error('请输入有效页码');
  };

  const sectionTitle = { stats: '文件资产概览', list: '资源中心', log: '访问日志', apikeys: 'API 管理与文档' }[view];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-stone-100 text-stone-900">
      <aside className="hidden h-full w-52 shrink-0 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-stone-100 px-4"><span className="text-sm font-semibold tracking-tight">图床 · 运维台</span></div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="后台导航">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => switchView(item.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${view === item.id ? 'bg-stone-900 font-medium text-white' : 'text-stone-600 hover:bg-stone-50'}`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="shrink-0 space-y-2 border-t border-stone-100 p-3">
          <Link href="/" className="block rounded-lg border border-stone-300 bg-stone-50 py-2 text-center text-sm font-medium text-stone-800 hover:bg-white">← 返回前台</Link>
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="w-full rounded-lg bg-stone-900 py-2 text-sm text-white hover:bg-stone-800">登出</button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4">
          <div className="hidden text-sm text-stone-500 md:block">{sectionTitle}</div>
          <div className="flex min-w-0 items-center gap-2 md:hidden overflow-x-auto">
            {NAV.map((item) => <Chip key={item.id} active={view === item.id} onClick={() => switchView(item.id)}>{item.label}</Chip>)}
          </div>
          {(view === 'list' || view === 'log') ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="搜索路径…" className="w-32 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 sm:w-52" />
              <button type="submit" className="min-h-9 rounded-lg bg-stone-900 px-3 text-sm text-white hover:bg-stone-800">搜索</button>
            </form>
          ) : <Link href="/" className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 md:hidden">← 前台</Link>}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto w-full max-w-7xl">
            {view === 'apikeys' ? <AdminApiKeys /> : null}
            {view === 'stats' ? <AdminInsights data={statsData} error={statsError} loading={statsLoading} range={range} onRangeChange={setRange} onBrowse={browseResources} onOpenResource={setSelectedResource} onBackfill={handleBackfill} backfilling={backfilling} /> : null}
            {view === 'list' || view === 'log' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">{STORAGE_CHIPS.map((chip) => <Chip key={`storage-${chip.id || 'all'}`} active={storage === chip.id} onClick={() => setFilter(setStorage, chip.id)}>{chip.label}</Chip>)}</div>
                    {view === 'list' ? <div className="flex overflow-hidden rounded-lg border border-stone-200 text-xs font-medium"><button type="button" aria-pressed={layout === 'table'} onClick={() => setLayout('table')} className={`min-h-9 px-3 ${layout === 'table' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}>列表</button><button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')} className={`min-h-9 px-3 ${layout === 'grid' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}>网格</button></div> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{KIND_CHIPS.map((chip) => <Chip key={`kind-${chip.id || 'all'}`} active={kind === chip.id} onClick={() => setFilter(setKind, chip.id)}>{chip.label}</Chip>)}<span className="mx-1 h-5 w-px self-center bg-stone-200" />{BLOCK_CHIPS.map((chip) => <Chip key={`blocked-${chip.id || 'all'}`} active={blocked === chip.id} onClick={() => setFilter(setBlocked, chip.id)}>{chip.label}</Chip>)}</div>
                  {view === 'list' ? <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3"><div className="flex flex-wrap gap-1.5">{METADATA_CHIPS.map((chip) => <Chip key={`metadata-${chip.id || 'all'}`} active={metadata === chip.id} onClick={() => setFilter(setMetadata, chip.id)}>{chip.label}</Chip>)}</div><label className="ml-auto flex min-h-8 items-center gap-2 text-xs text-stone-600">排序<select value={sort} onChange={(event) => setFilter(setSort, event.target.value)} className="min-h-8 rounded-md border border-stone-200 bg-white px-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500">{SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label></div> : null}
                  <p className="mt-3 text-xs text-stone-500" aria-live="polite">共 <strong className="tabular-nums text-stone-800">{resultTotal}</strong> 条{listLoading ? ' · 正在更新' : ''}</p>
                </div>

                <AdminTable data={listData} layout={view === 'list' ? layout : 'table'} onSelect={(item) => setSelectedResource(item.url)} onRefresh={() => { setRefreshKey((key) => key + 1); fetchStats(); }} />

                <nav className="sticky bottom-0 flex items-center justify-center gap-3 border-t border-stone-200 bg-white/95 py-3 backdrop-blur" aria-label="资源分页">
                  <button type="button" className="min-h-9 rounded-lg bg-stone-100 px-3 text-sm hover:bg-stone-200 disabled:opacity-40" onClick={handlePrevPage} disabled={currentPage === 1}>上一页</button>
                  <span className="text-xs tabular-nums text-stone-600 sm:text-sm">{currentPage} / {totalPages}</span>
                  <button type="button" className="min-h-9 rounded-lg bg-stone-100 px-3 text-sm hover:bg-stone-200 disabled:opacity-40" onClick={handleNextPage} disabled={currentPage === totalPages}>下一页</button>
                  <label className="sr-only" htmlFor="admin-page">跳转页码</label><input id="admin-page" type="number" min="1" max={totalPages} value={inputPage} onChange={(event) => setInputPage(event.target.value)} className="min-h-9 w-16 rounded-lg border border-stone-200 px-2 text-sm" />
                  <button type="button" className="min-h-9 rounded-lg bg-stone-900 px-3 text-sm text-white" onClick={handleJumpPage}>跳转</button>
                </nav>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {selectedResource ? <AdminResourceDrawer url={selectedResource} range={range} onClose={() => setSelectedResource('')} onDeleted={handleDeleted} /> : null}
      <ToastContainer />
    </div>
  );
}
