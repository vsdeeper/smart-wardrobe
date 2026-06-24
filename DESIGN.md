---
name: 凡衣橱 · Botanica & Steel
description: 有机温暖的智能衣橱 — 叶绿与钢蓝，阳光温室般的移动策展体验
colors:
  primary: '#366b00'
  primary-pressed: '#2d5a00'
  primary-container: '#7bc043'
  primary-accent: '#92d959'
  on-primary: '#ffffff'
  secondary: '#b0c4de'
  secondary-text: '#4d6077'
  secondary-container: '#cde1fc'
  tertiary: '#ffb74d'
  tertiary-container: '#e5a139'
  surface: '#f5f7f8'
  surface-elevated: '#ffffff'
  surface-dim: '#ebeff2'
  surface-container: '#daeaf7'
  on-surface: '#36454f'
  on-surface-muted: '#6a7a87'
  on-surface-variant: '#4f606d'
  outline: '#c4ccd2'
  tag-bg: '#e8f2ff'
  tag-text: '#5b9bd5'
  image-placeholder: '#fafaf9'
  error: '#ba1a1a'
typography:
  display:
    fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  headline:
    fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: '"Be Vietnam Pro", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-lg:
    fontFamily: '"Be Vietnam Pro", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '"Be Vietnam Pro", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.05em
rounded:
  sm: 4px
  DEFAULT: 8px
  md: 12px
  lg: 16px
  xl: 24px
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-padding: 20px
  gutter: 16px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.full}'
    height: 52px
    padding: '0 16px'
  button-primary-active:
    backgroundColor: '{colors.primary-pressed}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.full}'
  button-secondary:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.full}'
    height: 52px
    padding: '0 16px'
  chip-default:
    backgroundColor: '{colors.secondary-container}'
    textColor: '{colors.secondary-text}'
    rounded: '{rounded.full}'
    padding: '4px 12px'
  card-wardrobe:
    backgroundColor: '{colors.surface-elevated}'
    rounded: '{rounded.lg}'
  input-field:
    backgroundColor: '{colors.surface-elevated}'
    rounded: '{rounded.DEFAULT}'
    padding: '8px 16px'
  tab-filter-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.full}'
    padding: '8px 22px'
  tab-filter-inactive:
    backgroundColor: '{colors.surface-elevated}'
    textColor: '{colors.on-surface-muted}'
    rounded: '{rounded.full}'
    padding: '8px 22px'
---

# Design System: 凡衣橱 · Botanica & Steel

## Overview

**Creative North Star: "阳光温室"**

凡衣橱的视觉体系像一座现代玻璃花房：阳光通透、植物生机、陈列精心。界面为衣物与造型服务——摄影占主导、留白充裕、操作退后。气质是有触感的策展，而非冷峻的工具效率或快时尚促销。

设计拒绝纯黑、硬边框与工业僵硬感；深度靠色调分层与钢蓝染色的环境光阴影传达。移动端单手操作、大触控目标、出门前 30 秒完成核心任务，是布局与交互的默认假设。

**Key Characteristics:**

- 衣物先行：卡片内图片占 ~80%，文字与标签克制
- 花与天空色板：深橄榄绿主色 + 钢蓝容器 + 有限琥珀点缀
- 柔和有触感：大圆角（卡片 16px、按钮胶囊形）、无嵌套卡片
- 环境光阴影：30px 扩散、钢蓝染色，禁止纯黑硬阴影
- 双字体配对：Plus Jakarta Sans 标题 + Be Vietnam Pro 正文

## Colors

「花与天空」色板——生机绿与通透蓝，而非大地褐或 SaaS 奶油底。

### Primary

