# image-host

基于 [telegraph-Image](https://github.com/x-dr/telegraph-Image) 的 Cloudflare Pages 图床增强版。默认 R2 存储，支持多类型文件、后台资产洞察与开放上传 API。

**生产站点：** <https://image.namooca.com>

---

## 功能特性

**上传与存储**

- 多类型文件：图片、视频、音频、PDF、EPUB、Office 文档（≤ 20MB）
- 默认落 **R2**（可删除、可缓存）；文档类自动切 **Telegram 频道**
- 网页上传需登录，未登录可见上传引导

**后台管理**

- 文件资产概览：资源数、容量覆盖、7/30 天 PV、独立 IP、访问趋势、热门资源
- 资源中心：来源 / 类型 / 状态筛选，按 PV / 体积 / 最近访问排序，详情抽屉
- 访问日志、媒体拉黑、删除联动 R2 + edge 缓存

**开放 API**

- `POST /api/v1/upload`，API Key 鉴权，落 R2
- 后台「API」页管理密钥与内嵌文档

---

## 技术栈

- **框架** — Next.js 14（App Router）+ `@cloudflare/next-on-pages`
- **认证** — next-auth v5（Credentials）
- **存储** — Cloudflare D1（元数据）+ R2（默认文件）+ Telegram 频道（文档 fallback）
- **部署** — Cloudflare Pages 连 Git `main`

---

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填本地登录凭证
npm run dev                  # 启动并初始化本地 D1/R2
npm run lint
```

本地 D1/R2 binding 由版本控制的 `wrangler.local.jsonc` 定义，数据落在 gitignored 的 `.wrangler/`。

> **注意：** Node 22 上本地 `npm run build` 可能卡死（Next 14 worker 问题）。生产构建以 Cloudflare Pages 为准，无需也不建议本地 build。

---

## 部署到 Cloudflare Pages

1. **连接仓库** — Framework preset 选 **Next.js**。
2. **Bindings** — D1 binding 名 `IMG`；R2 binding 名 `IMGRS`。
3. **环境变量** — 至少设置 `SECRET`、`BASIC_USER`、`BASIC_PASS`（见下表）。
4. **兼容性标志** — `设置 → 函数 → 兼容性标志` → 生产填 `nodejs_compat`。
5. 改完变量 / 绑定后点「重试部署」。

### 环境变量

| 变量 | 说明 | 必配 |
|------|------|:----:|
| `SECRET` | next-auth JWT 密钥 | 是 |
| `BASIC_USER` / `BASIC_PASS` | 管理员账号 | 是 |
| `REGULAR_USER` / `REGULAR_PASS` | 普通用户（访客验证） | 否 |
| `ENABLE_AUTH_API` | 访客验证开关，默认 `false` | 否 |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | Telegram 频道（发频道 / cfile） | 发频道时需要 |
| `ModerateContentApiKey` / `RATINGAPI` | 内容鉴黄 | 否 |

> `PROXYALLIMG`、`CUSTOM_DOMAIN`、`VVIP_SIGN` / `VVIP_TOKEN` 等为旧 fallback 图床相关可选项，新部署一般无需配置。

### D1 数据库初始化

应用运行时不修改表结构，使用受版本控制的 migration：

```bash
cp wrangler.example.toml wrangler.toml   # 复制模板，填入真实 D1/R2 ID（该文件已 gitignore）
npm run d1:migrations:apply               # 应用到生产 D1
npm run d1:migrations:list                # 确认无待执行项
```

本地验证：`npm run d1:migrations:apply:local`

> `imginfo` 表需已具备 `mime` 和 `kind` 字段；旧库请在维护窗口先完成字段迁移，再应用本 migration。D1/R2 控制台截图与建表 SQL 见 [docs/manage.md](./docs/manage.md)。

---

## 开放上传 API

```bash
curl -X POST "https://image.namooca.com/api/v1/upload" \
  -H "Authorization: Bearer ih_YOUR_API_KEY" \
  -F "file=@/path/to/photo.jpg"
```

| 项 | 值 |
|------|------|
| 上传地址（完整 URL） | `POST https://image.namooca.com/api/v1/upload` |
| 鉴权 | `Authorization: Bearer ih_…` 或 `X-API-Key: ih_…` |
| Body | `multipart/form-data`，字段名 `file` |
| 密钥获取 | 登录后台 → 侧栏「API」→ 创建（明文仅显示一次） |

成功响应含 `url`（形如 `…/api/rfile/<uuid>.png`）。完整说明与 n8n 示例见后台 API 页。

---

## 项目结构

```
src/lib/                 公共层：db / http / time / mime / mediaMeta / apiKeys / uploadR2
src/app/api/             路由：rfile·cfile（读写）、admin/*（后台）、v1/upload（开放 API）
src/app/admin/           后台界面（资源 / 日志 / 概览 / API）
migrations/              受版本控制的 D1 migration
wrangler.local.jsonc     本地开发 binding（版本控制）
wrangler.example.toml    生产 binding 模板（复制为 gitignored wrangler.toml）
docs/                    部署图文与后台规格说明
```

---

## 运维须知

- **Telegram 频道文件** — 后台删除只清站内记录，不从 Telegram 抹掉。要「删了即 404」请用 R2。
- **部署监控看 check-runs**（status 可能一直 pending）：

  ```bash
  gh api repos/nardinmarcus/image-host/commits/main/check-runs \
    --jq '.check_runs[]|select(.name|test("Cloudflare";"i"))|.status+"/"+.conclusion'
  ```

- **健康检查** — `curl -s https://image.namooca.com/api/total`

变更历史见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 上游与许可

本项目 fork 自 [x-dr/telegraph-Image](https://github.com/x-dr/telegraph-Image)，在此基础上的增强改动用于 image.namooca.com。

---

*最后更新：2026-07-10*
