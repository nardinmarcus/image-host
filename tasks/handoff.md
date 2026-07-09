# image-host 交接文档（Handoff）

> 供下一个 Agent/模型接手。读完本文档 + `tasks/todo.md` + `CHANGELOG.md` + `src/lib/` 即可独立工作。  
> 项目根：`/Users/dapeng/projects/image-host` | 生产域名：https://image.namooca.com  
> **最后更新：2026-07-10**（今日收工）

---

## 1. 项目快照

[telegraph-Image](https://github.com/x-dr/telegraph-Image) 的 fork（私有增强版）。

| 项 | 值 |
|----|-----|
| 框架 | Next.js **14.2.35** App Router + `@cloudflare/next-on-pages` |
| 认证 | next-auth **v5 beta.31** Credentials |
| 存储 | **R2 默认** + TG 频道（cfile）；telegraph/58 等 fallback 默认不暴露 UI |
| 数据 | Cloudflare **D1**（`IMG` binding）+ **R2**（`IMGRS`） |
| 部署 | Cloudflare Pages 连 Git `main`；本地 `next build` 在 Node 22 上会卡 |

---

## 2. 当前状态：可上线，今日功能闭环

**安全 / 核心**：SQL 全参数化、JWT 无 fallback、admin 二次鉴权、上传 size+MIME、R2 uuid key、safeEqual（charCodeAt）。

**产品**：多类型上传、自动切 TG 发频道、后台运维台、开放 API Key 上传——均已生产验证。

**今日收工边界**：API 相关停在此；未做 Key 限流 / 上传审计日志 / OpenNext。

---

## 3. 架构与关键文件

### 公共层（`src/lib/`，新增查询务必走这里）

| 文件 | 职责 |
|------|------|
| `db.js` | D1 全参数化；`imginfo` mime/kind；`api_keys` CRUD；列表筛选 |
| `http.js` | `jsonOk`/`jsonErr`/`corsHeaders`/`MAX_UPLOAD_*`/`MEDIA_CACHE_CONTROL` |
| `time.js` | `nowTime()` → ISO+08:00；`formatTimeDisplay` |
| `mime.js` | 上传 MIME 归一化与白名单 |
| `mediaMeta.js` | kind/mime 展示与筛选 SQL 片段 |
| `apiKeys.js` | `ih_` 密钥生成、SHA-256、请求头解析 |
| `uploadR2.js` | 共享 R2 上传（网页 + `/api/v1/upload`） |

### 认证

- `src/auth.js`：`safeEqual` **必须用 charCodeAt**，勿改 TextEncoder（edge 下会破坏登录）
- `src/middleware.js`：pages.dev → 自定义域 301；admin API 登录守卫；**r2/tgchannel 始终要登录**（与 `ENABLE_AUTH_API` 无关）；`isauth` 可匿名

### 存储路径

| 路径 | 说明 |
|------|------|
| `/api/enableauthapi/r2` + `/api/rfile/*` | 会话上传 / 读取 / 可删 |
| `/api/enableauthapi/tgchannel` + `/api/cfile/*` | 发 TG 频道；删除只清 D1，频道文件仍在 |
| `/api/v1/upload` | **API Key** 上传，落 R2 |

### 前端

- 首页：`page.js`（edge RSC）→ `HomeClient` + Upload* 组件
- 后台：`admin/page.js` 侧栏（资源 / 日志 / 概览 / **API**）+ 列表/网格

---

## 4. 部署与验证（务必遵守）

1. `npm run lint`（exit 0）
2. `git push origin main` → CF Pages 构建
3. 监控用 **check-runs**（status 会一直 pending）：
   ```bash
   gh api repos/nardinmarcus/image-host/commits/main/check-runs \
     --jq '.check_runs[]|select(.name|test("Cloudflare";"i"))|.status+"/"+.conclusion'
   ```
4. **不要本地 `next build`**（Node 22 + Next 14 worker 卡死）
5. 健康检查：`curl -s https://image.namooca.com/api/total`

---

## 5. 已完成能力清单（摘要）

详见 `CHANGELOG.md`。要点：

- [x] 安全加固 0–4 阶段 + 工程化（缓存、SSR 首页、组件拆分）
- [x] 上传 20MB；PDF/音频/Office/EPUB；文档自动切 TG
- [x] 后台 A+C：筛选、表/网格、侧栏固定、返回前台
- [x] `imginfo.mime` / `kind` 权威类型
- [x] 开放 API：`POST /api/v1/upload` + 后台 Key 管理 + 文档（上传 URL 必须带 `/api/v1/upload`）

---

## 6. 下一步（未做）

| 优先级 | 项 |
|--------|-----|
| 中 | 后台 P2：URL 同步筛选、批量删/拉黑、统计点穿 |
| 低 | 删死代码 `Table.jsx`；console 清理；`design-previews/` 是否入库 |
| 低 | API：按 key 限流、上传日志、`storage=tg` |
| 高风险独立周期 | **OpenNext 迁移**（next-on-pages 已归档） |

---

## 7. 关键陷阱

1. **safeEqual 勿用 TextEncoder**
2. **本地 next build 卡死** → 只靠 CF 构建
3. **部署看 check-runs** 不是 status
4. **cfile 删除 ≠ TG 删文件**
5. **edge 缓存 per-colo**：`caches.default.delete` 只清当前节点
6. **jsonOk 展开字段**：需要 `res.data` 时用 `jsonOk({ data: {...} })`
7. **勿 `npm audit fix --force` 升 next-on-pages**
8. **API Base URL ≠ 上传 URL**：上传 = `https://image.namooca.com/api/v1/upload`

---

## 8. 环境变量与 Bindings

| 变量 / Binding | 用途 | 必配 |
|----------------|------|------|
| `SECRET` | next-auth JWT | **是** |
| `BASIC_USER` / `BASIC_PASS` | 管理员 | 是 |
| `REGULAR_USER` / `REGULAR_PASS` | 访客账号 | 否 |
| `IMG` | D1 | 是 |
| `IMGRS` | R2 | 是（默认上传） |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | TG 频道 | 文档发频道时需要 |
| `ENABLE_AUTH_API` | 访客验证开关 | 否 |

兼容性标志：生产填 `nodejs_compat`（见 README）。

---

## 9. 接手第一步

1. 读本文件 + `tasks/todo.md` + `CHANGELOG.md` + `src/lib/`
2. `git log --oneline -25`
3. check-runs 确认 main 部署 success
4. `curl -s https://image.namooca.com/api/total`
5. 从第 6 节挑一项；改完 lint → push → check-runs → 用户验证

## 10. 参考

- OpenNext Cloudflare：https://opennext.js.org/cloudflare  
- next-on-pages（归档）：https://github.com/cloudflare/next-on-pages  
- CF Pages 项目：控制台 → Pages → img-bnp（或当前绑定名）  
