# image-host 交接文档（Handoff）

> 供下一个 Agent/模型接手。读完本文档 + `tasks/todo.md` + `src/lib/` 即可独立工作。
> 项目根：`/Users/dapeng/projects/image-host` | 域名：image.namooca.com | 最后更新：2026-07-09

---

## 1. 项目快照

telegraph-Image 的 fork，Next.js 14.2.5 (App Router) + next-auth v5 beta + Cloudflare D1/R2/Pages。多源图床（R2/TG 频道/telegraph/58/腾讯/vviptuangou），已切换 **R2 为默认主存储**。约 4000 行，34 源文件。

## 2. 当前状态：核心完成，可上线

**已完成并生产验证**（main 分支，CF Pages 部署中）：
- 安全：SQL 注入清零、JWT fail-fast、3 个 next CVE + next-auth cookie 漏洞修复、admin 二次鉴权、上传校验、R2 uuid、时序防护
- 存储：默认 R2（可删/无乱码）、cfile 乱码修复、admin/delete 联动删 R2 + 清缓存
- 工程化：`src/lib` 公共层、Top20 统计、CI、死代码清理、内存泄漏修复、a11y、中文化

**验证过的功能**：登录、上传（正常图 + >5MB 拒绝）、R2 删除（`?nocache` 404）、Top20 统计、缩略图/预览。

## 3. 架构与关键文件

### 公共层（`src/lib/`，整改时新建，务必复用）
- `db.js` —— 所有 D1 查询的统一入口，**全参数化**（`getRating`/`insertImgInfo`/`searchImgInfo`/`searchLogs`/`getTopStats`/`incrementTotal`/`updateRating`/`deleteImgInfo`/`countImgInfo`）。新增查询一律加这里，禁止 route 内拼 SQL
- `http.js` —— `corsHeaders`/`jsonOk(data,status)`/`jsonErr(msg,status)`（脱敏，不返回 error.message）/`getClientIp`（已移除 edge 不存在的 `request.socket`）/`getReferer`
- `time.js` —— `nowTime()`（收口 9 处复制；格式暂保持本地化字符串，阶段 6 未改 ISO）

### Route 模式（新 route 照此写）
```js
import { getRequestContext } from '@cloudflare/next-on-pages';
import { auth } from '@/auth';
import { ... } from '@/lib/db';
import { jsonOk, jsonErr } from '@/lib/http';
export const runtime = 'edge';
export async function GET(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') return jsonErr('forbidden', 403);
  const { env } = getRequestContext();
  // 用 lib 查询，jsonOk/jsonErr 返回
}
```

### 认证
- `src/auth.js` —— next-auth v5 beta.31，CredentialsProvider，`safeEqual`（charCodeAt 版，**勿改 TextEncoder**——见陷阱）。`secret: process.env.SECRET`（无 fallback，必配）
- `src/middleware.js` —— pages.dev→namooca 301 跳转 + admin/enableauthapi 路由守卫

### 存储
- R2（默认）：`enableauthapi/r2`（上传，uuid 文件名）→ `rfile/[name]`（读取）→ `admin/delete`（删 R2 + 清缓存）
- cfile（TG 频道，保留）：`enableauthapi/tgchannel` 上传 → `cfile/[name]` 读取（detectMimeType 魔术字节判断 Content-Type）
- file（telegraph 代理）：`file/[name]`

## 4. 部署与验证流程（务必遵守）

1. **本地改完先 `npm run lint`**（必须 exit 0；`admin/page.js` 的 2 个 useCallback warning 是原有的，不算）
2. **`git push origin main`** 触发 Cloudflare Pages 自动构建
3. **监控部署用 check-runs**（不是 status，status 一直 pending）：
   ```bash
   gh api repos/nardinmarcus/image-host/commits/main/check-runs \
     --jq '.check_runs[]|select(.name|test("Cloudflare";"i"))|.status+"/"+.conclusion'
   # 等 "completed/success"
   ```
