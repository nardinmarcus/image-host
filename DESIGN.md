# Namoo Pix · 设计系统（Soft Studio 方向）

> 选定方向：C · 柔光工坊。本文件是所有前台页面和后续会话的唯一设计事实源。
> 改风格 = 先改本文件。2026-07-10 确立。

## 1. 视觉主题与氛围

温暖友好的图床工具。极浅冷调背景配薄荷绿强调色，大圆角卡片，柔和彩色阴影。
气质介于 Figma（工具精确感）和 Airtable（消费产品亲和力）之间。
不是冷冰冰的科技工具，是一个让人想用的个人图床。

## 2. 色板与角色

| 角色 | Token | 值 | 用途 |
|------|-------|-----|------|
| 背景 | bg-base | `#f8fafc` (slate-50) | 页面底色 |
| 卡面 | bg-surface | `#ffffff` | 卡片、弹层、输入框 |
| 主文字 | text-primary | `#0f172a` (slate-900) | 标题、正文 |
| 次文字 | text-secondary | `#64748b` (slate-500) | 说明、meta |
| 弱文字 | text-muted | `#94a3b8` (slate-400) | 占位、极次要 |
| 品牌色 | accent | `#0d9488` (teal-600) | 主按钮、强调、链接 |
| 品牌悬停 | accent-hover | `#0f766e` (teal-700) | hover 态 |
| 品牌浅底 | accent-light | `#f0fdfa` (teal-50) | 轻量背景、active tab |
| 品牌环 | accent-ring | `#5eead4` (teal-300) | focus ring |
| 边框 | border | `#e2e8f0` (slate-200) | 默认边框 |
| 危险 | danger | `#ef4444` (red-500) | 仅清除/删除 |
| 成功 | 用品牌色 | teal-600 | 上传成功 toast |

**色彩铁律**：品牌色 teal-600 是全站唯一强调色。禁止 blue-500 / green-500 作为 UI 主色。
危险色 red-500 仅出现在「清除」「删除」操作，且用次要样式（描边或浅底），不做大红按钮。

## 3. 排版规则

**字体**：Plus Jakarta Sans（拉丁/数字）+ 系统栈（中文）
```css
font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
  "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

| 角色 | 字号 | 字重 | letter-spacing |
|------|------|------|----------------|
| 品牌名 | 22px | 800 | -0.02em |
| 页面标题 | 28-32px | 800 | -0.03em |
| 区块标题 | 18px | 700 | -0.01em |
| 正文 | 15px | 500 | normal |
| 说明/meta | 13px | 500 | normal |
| 数字 | 继承 | 继承 | tabular-nums |

**中文规则**：正文 ≥ 14px，行高 1.6，字重只用 400/500/600/700/800，中西文之间加空格。

## 4. 组件样式

### 按钮
- **主按钮**：`bg-teal-600 text-white rounded-xl px-6 py-3 font-semibold shadow-[0_4px_14px_rgb(13_148_136/0.25)]`
  hover: `bg-teal-700`；active: `scale(0.97)`
- **次按钮**：`bg-white text-slate-700 rounded-xl px-6 py-3 font-semibold border border-slate-200 shadow-sm`
- **危险按钮**：`bg-white text-red-500 rounded-xl border border-red-200`（不做大红实心）
- **图标按钮**：`rounded-xl w-9 h-9`，白底 + slate 边框，hover teal 浅底

### 卡片
- 圆角：`rounded-2xl`（16px）到 `rounded-3xl`（24px）
- 阴影：`shadow-[0_2px_12px_rgb(15_23_42/0.06)]`（浅）到 `shadow-[0_4px_24px_rgb(15_23_42/0.08)]`（深）
- 边框：`border border-slate-200/60`（半透明，更柔和）

### 输入 / Select
- `rounded-xl border border-slate-200 bg-white px-4 py-2.5`
- focus: `border-teal-500 ring-2 ring-teal-200`

### Tabs
- Pill 式：active = `bg-teal-50 text-teal-700 rounded-lg`；inactive = `text-slate-500 hover:text-slate-700`

### 拖拽区
- `rounded-3xl border-2 border-dashed border-slate-300 bg-white`
- 空态居中提示，hover 时 `border-teal-400 bg-teal-50/30`

## 5. 布局原则

- 容器宽度：`max-w-2xl`（672px）居中——图床不需要宽屏
- 顶栏不固定、融入内容流（P-15），sticky on scroll
- 内容垂直方向有呼吸感，主区域 `py-8` 到 `py-12`
- 移动端：单列、按钮全宽、拖拽区全高

## 6. 深度层级（阴影栈）

```css
--shadow-sm: 0 1px 3px rgb(15 23 42 / 0.06);
--shadow-md: 0 4px 16px rgb(15 23 42 / 0.08);
--shadow-brand: 0 4px 14px rgb(13 148 136 / 0.25);  /* 品牌色染色 */
--shadow-card: 0 2px 12px rgb(15 23 42 / 0.06);
```

阴影用**染色**写法（底色调色调），不用纯灰单层。

## 7. Do's / Don'ts

**Do**：teal 是唯一强调色；大圆角（≥12px）；染色阴影；充足留白；
focus 用 teal 环；按钮有 `scale(0.97)` 按压反馈。

**Don't**：blue-500/green-500 做 UI 主色；锐角直角；大红实心按钮；
固定头尾栏吃屏幕；多种圆角混用；`transition: all`。

## 8. 响应式

- `> 768px`：居中 max-w-2xl，两列操作栏
- `< 768px`：全宽单列，按钮全宽堆叠，拖拽区 min-height 200px

## 9. Motion 哲学

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```
- 按压反馈 100ms scale(0.97)
- hover 颜色/阴影 150ms
- 弹窗 200ms ease-out，scale(0.95→1)
- 退出比进入快
- `prefers-reduced-motion` 兜底
- hover 动效包 `@media (hover: hover) and (pointer: fine)`

## DNA 注入来源

- **Figma**：pill/大圆角按钮几何（rounded-xl 以上）；dashed-border dropzone 呼应选择手柄
- **Airtable/Stripe**：多层染色阴影栈（`0 1px 3px` + `0 4px 16px`），底色调色调
- **Plus Jakarta Sans**：weight 800 做品牌/标题（粗壮但圆润，不攻击性）

## 工艺密度清单（≥5 项）

1. ✅ 氛围层：body 微妙冷调渐变底（< 3%）
2. ✅ `::selection` 定制：teal-tinted 选中色
3. ✅ 品牌 focus 环：teal-200 ring
4. ✅ 多层染色阴影：teal-tinted shadow on primary button
5. ✅ 自定义滚动条：细窄 + teal-tinted thumb
6. ✅ 按压反馈：scale(0.97) on interactive elements
