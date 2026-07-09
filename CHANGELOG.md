# Changelog

本项目（image-host / image.namooca.com）的变更记录。  
格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号按迭代日归档。

---

## [Unreleased]

### Added

- **文件资产与访问洞察后台**：默认概览显示受管文件数、容量覆盖、7/30 天 PV、独立 IP、活跃文件、趋势、类型/存储分布、热门资源与治理候选。
- **资源详情抽屉**：预览、文件属性、访问趋势、主要来源和安全的管理动作；移动端为全屏体验。
- **历史 R2 元数据补全**：管理员可小批量读取对象头补齐文件大小；界面明确区分可补全的 R2 与暂不可得的 TG 历史大小。
- D1 `0002_admin_insights.sql`：`size_bytes` / 元数据状态字段、访问时间索引，以及历史中文时间规范化。

### Changed

- 资源列表与概览统一按最新 URL 去重，避免历史重复元数据造成文件数和访问洞察不一致。
- 新的 R2/TG 上传会记录可信的文件大小、规范 MIME/kind 与采集状态。

### Planned

- 后台 P2：批量操作
- API：限流、上传日志、可选发 TG  
- OpenNext 迁移（独立周期）  
- 死代码清理（旧 `Table.jsx` 等）  

---

## [2026-07-10] — 开放 API · 后台打磨 · 文档收工

### Added

- **开放上传 API**：`POST /api/v1/upload`  
  - 鉴权：`Authorization: Bearer ih_…` 或 `X-API-Key`  
  - 落 **R2**，写入 `imginfo`，后台资源可见  
  - 完整上传 URL：`https://image.namooca.com/api/v1/upload`（Base URL 仅为站点根）  
- **API Key 管理**：D1 表 `api_keys`（仅存 SHA-256）；后台侧栏「API」创建/禁用/删除  
- 内嵌 API 文档（curl / n8n 说明）；文档澄清 Base URL vs 上传 URL  
- 共享模块：`src/lib/apiKeys.js`、`src/lib/uploadR2.js`  

### Changed

- R2 白名单扩展：可存音频 / PDF 等（便于 API 统一）  
- 后台顶栏去掉桌面端重复「返回前台」（保留侧栏 + 移动端入口）  
- 后台布局：侧栏固定，仅主内容区滚动  

### Fixed

- （续）侧栏随页面滚动问题  

### Docs

- 更新 `tasks/handoff.md`、`tasks/todo.md`、`README.md`  
- 新增本 `CHANGELOG.md`  

---

## [2026-07-09] — 安全整改 · 产品增强 · 后台重做

### Added

- `src/lib` 公共层：`db` / `http` / `time` / `mime` / `mediaMeta`  
- 首页 RSC + `HomeClient`；上传组件拆分  
- 上传类型：PDF、音频、EPUB、Word/Excel/PPT；上限 **20MB**  
- 文档类选择时自动切换 **TG_Channel**（发频道 + 进后台）  
- 后台 A+C：侧栏资源/日志/概览、来源/类型/状态筛选、列表↔网格  
- `imginfo.mime` / `kind` 列；上传写入真实类型  
- Top20 统计、GitHub CI、Cache-Control + edge cache  

### Security

- SQL 注入清零（全 `.bind()`）  
- JWT `SECRET` 无 fallback  
- next 14.2.35 / next-auth beta.31  
- admin 路由二次 `auth()`  
- R2/TG 上传强制登录；safeEqual（charCodeAt）  

### Fixed

- cfile Content-Type（魔术字节）  
- R2 删除 + 清 edge 缓存  
- 图片筛选漏掉无扩展名 cfile  
- PDF 文件选择器 accept  
- isAuth 误判（按 role）  

### Changed

- 默认上传存储改为 **R2**  
- `nowTime()` 改为 ISO8601（+08:00）  

---

## 更早

- 基于 [x-dr/telegraph-Image](https://github.com/x-dr/telegraph-Image) 初始部署与 D1/R2/TG 绑定  
- pages.dev → 自定义域 301 等  

见 `git log` 完整历史。  