4. **本地 `next build` 会卡死**（Node 22 + Next 14.x worker 不兼容，[GitHub #67474](https://github.com/vercel/next.js/discussions/67474)）——**不要尝试本地 build**，用 CF 预览/生产验证。Node 22 是机器全局，不要为这个降级
5. 功能验证需登录态的（admin/上传），让用户浏览器操作；未授权 API 可 curl（应 401/403）

## 5. 剩余优化项（按优先级，含位置+方向+风险）

### 已完成且生产验证通过（2026-07-09，commit `42d5d8d`）
- 拆前端：`UploadPanel` / `UploadQueue` / `ResultLinks` / `ProviderSelect`（`page.js` 瘦身为编排层）
- 拖拽区 a11y：`tabIndex`/`role`/`aria-label`/Enter·Space 打开 file picker
- 上传源 UI 收敛：仅 R2 + TG_Channel，未登录禁用 select 并提示；`isAuth` 按 `role` 判定（勿仅靠 isauth 的 HTTP 200）
- admin useCallback 依赖数组补齐
- **用户验证通过**：① 登录后 R2 上传 ② 预览/链接 Tab/复制 ③ 后台统计 Tab ④ 测试图清理

### 下一步（按优先级）
1. **统一 Cache-Control**（`rfile`/`cfile` 已有 `caches.default` 但缺明确 `Cache-Control`；`file` 无缓存）→ 当前进行中
2. **首页 client/server 边界**（统计/登录态服务端取数，减少首屏串行 3 个 API）
3. **R2 上传 API 鉴权加固**（`ENABLE_AUTH_API=false` 时 middleware 不拦 `/api/enableauthapi/*`，未登录 POST R2 仍可成功；UI 已挡，API 未挡）
4. **tgchannel audio/pdf 收窄**（MIME 只放行 image/video，fileTypeMap 仍写 audio/pdf）：需用户确认是否放宽
5. **time 字段改 ISO8601**（`nowTime()` 仍本地化字符串；需迁移，D1 不可逆，谨慎）

### 风险高（单独做）
6. **迁移 OpenNext**（`@cloudflare/next-on-pages` 已于 2025-09-29 归档）：要改 15+ route + 去掉 `runtime = 'edge'` + middleware 兼容 + 构建重做。**单独完整周期**

## 6. 关键陷阱（踩过坑，务必避免）

1. **safeEqual 勿用 TextEncoder/Uint8Array** —— 在 next-on-pages edge 的 next-auth authorize 里会破坏登录（已验证：TextEncoder 版导致所有凭据 CredentialsSignin，=== 和 charCodeAt 版正常）。用 `charCodeAt` 逐字符异或
2. **本地 `next build` 卡死** —— Node 22 环境，别浪费时间排查，直接 push 让 CF 构建
3. **CF 部署监控用 check-runs** —— status API 对这个项目一直 pending，会误判 timeout
4. **cfile（TG 频道）源删不掉** —— admin/delete 只删 D1 记录，TG file_id 永久可访问（除非删 Bot）。这是 TG 固有，不是 bug。要"删除即 404"必须用 R2（默认已是 R2）
5. **删除后 edge 缓存 per-colo 延迟** —— `caches.default.delete` 只清当前 CF 节点，其他节点等 TTL。用户接受了几分钟延迟
6. **响应 envelope** —— `jsonOk({data: {...}})` 把字段展开到顶层；前端读 `res.data` 时，route 必须用 `jsonOk({data: {...}})` 嵌套（stats 路由踩过：`jsonOk({ips,referers,imgs})` 导致前端 `data.data` undefined 一直加载中）
7. **`@cloudflare/next-on-pages` 与 next 版本绑定** —— audit fix 想升级 next-on-pages 到 1.13.16 会要求 next ≥15，与 next 14.2.35 冲突（eresolve）。别 `npm audit fix --force`

## 7. 环境变量（CF Pages → Settings → Environment variables）

| 变量 | 用途 | 必配 |
|------|------|------|
| `SECRET` | next-auth JWT 密钥 | **是**（无 fallback，不配则整站 fail-fast） |
| `BASIC_USER` / `BASIC_PASS` | admin 账号 | 是 |
| `REGULAR_USER` / `REGULAR_PASS` | 普通用户（仅 ENABLE_AUTH_API=true 时用） | 否 |
| `IMG` | D1 binding | 是 |
| `IMGRS` | R2 bucket binding（默认上传用 R2） | 是 |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | TG 频道（cfile，可选 fallback） | 否 |
| `VVIP_SIGN` / `VVIP_TOKEN` | vviptuangou（可选，已从硬编码移出） | 否 |

CF Bindings：`IMG`（D1）、`IMGRS`（R2）在 Pages → Settings → Functions → Bindings 配。

## 8. 接手第一步

1. 读本文档 + `tasks/todo.md`（整改计划+进度勾选）+ `src/lib/`（公共层）
2. `git log --oneline -20` 看 16 个整改 commit 的脉络
3. 确认 main 健康：`gh api .../check-runs`（上面命令）应 completed/success
4. `curl -s https://image.namooca.com/api/total -w "\n%{http_code}"` 应 200（快速健康检查）
5. 挑第 5 节剩余项（OpenNext / ISO time / Cache-Control 等）；改完 lint → push → check-runs 监控 → 让用户验证

## 9. 参考资源

- 整改评估原始报告：本次会话上方（5 路并行子代理 + 交叉验证）
- next-on-pages 归档声明：https://github.com/cloudflare/next-on-pages （2025-09-29 read-only）
- OpenNext 迁移：https://opennext.js.org/cloudflare
- CF 部署状态：check-runs（见第 4 节）或 https://dash.cloudflare.com → Pages → img-bnp
