# image-host 整改方案

> 2026-07-09 评估结论落地。目标：从"随时可被攻破"到"可公开上线"，并清偿核心技术债。

## 核心决策（已拍板，可否决）

1. **方向**：分阶段推进，先在现有 `@cloudflare/next-on-pages` 架构上止血加固，再独立迁移 OpenNext。不一步到位大重构，每阶段可独立验证、可回滚。
2. **产品定位**：R2 + TG 频道作为主存储；telegraph/58/tencent/vviptuangou 降级为"环境变量开启的可选 fallback"，默认关闭、UI 不暴露。保留代码能力，但默认不给用户用——规避合规与稳定性风险，又不丢功能。
3. **next-auth**：升级到 v5 最新版（优先 stable；若仍仅 beta 则取最新 beta，不退回 v4——重写 auth.js 成本高于收益）。
4. **R2 文件名**：`crypto.randomUUID() + 原扩展名`，禁止用户原始文件名做 key（防覆盖/路径注入）。
5. **上传限制**：服务端强制 `≤5MB` + MIME 白名单（`image/*`、`video/*`），前端文案与后端校验对齐。

## 阶段计划

### 阶段 0 · 止血（0.5 天）
- [x] 删 `src/auth.js:57` 的 JWT secret fallback（`secret: process.env.SECRET`，next-auth 自身 fail-fast）
- [x] 删 `src/app/page.js:142` 的 `setUploadStatus('')`（未定义的 setter，点清除必崩）
- [x] 排查 build 卡死：根因 = Node 22 + Next 14.2.5 build worker 不兼容（社区已知 [GitHub #67474](https://github.com/vercel/next.js/discussions/67474)），清缓存/禁 telemetry 均无效，阶段 2 升级 next 解决。不阻塞生产（CF Pages 用独立构建环境）
- 验证：lint exit 0 / setUploadStatus 已删 / JWT fallback 已删（next-auth fail-fast）/ build 根因已定位

### 阶段 1 · 清零 SQL 注入 + 抽公共层（1 天）
- [x] 新建 `src/lib/db.js`（全参数化：insertImgInfo/getRating/incrementTotal/updateRating/deleteImgInfo/searchImgInfo/searchLogs/countImgInfo）
- [x] 新建 `src/lib/http.js`（corsHeaders/jsonOk/jsonErr 脱敏/getClientIp 移除 socket/getReferer）
- [x] 新建 `src/lib/time.js`（nowTime 收口 9 处复制，格式阶段 6 改 ISO）
- [x] 替换 13 路由拼接 SQL：admin×4 + file/cfile/rfile×3 + 上传×6 全部改完，grep 确认无带插值的 prepare 拼接
- [x] 输入校验：delete 的 name、block 的 rating 已校验；page 用 toPage 兜底；query 经 .bind() 安全
- 验证：`grep -rn 'prepare(\`' src/app/api` 无残留拼接；admin 搜索/删除/封禁/日志功能正常

### 阶段 2 · 依赖升级（1 小时）
- [x] next 14.2.5 → 14.2.35（修 3 high CVE：Cache Poisoning/图片 DoS/Server Actions DoS）
- [x] next-auth beta.19 → beta.31（修 @auth/core 漏洞，lint 兼容）
- [x] wrangler dependencies → devDependencies（3.65→3.114）
- [~] npm audit fix：next-on-pages 1.13.16 要 next 15+ 与 14.2.35 冲突，跳过；传递依赖漏洞待阶段 5 移除 next-on-pages 清理
- 验证：lint exit 0 / build 仍卡（Node 22+Next 14.x，不阻塞生产）/ 漏洞 48→47

### 阶段 3 · 纵深防御（0.5 天）
- [x] admin 4 路由加 auth() 二次鉴权（防 middleware 绕过）
- [x] 上传校验：58img/vviptuangou/r2/tgchannel 加 size(≤5MB)+MIME(image/video)；tg/tencent 透传加注释
- [x] R2 key 改 uuid（crypto.randomUUID()+ext，put/imginfo/响应三处一致）
- [x] 错误响应 jsonErr 脱敏（阶段 1 已做）
- [x] 凭据比较改 safeEqual（纯 JS 常量时间，edge 无 crypto.timingSafeEqual）
- 验证：lint exit 0；运行时验证（403/拒大文件）待部署
- ⚠️ tgchannel 原 audio/pdf 支持被新 MIME 校验收窄为 image/video，待确认是否放宽

### 阶段 4 · 存储闭环与功能 bug（0.5 天）
- [x] 修 cfile 计数 bug（阶段 1 顺带，logRequest 改用 incrementTotal('/cfile/...')）
- [x] 修 3 处 error.message 空引用（阶段 1 改 jsonErr 顺带消失）
- [x] 修 r2 路由 TDZ（阶段 1 改用 lib corsHeaders 顺带消失）
- [x] 修 tg/r2/tgchannel 内层 catch 引用 try 内 time 的 ReferenceError（time 声明提到 try 前）
- [x] admin/delete 联动删 R2 对象（/rfile/ 前缀解析 key 调 env.IMGRS.delete，IMGRS 未配则跳过）
- [x] vviptuangou 凭证移环境变量（Sign/Token 读 env，Timestamp 改 Date.now()）
- 验证：lint exit 0；运行时验证待部署

### 阶段 5 · 迁移 OpenNext（1 天）— 风险最高，独立阶段
- [ ] 实施前确认：OpenNext 下 D1/R2 binding 访问方式（`getRequestContext` vs `env` 参数）
- [ ] 装 `@opennextjs/cloudflare` + 配置 `open-next.config.ts`
- [ ] 适配 binding 访问（可能涉及 lib 层签名调整）
- [ ] 改 build/deploy 命令
- [ ] 预览环境全功能验证
- [ ] 切换生产，保留 next-on-pages 分支可回滚
- 验证：build 不卡 / 上传读取删除后台全功能正常 / pages.dev 跳转仍生效

### 阶段 6 · 性能与工程化（1-2 天）
- [ ] `file`/`cfile`/`rfile` 统一 `Cache-Control` + 完善 `caches.default`（rfile/cfile 已有 cache API；缺响应头；file 待补）← **下一步**
- [ ] 首页拆 client/server 边界（统计、登录态服务端取数）
- [ ] R2 上传 API 强制鉴权（ENABLE_AUTH_API=false 时未登录仍可 POST `/api/enableauthapi/r2`）
- [x] 补 Top20 统计 API + 后台 Tab
- [x] 加 `.github/workflows`（lint + build）
- [x] 清理死代码（ImageModal、admin/ip、console 部分清理）
- [x] 前端拆 `UploadPanel`/`UploadQueue`/`ResultLinks`/`ProviderSelect`
- [x] 拖拽区 a11y（tabIndex/role/键盘回退）
- [x] 上传源 UI 收敛：默认仅 R2 + TG_Channel，未登录提示需登录
- [x] admin useCallback 依赖数组补齐
- [x] 生产验证通过（登录上传 / 预览链接 / 统计 Tab / 清理测试图）— 2026-07-09
- 验证：分发接口命中缓存 / 首屏不再串行 3 个 API / 后台统计 Tab 可用

## 风险与对策

- **迁移 OpenNext 风险最高**：单独阶段 5，预览环境充分验证后再切生产，保留 next-on-pages 分支可回滚。
- **next-auth 升级可能破坏 session**：升级后清 cookie 重测全流程。
- **参数化替换遗漏**：阶段 1 用 `grep` 兜底，确保无 `${` 进 `prepare`。

## 实施前需确认的点（动手时第一件事查证）

1. next-auth v5 当前 stable 状态（影响阶段 2 选版）— 阶段 2 已取 beta.31
2. OpenNext Cloudflare 的 D1/R2 binding 访问 API（影响阶段 5）
3. `admin/list` 的 `page` 是 0-based 还是 1-based（影响阶段 1 分页计算）— 已按 0-based 处理

## 时间预估

- 阶段 0-4 约 **2.5 天**（上线红线，做完即可公开上线）✓
- 阶段 5-6 约 **2-3 天**（技术债清偿，可随后迭代；6 大部分完成）
