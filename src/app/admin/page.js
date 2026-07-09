'use client'
import { signOut } from "next-auth/react"
import Table from "@/components/Table"
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from "react-toastify";
import Link from 'next/link'


function StatsList({ title, items }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-gray-800">{title}</h3>
      <div className="border rounded max-h-60 overflow-auto bg-white">
        {items?.length ? items.map((item, i) => (
          <div key={i} className="flex justify-between px-3 py-1 border-b last:border-b-0 text-sm">
            <span className="truncate text-gray-700 mr-2">{item.name || '(空)'}</span>
            <span className="text-cyan-600 whitespace-nowrap">{item.count}</span>
          </div>
        )) : <div className="p-3 text-gray-400 text-sm">暂无数据</div>}
      </div>
    </div>
  );
}


export default function Admin() {
  const [listData, setListData] = useState([])
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [inputPage, setInputPage] = useState(1);
  const [view, setView] = useState('list'); // 'list' / 'log' / 'stats'
  const [searchQuery, setSearchQuery] = useState('');
  const [statsData, setStatsData] = useState(null);


  const getListdata = useCallback(async (page) => {
    try {
      const res = await fetch(`/api/admin/${view}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({
          page: (page - 1),
          query: searchQuery,
        })
      })
      const res_data = await res.json()
      if (!res_data?.success) {
        toast.error(res_data.message)
      } else {
        setListData(res_data.data)
        const totalPages = Math.ceil(res_data.total / 10);
        setSearchTotal(totalPages);
      }

    } catch (error) {
      toast.error(error.message)
    }

  }, [view, searchQuery])


  useEffect(() => {
    if (view !== 'stats') getListdata(currentPage)
  }, [currentPage, view, getListdata]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data?.success) setStatsData(data.data);
      else toast.error(data.message || '获取统计失败');
    } catch (error) {
      toast.error('获取统计失败');
    }
  }, []);

  useEffect(() => {
    if (view === 'stats') fetchStats();
  }, [view, fetchStats]);


  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    if (nextPage > searchTotal) {
      toast.error('当前已为最后一页！')
    }
    if (nextPage <= searchTotal) {
      setCurrentPage(nextPage);
      setInputPage(nextPage)
    }
  };

  const handlePrevPage = () => {
    const prevPage = currentPage - 1;
    if (prevPage >= 1) {
      setCurrentPage(prevPage);
      setInputPage(prevPage)
    }
  };


  const handleJumpPage = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= searchTotal) {
      setCurrentPage(page);
    } else {
      toast.error('请输入有效的页码！');
    }
  };

  const handleViewToggle = () => {
    setView(view === 'list' ? 'log' : 'list');
    setCurrentPage(1);
    setInputPage(1);
  };


  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setInputPage(1);
    getListdata(1);
  };

  return (
    <>
      <div className="overflow-auto h-full flex w-full min-h-screen flex-col items-center justify-between">
        <header className="fixed top-0 h-[50px]  left-0 w-full border-b bg-white flex z-50 justify-center items-center">
          <div className="flex justify-between items-center w-full max-w-4xl px-4">
            <div className="flex items-center">
              <button className='text-white px-4 py-2  transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300  rounded '
                onClick={handleViewToggle}>
                切换到 {view === 'list' ? '日志页' : '数据页'}
              </button>
              <button className={`text-white px-4 py-2 ml-2 transition ease-in-out delay-150 duration-300 rounded ${view === 'stats' ? 'bg-indigo-600' : 'bg-blue-500 hover:scale-110 hover:bg-indigo-500'}`}
                onClick={() => setView('stats')}>
                统计
              </button>
            </div>
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded p-2 w-40 mr-2"
                placeholder="搜索"
              />
              <button type="submit" className="text-white px-4 py-2 transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 rounded">
                搜索
              </button>
            </form>
          </div>
          <Link href="/"  className="hidden sm:flex"> <button className="px-4 py-2 mx-2 w-28  sm:w-28 md:w-20 lg:w-16 xl:w-16  2xl:w-20 bg-blue-500 text-white rounded ">主页</button></Link>
          <button onClick={() => signOut({ callbackUrl: "/" })} className="px-4 py-2 mx-2 w-28  sm:w-28 md:w-20 lg:w-16 xl:w-16  2xl:w-20 bg-blue-500 text-white rounded ">登出</button>
        </header>

        <main className="my-[60px] w-9/10  sm:w-9/10 md:w-9/10 lg:w-9/10 xl:w-3/5 2xl:w-full">
          {view === 'stats' ? (
            <div className="space-y-6">
              {statsData ? (
                <>
                  <StatsList title="访问前 20 IP" items={statsData.ips} />
                  <StatsList title="访问前 20 Referer" items={statsData.referers} />
                  <StatsList title="访问前 20 图片" items={statsData.imgs} />
                </>
              ) : (
                <div className="text-center text-gray-500 py-10">加载中...</div>
              )}
            </div>
          ) : (
            <Table data={listData} />
          )}
        </main>
        {view !== 'stats' && (
          <div className="fixed inset-x-0 bottom-0 h-[50px]  w-full  flex  z-50 justify-center items-center bg-white ">
            <div className="pagination mt-5 mb-5 flex justify-center items-center">
              <button className=' text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500  hover:scale-110 hover:bg-indigo-500 duration-300p-2 p-2 rounded mr-5' onClick={handlePrevPage} disabled={currentPage === 1}>
                上一页
              </button>
              <span className="text-xs sm:text-sm">第 {`${currentPage}/${searchTotal}`} 页</span>
              <button className='text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500  hover:scale-110 hover:bg-indigo-500 duration-300 p-2 rounded ml-5' onClick={handleNextPage}>
                下一页</button>
              <div className="ml-5 flex items-center">
                <input
                  type="number"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  className="border rounded p-2 w-20"
                  placeholder="页码"
                />
                <button className='text-xs sm:text-sm transition ease-in-out delay-150 bg-blue-500 hover:scale-110 hover:bg-indigo-500 duration-300 p-2 rounded ml-2' onClick={handleJumpPage}>
                  跳转
                </button>
              </div>
            </div>
          </div>
        )}
        <ToastContainer />
      </div>
    </>

  )
}
