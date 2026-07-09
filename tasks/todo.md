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

### 后台 P2

- [ ] URL 同步筛选/分页（可分享、刷新不丢）  
- [ ] 批量删除 / 批量拉黑  
- [ ] 统计 Top 点穿回资源/日志  
- [ ] 详情抽屉增强  

### API 增强（需求出现再做）

- [ ] 按 Key 限流  
- [ ] API 上传日志  
- [ ] 可选 `storage=tg`  

### 卫生

- [ ] 删除无引用 `src/components/Table.jsx`  
- [ ] 清理残留 `console`  
- [ ] 决定 `design-previews/` 是否纳入 Git  

---

## 验证约定

- lint：`npm run lint`  
- 部署：push main → CF check-runs `completed/success`  
- 勿本地 `next build`（Node 22 + Next 14）  
