# image-host 整改与迭代 Todo

> 2026-07-09 启动安全/工程整改；**2026-07-10 收工**。详细变更见 `CHANGELOG.md`。

## 核心决策（已拍板）

1. 先 `@cloudflare/next-on-pages` 止血，OpenNext **单独周期**。
2. 主存储 **R2 + TG 频道**；其它图床默认不暴露 UI。
3. next-auth 留在 v5 最新 beta（当前 beta.31），不退 v4。
4. R2 key = `uuid + 扩展名`。
5. 上传 ≤ **20MB** + MIME 白名单。

---

## 阶段 0–4 · 安全与闭环 — **全部完成**

见历史勾选与 `CHANGELOG.md` [Unreleased] 之前的 0.x 整改提交。摘要：

- [x] JWT fail-fast、崩溃 setter、SQL 全参数化、`src/lib` 公共层  
- [x] next 14.2.35、next-auth beta.31、admin 二次鉴权、safeEqual  
- [x] 上传校验、R2 uuid、delete 联动 R2 + 缓存、凭证出环境变量  

---

## 阶段 5 · OpenNext — **未做（独立大周期）**

- [ ] 调研 OpenNext 下 D1/R2 binding API  
- [ ] 装 `@opennextjs/cloudflare` + 配置  
- [ ] 改 route / 去 edge runtime / 构建命令  
- [ ] 预览验证后切生产，保留 next-on-pages 回滚分支  

---

## 阶段 6 · 工程化与体验 — **大部分完成**

- [x] Cache-Control + caches.default（rfile/cfile/file）  
- [x] 首页 RSC + HomeClient（去掉首屏三连 API）  
- [x] R2/TG 上传强制登录  
- [x] Top20 统计 + CI  
- [x] 前端拆组件 + a11y + 上传源收敛  
- [x] 上传 20MB；PDF/音频/Office/EPUB；文档自动切 TG  
- [x] time ISO8601 + formatTimeDisplay  
- [x] 后台 A+C：侧栏、筛选、列表/网格、侧栏固定滚动、返回前台  
- [x] mime/kind 权威类型  
- [x] 开放 API Key 上传 + 后台 API 页 + 文档澄清  

---

## 下一迭代（未开始）

### 阶段 8 · 文件资产与访问洞察 — **规格已确认，待实现**

完整产品规格见 [`docs/admin-insights-spec.md`](../docs/admin-insights-spec.md)。首期目标是让后台回答“资产规模、访问热度、可操作的文件详情和数据完整度”，而不是堆叠无决策价值的图表。

- [ ] 概览：资产/KPI、30 天访问趋势、类型与存储分布、热门与待关注资源
- [ ] 资源：URL 同步筛选/分页、按 PV/最近访问/体积排序、点穿筛选
- [ ] 详情抽屉：预览、元数据、访问摘要、来源、操作与移动端全屏态
- [ ] 新上传：记录 `size_bytes`、规范化 MIME/kind 与元数据采集状态
- [ ] 历史补全：以可恢复任务逐步补齐文件大小与可提取的技术属性
- [ ] 数据治理：元数据覆盖率、类型不明、长期未访问和异常访问候选
- [ ] 验收：指标口径、空状态、范围筛选、移动端及 D1 查询性能符合规格

### 后台 P2（并入阶段 8）

- [ ] 批量删除 / 批量拉黑（在资源中心稳定后评估）

### API 增强（需求出现再做）

- [ ] 按 Key 限流  
- [ ] API 上传日志  
- [ ] 可选 `storage=tg`  

### 卫生

- [ ] 删除无引用 `src/components/Table.jsx`  
- [ ] 清理残留 `console`  
- [ ] 决定 `design-previews/` 是否纳入 Git  

---

## 阶段 7 · 上传信任与分发性能（完成）

- [x] 登录前上传 CTA、存储去向说明与 TG 确认
- [x] 文件队列状态、失败重试、结果一键复制与交互可访问性
- [x] 媒体拉黑改为真实管理员会话判定
- [x] D1 索引迁移，移除运行时 DDL/历史回填
- [x] R2/TG 媒体日志异步化，TG 文件流式转发
- [x] 本地 Cloudflare 开发平台与验证覆盖

---

## 验证约定

- lint：`npm run lint`  
- 部署：push main → CF check-runs `completed/success`  
- 勿本地 `next build`（Node 22 + Next 14）

---

## 阶段 7 验收记录（2026-07-10）

- `npm run verify:p0-p1`、`npm run lint`、`git diff --check` 通过。
- 本地 D1 迁移已应用并确认无待执行项；索引与三张表均存在。
- 本地 R2 端到端：普通用户上传 200；预热缓存后拉黑资源，带 Referer 的匿名请求 302、管理员会话 200、Range 读取 206；删除后同一 URL 404。
- 浏览器验收：登录前 CTA、TG 后果确认与确认后选中状态通过；390px 宽度无横向溢出，控制台无错误。
