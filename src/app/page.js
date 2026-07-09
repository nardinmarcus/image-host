import { headers } from "next/headers";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { auth } from "@/auth";
import { countImgInfo } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

export const runtime = "edge";

/**
 * 首页 Server Component：在边缘并行取 total / ip / 登录态，
 * 避免客户端挂载后再串行打 3 个 API。
 */
export default async function HomePage() {
  const sessionPromise = auth();

  let total = "?";
  try {
    const { env } = getRequestContext();
    if (env?.IMG) {
      total = await countImgInfo(env);
    }
  } catch (error) {
    console.error("home countImgInfo error:", error);
  }

  const h = headers();
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "";

  const session = await sessionPromise;
  const role = session?.user?.role || "";
  const isAuth = role === "admin" || role === "user";

  return (
    <HomeClient
      initialTotal={total}
      initialIp={ip}
      initialRole={role}
      initialIsAuth={isAuth}
    />
  );
}
