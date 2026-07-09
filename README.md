# image-host

基于 [telegraph-Image](https://github.com/x-dr/telegraph-Image) 的 Cloudflare Pages 图床增强版。

**生产站点：** [https://image.namooca.com](https://image.namooca.com)

---

## 功能概览

| 能力 | 说明 |
|------|------|
| 网页上传 | 登录后上传；默认 **R2**（可删除）；文档/PDF/音频会自动切 **TG 频道** |
| 类型 | 图片、视频、音频、PDF、EPUB、Word / Excel / PPT（≤20MB） |
| 后台 | 资源筛选（来源/类型/状态）、列表/网格、访问日志、Top20、拉黑/删除 |
| 开放 API | `POST /api/v1/upload` + API Key（后台「API」页管理密钥与文档） |
| 鉴黄 | 可选 ModerateContent / 自建 RATINGAPI |

---

## 技术栈

- Next.js 14（App Router）+ `@cloudflare/next-on-pages`
- next-auth v5（Credentials）
- Cloudflare **D1** + **R2** + Pages

---

## 本地开发

```bash
npm install
npm run dev
npm run lint
```

> **注意：** 在 Node 22 上本地 `npm run build` 可能卡死（Next 14 worker 问题）。生产以 Cloudflare Pages 构建为准，勿强行本地 build。

---

## 部署（Cloudflare Pages）

1. 连接本仓库 Git，Framework preset 选 **Next.js**。  
2. 配置 **D1** binding 名称：`IMG`；**R2** binding 名称：`IMGRS`。  
3. 配置环境变量（见下表）；至少设置 `SECRET`、`BASIC_USER`、`BASIC_PASS`。  
4. 兼容性标志：`设置` → `函数` → `兼容性标志` → 生产填写 **`nodejs_compat`**。  
5. 部署后若改了变量/绑定，点 **重试部署**。  

更细的 D1 建表截图与 SQL 说明见 [docs/manage.md](./docs/manage.md)。  
初始化 SQL 见根目录 [tgimglog.sql](./tgimglog.sql)（含 `api_keys`；`mime`/`kind` 也可由运行时 `ALTER` 补齐）。

### 环境变量

| 变量 | 说明 | 必配 |
|------|------|------|
| `SECRET` | next-auth JWT 密钥 | **是** |
| `BASIC_USER` / `BASIC_PASS` | 管理员账号 | 是 |
| `REGULAR_USER` / `REGULAR_PASS` | 普通用户（访客验证） | 否 |
| `ENABLE_AUTH_API` | 访客验证开关，默认 false | 否 |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | Telegram 频道（发频道/cfile） | 发频道时需要 |
| `PROXYALLIMG` | 反向代理所有图片 | 否 |
| `ModerateContentApiKey` / `RATINGAPI` | 鉴黄 | 否 |
| `CUSTOM_DOMAIN` | 自定义加速域名说明用 | 否 |
| `VVIP_SIGN` / `VVIP_TOKEN` | 旧 fallback 图床 | 否 |

Bindings（非 env 文本）：`IMG` = D1，`IMGRS` = R2。

---

## 开放 API（摘要）

**实际上传地址（请用完整 URL）：**

```text
POST https://image.namooca.com/api/v1/upload
```

- **Base URL**（站点根，不能单独用来上传）：`https://image.namooca.com`  
- **鉴权**：`Authorization: Bearer ih_…` 或 `X-API-Key: ih_…`  
- **Body**：`multipart/form-data`，字段名 `file`  
- **密钥**：登录后台 → 侧栏 **API** → 创建（明文只显示一次）  

```bash
curl -X POST "https://image.namooca.com/api/v1/upload" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@/path/to/photo.jpg"
```

成功响应含 `url`（形如 `…/api/rfile/<uuid>.png`）。更多说明见后台 API 页。

---

## 文档索引

| 文件 | 内容 |
|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 版本与变更历史 |
| [tasks/handoff.md](./tasks/handoff.md) | Agent/开发者交接（陷阱、架构、下一步） |
| [tasks/todo.md](./tasks/todo.md) | 阶段勾选与 backlog |
| [docs/manage.md](./docs/manage.md) | 原始部署图文（D1/R2/环境变量） |

---

## 运维提示

- TG 频道内文件：**后台删除不会从 Telegram 抹掉**，只删站内记录。要「删了就 404」请用 R2。  
- 监控 Pages 部署请用 GitHub **check-runs**（status 可能一直 pending）。  
- 安全与架构细节、禁止事项见 `tasks/handoff.md`。

---

## 上游与许可

本项目 fork 自 [x-dr/telegraph-Image](https://github.com/x-dr/telegraph-Image)。  
上游 Demo / Star History 见原仓库。

---

*Last docs sync: 2026-07-10*