- **深橄榄绿 (Deep Olive Leaf)** (#366B00)：Tab 激活态、FAB、块级 CTA、主操作。象征成长与能量，是品牌最稳定的识别色。
- **叶绿色 (Vibrant Leaf)** (#7BC043 / #92D959)：AI 进度、活跃点缀、primary-container。用于强调但不抢衣物摄影的主场。
- **按压橄榄 (Pressed Olive)** (#2D5A00)：主按钮 `:active` 态。

### Secondary

- **钢蓝 (Steel Blue)** (#B0C4DE)：环境阴影染色、次要容器氛围、低调对比。
- **钢蓝文字 (Steel Slate)** (#4D6077)：次要图标与 Chip 文字。
- **浅钢蓝容器 (Pale Steel Container)** (#CDE1FC)：Chip 默认填充、标签背景。

### Tertiary

- **琥珀暖 (Warm Amber)** (#FFB74D / #E5A139)：收藏标记、警告点缀。**使用范围有限**，不可成为界面主色。

### Neutral

- **雾面底 (Mist Surface)** (#F5F7F8)：页面背景，偏冷灰白，减少视觉疲劳。
- **纯白卡片 (Elevated White)** (#FFFFFF)：卡片、输入框、对话框表面。
- **浅雾层 (Dim Surface)** (#EBEFF2)：AI 状态条、浅底输入区。
- **深炭灰 (Slate Charcoal)** (#36454F)：正文主色，**禁止纯黑** (#000)。
- **-muted 石板 (Muted Slate)** (#6A7A87)：次要说明、placeholder、分类标签。
- **-outline 雾线 (Mist Outline)** (#C4CCD2)：Chip 描边、分割线、禁用态。

### Named Rules

**The Garment First Rule.** 主色绿在任意一屏占比 ≤15%。它的稀缺让 CTA 可识别；衣物摄影才是视觉主角。

**The No Pure Black Rule.** 文本、图标、阴影一律使用石板灰或钢蓝染色，禁止 `#000` 与纯黑 `box-shadow`。

## Typography

**Display Font:** Plus Jakarta Sans（PingFang SC、Microsoft YaHei 回退）
**Body Font:** Be Vietnam Pro（PingFang SC、Microsoft YaHei 回退）

**Character:** 标题几何精致、略带趣味；正文当代亲和、行高充裕 (1.6)。配对轴是「编辑标题 + 人文正文」，避免双几何 sans 撞车。

### Hierarchy

- **Display** (600, 32px, 1.2, -0.02em)：页面主标题（如「个人衣橱」），居中、杂志感。
- **Headline** (600, 24px, 1.3)：区块标题、CTA 卡片标题。
- **Title** (500, 20px, 1.4)：卡片名称（大卡片 20px）、对话框标题。
- **Body** (400, 16px, 1.6)：正文、说明、列表次要信息。长文段落上限 65–75 字符宽。
- **Body Large** (400, 18px, 1.6)：强调段落、试穿页提示。
- **Label** (500, 13px, 0.05em letter-spacing)：分类标签、Chip、表单 label-sm。

### Named Rules

**The Heading-Only Display Rule.** Plus Jakarta Sans 仅用于 h1–h4 与按钮文字；数据、标签、表单一律 Be Vietnam Pro。

## Elevation

混合策略：**色调分层为主，环境光阴影为辅**。卡片从 `#F5F7F8` 底过渡到 `#FFFFFF` 面；交互元素在 active 时略缩放 (0.95–0.98)，不靠弹跳动画。

### Shadow Vocabulary

- **Card Ambient** (`0 0 30px rgba(176, 196, 222, 0.08)`): 衣橱卡片、全局 `.card` 默认。
- **Raised Ambient** (`0 0 30px rgba(176, 196, 222, 0.12)`): 略抬升容器。
- **FAB Lift** (`0 8px 24px rgba(54, 107, 0, 0.3)`): 浮动添加按钮，主色染色。
- **Tab Bar Glow** (`0 -10px 40px rgba(176, 196, 222, 0.15)`): 底栏上方环境光。

### Named Rules

**The No Hard Border Rule.** 卡片与容器默认无边框；边缘靠色彩偏移与柔和阴影界定。Chip 与次要按钮是例外（1px outline 色描边）。

**The Ambient-Only Shadow Rule.** 阴影必须扩散 ≥30px、不透明度 ≤20%、钢蓝或主色染色。若看起来像 2014 年 App 的硬阴影，则 blur 太小或颜色太深。

## Components

### Buttons

- **Shape:** 胶囊形 (`border-radius: 9999px`)；块级 CTA 高度 52px。
- **Primary:** 深橄榄绿底 (#366B00) + 白字 + FAB 阴影；`:active` 透明度 0.92 + scale(0.98)。
- **Secondary:** 白底 + 1px outline 描边 + 深炭灰字。
- **Inline CTA（衣橱 AI 卡片内）:** 白底胶囊 + 橄榄绿字，嵌于 saturated primary 容器内。
- **Dialog 确认/取消:** 36px 高胶囊，取消描边、确认主色实心。

### Chips

- **Style:** 钢蓝容器填充 (#CDE1FC) + 钢蓝文字；或 1px dashed 虚线「添加」变体 (#5B9BD5)。
- **Shape:** 胶囊 / 8px 小圆角 Tag；高度 ~20px，13px label 字重 500。

### Cards / Containers

- **Wardrobe Card:** 16px 圆角、白底、Card Ambient 阴影、**无边框**；1:1 图片区 + 紧凑文字区。
- **AI Styling CTA Card:** 2 列宽 span、深橄榄绿底、装饰性低透明度图标、内嵌白底 CTA 按钮。
- **Corner Style:** 卡片 16px (`--sw-radius-card`)；CTA/面板可用 24px。
- **Internal Padding:** 卡片 body 16px；区块间距 40px (`xl`)。

### Inputs / Fields

- **Style:** 白底或浅雾底 (#EBEFF2)、1px outline 描边、8px 圆角；NutUI Input 包在 `.sw-field-input` 外壳内。
- **Label:** 字段上方 label-sm (13px)，颜色 `#6A7A87`。
- **Focus:** 边框色略加深或背景略亮；禁止霓虹 glow。
- **Disabled:** 透明度 0.5，描边与文字同步 muted。

### Navigation

- **Tab Bar:** 固定底栏，白底 + Tab Bar Glow；活跃项主色绿点缀 (#88C057)。
- **Filter Tabs:** NutUI `activeType="button"` 胶囊筛选；激活 = 深橄榄绿实心 + 白字；非激活 = 白底/浅钢蓝底 + muted 字。
- **FAB:** 56px 圆形，主色绿 + FAB Lift 阴影，右下角固定于 TabBar 上方。

### Wardrobe Item Card（签名组件）

衣橱视觉核心：2 列网格、大/宽卡片 span 2 列；图片占卡片 ~80%；分类 label-sm muted、名称 heading 字重；横向滚动 Tag 行。

## Do's and Don'ts

### Do:

- **Do** 让衣物摄影成为每屏最大视觉元素；自然光、生活场景、散景背景。
- **Do** 使用 `#36454F` 正文与 `#F5F7F8` 底，保持 ≥4.5:1 对比度。
- **Do** 用 40px 区块间距与 20px 侧边距建立呼吸感；居中页面标题强化杂志感。
- **Do** 主操作统一为 `.sw-btn--primary` / `.sw-fab` / 胶囊 Tab 筛选，全 App 一致。
- **Do** 为空衣橱、加载中、错误态提供具体文案与下一步操作（见 onboard 原则）。

### Don't:

- **Don't** 采用泛 SaaS 风：奶油底、渐变英雄区、大数字 KPI 模板、每节 tracked eyebrow。
- **Don't** 采用快时尚电商风：促销横幅、密集商品网格、刺眼红价签、限时抢购紧迫感。
- **Don't** 采用冷硬科技风：纯黑深色模式、霓虹渐变、机器人图标堆砌、AI 炫技压过衣物。
- **Don't** 使用 `border-left` 大于 1px 的彩色侧条装饰卡片或列表项。
- **Don't** 嵌套卡片；一层容器 + 色调/阴影分层即可。
- **Don't** 在 ScrollView 内用 NutUI `Button` 做高度定制 CTA；用 `View` + `Text` + `onClick`（`.sw-btn` 模式）。
- **Don't** 使用纯黑阴影或硬边框替代环境光阴影体系。
