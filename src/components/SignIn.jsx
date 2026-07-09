"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
      });
      if (result?.error) {
        toast.error("用户名或密码错误，请核对后重试！");
      } else {
        toast.success("登录成功，自动跳转到对应页面！");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* 品牌标识 */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-[0_4px_14px_rgb(13_148_136/0.3)]">
            N
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Namoo Pix
          </h1>
        </div>

        {/* 登录表单 */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="username">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              placeholder="输入用户名…"
              autoComplete="username"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              placeholder="输入密码…"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700"
          >
            登录
          </button>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}
