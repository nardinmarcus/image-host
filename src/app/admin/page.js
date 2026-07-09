'use client';

import { signOut } from 'next-auth/react';
import AdminTable from '@/components/AdminTable';
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import Link from 'next/link';

function StatsList({ title, items }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold mb-3 text-stone-800">{title}</h3>
      <div className="max-h-64 overflow-auto divide-y divide-stone-100">
        {items?.length ? (
          items.map((item, i) => (
            <div key={i} className="flex justify-between gap-3 py-1.5 text-sm">
              <span className="truncate text-stone-600">{item.name || '(空)'}</span>
              <span className="text-teal-700 font-variant-numeric tabular-nums whitespace-nowrap">
                {item.count}
              </span>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-stone-400 text-sm">暂无数据</div>
        )}
      </div>
    </div>
  );
}

const NAV = [
  { id: 'list', label: '资源' },
  { id: 'log', label: '访问日志' },
  { id: 'stats', label: '概览' },
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

/**
 * A 运维台 + C 媒体库：侧栏 IA、筛选、表/网格切换。
 */
export default function Admin() {
  const [listData, setListData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [inputPage, setInputPage] = useState(1);
  const [view, setView] = useState('list');
  const [layout, setLayout] = useState('table'); // table | grid
  const [searchQuery, setSearchQuery] = useState('');
  const [storage, setStorage] = useState('');
  const [kind, setKind] = useState('');
  const [blocked, setBlocked] = useState('');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultTotal, setResultTotal] = useState(0);

  const getListdata = useCallback(
    async (page) => {
      if (view === 'stats') return;
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/${view}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: page - 1,
            query: searchQuery,
            storage: storage || undefined,
            kind: kind || undefined,
            blocked: blocked || undefined,
          }),
        });
        const res_data = await res.json();
        if (!res_data?.success) {
          toast.error(res_data.message);
        } else {
          setListData(res_data.data || []);
          setResultTotal(res_data.total || 0);
          setSearchTotal(Math.max(1, Math.ceil((res_data.total || 0) / 12)));
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [view, searchQuery, storage, kind, blocked]
  );

  useEffect(() => {
    if (view !== 'stats') getListdata(currentPage);
  }, [currentPage, view, getListdata]);

  // 筛选变化时回第一页
  useEffect(() => {
    setCurrentPage(1);
    setInputPage(1);
  }, [storage, kind, blocked, view]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data?.success) setStatsData(data.data);
      else toast.error(data.message || '获取统计失败');
    } catch {
      toast.error('获取统计失败');
    }
  }, []);

  useEffect(() => {
    if (view === 'stats') fetchStats();
  }, [view, fetchStats]);

  const handleNextPage = () => {
    if (currentPage >= searchTotal) {
      toast.error('已是最后一页');
      return;
    }
    const next = currentPage + 1;
    setCurrentPage(next);
    setInputPage(next);
  };

  const handlePrevPage = () => {
    if (currentPage <= 1) return;
    const prev = currentPage - 1;
    setCurrentPage(prev);
    setInputPage(prev);
  };

  const handleJumpPage = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= searchTotal) setCurrentPage(page);
    else toast.error('请输入有效页码');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setInputPage(1);
    getListdata(1);
  };

  const Chip = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
        active
          ? 'bg-stone-900 text-white'
          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
      }`}
    >
      {children}
    </button>
  );

  return (
    // h-screen + overflow-hidden：整页不滚；仅右侧 main 滚动，侧栏保持固定
    <div className="h-[100dvh] bg-stone-100 text-stone-900 flex overflow-hidden">
      {/* 侧栏 A：固定视口高度，不随内容滚动 */}
      <aside className="hidden md:flex w-52 h-full flex-col border-r border-stone-200 bg-white shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-stone-100 shrink-0">
          <span className="font-semibold tracking-tight text-sm">图床 · 运维台</span>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setView(item.id);
                setCurrentPage(1);
                setInputPage(1);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                view === item.id
                  ? 'bg-stone-900 text-white font-medium'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-100 space-y-2 shrink-0">
          <Link
            href="/"
            className="block text-center text-sm py-2 rounded-lg border border-stone-300 bg-stone-50 hover:bg-white font-medium text-stone-800"
          >
            ← 返回前台
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full text-sm py-2 rounded-lg bg-stone-900 text-white hover:bg-stone-800"
          >
            登出
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* 顶栏：贴在内容区顶部，不滚走 */}
        <header className="h-14 border-b border-stone-200 bg-white flex items-center justify-between px-4 gap-3 shrink-0 z-30">
          <div className="flex items-center gap-2 md:hidden overflow-x-auto">
            {NAV.map((item) => (
              <Chip key={item.id} active={view === item.id} onClick={() => setView(item.id)}>
                {item.label}
              </Chip>
            ))}
          </div>
          <div className="hidden md:block text-sm text-stone-500">
            {view === 'list' && '资源中心'}
            {view === 'log' && '访问日志'}
            {view === 'stats' && '概览统计'}
          </div>
          <div className="flex items-center gap-2">
            {view !== 'stats' && (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索路径…"
                  className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm w-28 sm:w-44 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
                <button
                  type="submit"
                  className="text-sm px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                >
                  搜索
                </button>
              </form>
            )}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400 whitespace-nowrap font-medium"
            >
              <span aria-hidden>←</span>
              返回前台
            </Link>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 pb-24 w-full">
          <div className="max-w-7xl mx-auto">
          {view === 'stats' ? (
            <div className="space-y-4">
              <p className="text-sm text-stone-500">访问 Top 20（可后续点穿筛选）</p>
              {statsData ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <StatsList title="访问前 20 IP" items={statsData.ips} />
                  <StatsList title="访问前 20 Referer" items={statsData.referers} />
                  <StatsList title="访问前 20 资源" items={statsData.imgs} />
                </div>
              ) : (
                <div className="text-center text-stone-400 py-16 text-sm">加载中…</div>
              )}
            </div>
          ) : (
            <>
              {/* 筛选条 + 视图切换 */}
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STORAGE_CHIPS.map((c) => (
                      <Chip key={c.id || 's-all'} active={storage === c.id} onClick={() => setStorage(c.id)}>
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                  {view === 'list' && (
                    <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setLayout('table')}
                        className={`px-3 py-1.5 ${layout === 'table' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
                      >
                        列表
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayout('grid')}
                        className={`px-3 py-1.5 ${layout === 'grid' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600'}`}
                      >
                        网格
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {KIND_CHIPS.map((c) => (
                    <Chip key={c.id || 'k-all'} active={kind === c.id} onClick={() => setKind(c.id)}>
                      {c.label}
                    </Chip>
                  ))}
                  <span className="w-px h-5 bg-stone-200 self-center mx-1" />
                  {BLOCK_CHIPS.map((c) => (
                    <Chip key={c.id || 'b-all'} active={blocked === c.id} onClick={() => setBlocked(c.id)}>
                      {c.label}
                    </Chip>
                  ))}
                </div>
                <div className="flex gap-3 text-xs text-stone-500">
                  <span>
                    共 <strong className="text-stone-800 tabular-nums">{resultTotal}</strong> 条
                  </span>
                  {loading && <span>加载中…</span>}
                </div>
              </div>

              <AdminTable
                data={listData}
                layout={view === 'list' ? layout : 'table'}
              />
            </>
          )}
          </div>
        </main>

        {view !== 'stats' && (
          <div className="fixed inset-x-0 bottom-0 h-14 border-t border-stone-200 bg-white/95 backdrop-blur flex items-center justify-center z-30">
            <div className="flex items-center gap-3 text-sm">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span className="text-stone-600 tabular-nums text-xs sm:text-sm">
                {currentPage} / {searchTotal || 1}
              </span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200"
                onClick={handleNextPage}
              >
                下一页
              </button>
              <input
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                className="border border-stone-200 rounded-lg px-2 py-1 w-16 text-sm"
              />
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-sm"
                onClick={handleJumpPage}
              >
                跳转
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
