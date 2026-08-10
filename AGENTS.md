# AGENTS.md

> AI 对话语言默认使用中文简体。

面向在本仓库工作的 AI 编码代理的操作指南。与 `CLAUDE.md` 内容一致，并补充可执行命令与约束。

## 概述与适用范围

智能衣橱（Smart Wardrobe）是基于 Taro 4.2 的跨平台小程序应用，结合 AI 打造个人化衣橱体验。技术栈：React 18、TypeScript 5.1、NutUI React Taro 2.6、Sass、Vite + SWC，包管理器为 pnpm。主要目标平台为微信小程序，亦支持 H5 及其他小程序平台。

本文件适用于仓库根目录下的全部源码（`src/`、`config/`、`types/`、`cloudfunctions/`）。当前为单包项目，无嵌套 `AGENTS.md`；若日后在子目录新增，以距离被编辑文件最近的 `AGENTS.md` 为准。

## 代理角色

- **角色**：熟悉 Taro + React + 小程序生态的前端工程师，能按现有约定扩展页面与组件。
- **对话语言（必须遵守）**：默认使用**简体中文**与用户对话，并以简体中文撰写代码注释、commit message、PR 描述；除非用户在当次对话中明确要求切换到其他语言。
- **允许**：在 `src/` 下新增/修改页面与样式；使用 NutUI 与 Taro API；运行开发构建与 lint；小范围、聚焦的改动。
- **禁止**：未经要求提交 git、强制推送、修改 git 配置；引入与任务无关的依赖或大重构；编辑 `node_modules/`、`dist/`、锁文件（除非用户明确要求）；猜测不存在的脚本或工具。

## 构建、测试与验证命令

在仓库根目录执行：

```bash
# 安装依赖
pnpm install

# 开发（微信小程序为主）
pnpm dev:weapp
pnpm dev:h5

# 生产构建
pnpm build:weapp
pnpm build:h5
```

其他平台构建/开发脚本见 `package.json` 的 `scripts`（`build:alipay`、`dev:tt` 等）。

```bash
# 代码检查与格式化
pnpm lint
pnpm format
```

`pnpm install` 会通过 `prepare` 脚本初始化 Husky；提交时 `pre-commit` 对暂存文件跑 lint-staged（ESLint + Prettier），`commit-msg` 由 commitlint 校验 Conventional Commits。

当前仓库**未配置**测试 runner 与 `test` 脚本；不要臆造测试命令。完整平台命令以 `package.json` 为准。

## 约定与模式

### 目录结构

```
src/
  app.ts              # 根组件（Taro 生命周期 hooks）
  app.config.ts       # 应用配置（路由、窗口样式）
  app.scss            # 全局样式
  index.html          # H5 入口
  pages/my-page/      # 页面，kebab-case（如 my-page、outfit-detail）
  pages/my-page/components/  # 页面私有组件（可选，大驼峰子目录）
  pages/wardrobe/     # 单词页面同样合法
  layouts/Main/       # 布局组件，目录名大驼峰
  components/AppNavbar/  # 跨页复用 UI，目录名大驼峰
  hooks/              # 可复用状态与副作用（kebab-case 文件名）
  services/           # 云/API 调用（kebab-case 文件名）
  utils/              # 纯函数（kebab-case 文件名）
  types/              # 跨模块业务类型（kebab-case 文件名）
  constants/          # 跨模块常量与枚举配置（kebab-case 文件名）
  styles/             # 全局主题等
config/
  index.ts            # Taro 构建（designWidth: 375）
  dev.ts / prod.ts
types/                # 环境/global 类型声明（如 global.d.ts），非业务 types
  global.d.ts
```

根目录 `types/` 仅放环境/global 声明；业务领域类型放 `src/types/`，勿混用。

### 全局目录命名规范

全局非组件文件 **kebab-case**（`-` 连接）；组件目录 **PascalCase**（大驼峰）。

| 职责 | 目录 | 文件命名 | 约束 |
|------|------|----------|------|
| 纯函数 / 格式化 | `src/utils/` | kebab-case，如 `format-date-time.ts` | 无 UI、无请求副作用 |
| 跨模块类型 | `src/types/` | kebab-case，如 `wardrobe.ts` | 仅类型导出 |
| 跨模块常量 | `src/constants/` | kebab-case，如 `wardrobe.ts` | 字面量、枚举配置 |
| 可复用 hooks | `src/hooks/` | kebab-case，如 `use-weather.ts` | 导出名仍为 `useWeather` |
| API / 云请求 | `src/services/` | kebab-case，如 `wardrobe.ts` | 不写 JSX |
| 全局样式令牌 | `src/styles/` | 主题/变量 | 组件样式 colocation |

- **禁止**新建 `src/data/`、`common/`、`misc/` 等无归属目录。
- 单组件/单页专属内容留在该目录内，勿提升到全局。

### 页面组织

- 页面目录：`src/pages/<page-name>/`，**目录名使用 kebab-case**（短横线连接，如 `my-page`、`outfit-detail`）；单词页面如 `wardrobe` 同样合法。
- 每个页面目录包含 `index.tsx`、`index.config.ts`、`index.scss`；复杂页面可增 `components/` 子目录（见「组件抽象与解耦」）。
- 必须在 `src/app.config.ts` 的 `pages` 数组中注册路径（如 `'pages/my-page/index'`）。
- 页面配置：同目录 `index.config.ts`，使用 `definePageConfig` 导出。

### 组件与样式

- 页面 UI **默认使用** `@nutui/nutui-react-taro`，优先复用 NutUI 组件，避免重复造轮子。
- NutUI 按需加载已由 `vite-plugin-imp` 配置，直接 `import` 即可。
- 样式文件：`*.scss`；`px` 会转为小程序 `rpx`（`nut-` 前缀选择器排除转换）。
- **组件样式收窄（通用，必须遵守）**：凡组件目录（`src/layouts/<Name>/`、`src/components/<Name>/`、`pages/<page>/components/<Name>/`）使用 `index.tsx` + **同目录** `index.scss`；该组件的 BEM/class 写在组件层，由组件 `import "./index.scss"`。**禁止**把组件样式散写到 `pages/<page>/index.scss`、`app.scss` 或其他无关文件（页面编排级布局/空态除外）。参考：[`src/pages/try-on/components/OutfitMeta/`](src/pages/try-on/components/OutfitMeta/)。

#### 自定义按钮

- **页面 CTA、卡片操作按钮等需自定义样式的可点击按钮**，优先使用 Taro `View` + `Text` + `onClick`，**不使用** NutUI `Button`。
- 原因：NutUI `Button` 在小程序端编译为原生 `button`，在 `ScrollView` 内易出现布局异常；自定义样式需大量覆盖 NutUI 默认样式（渐变背景、圆角、尺寸变量等），维护成本高。
- 参考实现：[`src/pages/try-on/components/WearCta/`](src/pages/try-on/components/WearCta/)（`View` + `Text` 页面 CTA）。
- **例外**：标准 NutUI 风格的功能按钮（如表单「提交」、对话框确认）可使用 NutUI `Button`；若样式异常，检查 `vite-plugin-imp` 是否引入组件 CSS，并用 `.nut-button` 组合选择器覆盖，勿仅用页面级 class。

#### 组件目录命名

- **布局组件**（`src/layouts/`）：目录名**大驼峰**，与 default export 组件名一致。示例：`src/layouts/Main/index.tsx` + `index.scss`；引入 `import Main from "@/layouts/Main"`。
- **通用组件**（`src/components/`）：同样大驼峰 + `index.tsx` / `index.scss`。示例：`src/components/WardrobeCard/index.tsx`；引入 `import WardrobeCard from "@/components/WardrobeCard"`。
- 布局级外壳放 `layouts/`，可复用 UI 块放 `components/`，二者目录结构一致、父目录不同。

#### 组件抽象与解耦（必须遵守）

- `pages/<page>/index.tsx` 为**编排层**：组合 `Main` / `AppNavbar`、连接 Tab/路由、挂载 hooks、渲染区块；避免堆叠大段 JSX 与复杂业务实现。
- 单文件**建议 ≤ 250 行**；超过或出现下列信号时应拆分（供自检，非 CI 硬性规则）。

| 信号                                                | 建议落点                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 独立 UI 区块（卡片、Banner、表单段）且 JSX > ~40 行 | `pages/<page>/components/<Name>/index.tsx` + `index.scss`                                |
| 同一 UI 被 ≥2 个页面使用                            | `src/components/<Name>/`（大驼峰，如 [`AppNavbar`](src/components/AppNavbar/index.tsx)） |
| 可复用状态/副作用（分页、轮询、表单）               | `src/hooks/use-xxx.ts`（如 [`use-weather.ts`](src/hooks/use-weather.ts)）                      |
| 云函数 / HTTP / 数据库访问                          | `src/services/`（如 [`wardrobe.ts`](src/services/wardrobe.ts)）                          |
| 无 UI 的纯计算/格式化                               | `src/utils/`（如 [`outfit-selection.ts`](src/utils/outfit-selection.ts)）                  |
| 跨模块类型 / 常量                                   | `src/types/`、`src/constants/`（如 [`types/wardrobe.ts`](src/types/wardrobe.ts)）          |

- **页面私有组件**：仅单页使用时放 `src/pages/<page>/components/<ComponentName>/`（大驼峰 + `index.tsx` / `index.scss`）；页面内 `import X from "./components/X"`。样式遵守上文「组件样式收窄」。
- **平衡**：为可读性与职责分离而拆；一次任务若新增 >1 个独立 UI 块，优先抽组件。不要为 5–10 行 JSX 单独建目录；不要为「可能复用」提前抽到 `components/`（YAGNI）；不要在小修复中顺带大规模重构无关页面。

### 样式分层（必须遵守）

| 文件                          | 职责                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/theme.scss`       | 主题入口（薄文件）；变量定义在 `src/styles/theme/` 分层 partial，经 `_emit.scss` 聚合到 `:root, page` |
| `src/styles/theme/`           | L0 `_palette.scss`（换主题改此）→ L1/L2 NutUI 基础/语义 → L3 `_nutui-components.scss`（NutUI 组件变量）→ L4 `_app-extensions.scss`（`.sw-*` 扩展）→ L5 `_layout-runtime.scss`（运行时布局） |
| `src/app.scss`                | 全局样式：在 `@use "./styles/theme.scss"` 之后引入；`page` 系统字体、`.card` / `.chip` 等工具类、NutUI 组件**全局**覆写（如 `.nut-tabs-titles-button`）。 |
| `src/pages/<page>/index.scss` | **仅**页面编排/布局/空态等，优先使用 `var(--nutui-*)`；自定义 `.sw-btn` / `.sw-field` 等用 L4 `--sw-*`；组件样式与组件同目录。 |
| 组件 `index.scss`             | `layouts/`、`src/components/`、`pages/<page>/components/` 下各组件的 BEM/class，与组件同目录并由组件自行引入。                                           |

- `app.scss` 必须在任何 NutUI 样式之前 `@use` `theme.scss`，保证变量先生效。
- **换主题**：只改 `src/styles/theme/_palette.scss` 中 `--sw-palette-*` 原始色值。
- **NutUI 组件变量**：L3 由 `node scripts/extract-nutui-css-vars.mjs` 生成；项目定制写在脚本 `projectOverrides`。
- **引用规范**：页面/NutUI 组件用 `--nutui-*`（优先 L2 语义名）；Tag 用 `--nutui-tag-*`；`.sw-btn` / `.sw-field` 用 L4 `--sw-*`；禁止新增纯 alias 型 `--sw-color-*`。
- **字体**：全局继承 `page` 系统字体栈（PingFang SC 等）；不引入 `--sw-font-*`。
- 若 NutUI 组件无对应 CSS 变量、需改类名样式，覆写写在 `app.scss`。

### TypeScript

- `strictNullChecks: true`；`noImplicitAny: false`。
- 未使用的局部变量/参数会报错；编译目标 ES2017。

### Taro 生命周期

- 页面/应用生命周期使用 Taro hooks：`useDidShow`、`useDidHide`、`useReady` 等。
- 标准 React hooks（`useState`、`useEffect` 等）可正常使用。

### 云函数（cloudfunctions/）

#### 目录约定

- **跨函数共享**（源码真相）：[`cloudfunctions/shared/`](cloudfunctions/shared/)（`utils/`、`constants/`）与 [`cloudfunctions/providers/`](cloudfunctions/providers/)（第三方静态配置，如 `ark/constants.js`）；文件 **kebab-case**；禁止再建 `cloudfunctions/common/`。
- **单函数专属**：`cloudfunctions/<fn>/utils/`、`constants/`；`index.js` **仅编排**（`cloud.init` + `exports.main`），业务逻辑下沉 utils/constants。
- **部署前同步**：修改 `shared/` 或 `providers/` 后执行 `pnpm cf:sync-shared`，复制进各函数包的 `./utils/`、`./constants/`、`./providers/`（由 `.sync-manifest.json` 追踪同步文件）。
- 主识别路径：`process-recognition-batch`（异步批次）；`recognize-clothing` / `generate-wardrobe-display` 为同一套 shared 的薄封装 / 调试入口。

#### 运行时与请求

- 云函数内发起**外部 HTTP 请求统一使用 Node 18 原生 `fetch()`**，与 [`cloudfunctions/chat/index.js`](cloudfunctions/chat/index.js) 保持一致。
- 各云函数 [`config.json`](cloudfunctions/weather/config.json) 须声明 `"runtime": "Nodejs18.15"`；部署后云端须为 Node 18（原生 `fetch` 可用且自动解压 Gzip）。
- **禁止**使用 `require('https')` / `https.get`、旧版 `request` 库或 axios 等额外依赖（除非用户明确要求）。
- 原因：`https.get` 需手动解压 Gzip，易导致 `Unexpected end of JSON input`。
- GET：`const res = await fetch(url)` → 检查 `res.ok` → `await res.text()` / `res.json()`。
- POST：见 chat 云函数 `fetch(url, { method, headers, body })`。
- 环境变量中的 API Host **必须含 `https://` 协议前缀**；Key 仅配在云函数环境变量，勿写入小程序端或提交 `.env`。
- 和风天气：Geo / Weather / Air **共用控制台分配的单一 API Host**；不同 endpoint 参数位置不同，勿假设统一格式：
  - Geo：`/geo/v2/city/lookup?location=经度,纬度`
  - 实时天气：`/v7/weather/now?location={LocationID}`（先 Geo 反查 ID）
  - 实时空气 v1：`/airquality/v1/current/{纬度}/{经度}`（path 传坐标，非 query）
- 和风 API KEY 通过请求头 **`X-QW-Api-Key`** 传递，**勿**在 URL query 中带 `key`（与 Header、query 二选一，勿混用）。
- 部署须选 **上传并部署：云端安装依赖**；说明见 [`cloudfunctions/README.md`](cloudfunctions/README.md)。

### 搜索范围

排查代码时排除：`node_modules/`、`dist/`、`.git/`。

## 编码约定

- 对话、注释、提交说明默认中文简体。
- 目录与页面/组件开发遵循上文全局目录命名与组件规范。
- 改动后暂存文件由 lint-staged 自动 ESLint + Prettier。
- **修复 BUG 后须标注**：在相关代码处简短注释说明原因与改法；仅修代码不留说明视为未完成。
- **函数/方法说明注释**：定义函数、方法时须有基本说明注释，写清职责，以及与调用方相关的入参、返回值要点；显而易见的单行包装或框架生命周期回调可从简，但业务逻辑函数不可省略。

## 应做与不应做

**应做**

- 改动前阅读相邻文件，匹配命名、导入与目录习惯。
- 新页面按「目录 + 注册 `app.config.ts` + `definePageConfig`」完整落地。
- 保持 diff 最小，只改与任务相关的文件。
- 与用户、注释、提交说明使用**简体中文**。
- 新功能开发时，先判断 UI / 状态 / 请求是否应落在 `components`、`hooks`、`services` 层。
- 页面 `index.tsx` 保持「读一遍能看清页面结构」。
- 新增函数/方法时补基本说明注释。

**不应做**

- 不要为简单 UI 手写大量原生组件，应先查 NutUI。
- 不要跳过 `app.config.ts` 注册页面。
- 不要添加无意义注释；不要为 trivial 逻辑过度抽象，也不要把多职责堆进单文件；不要无关重构。
- 不要在 `index.tsx` 内同时维护大块 JSX、复杂 async 流程与多个子组件实现（应下沉到 `components` / `hooks` / `services`）。
- 不要把仅本页使用的组件 premature 抽到 `src/components/`。
- 不要在未要求时执行 `git commit` / `git push`。
- 不要在 `src/styles/theme/` 或 `theme.scss` 中写全局选择器或 NutUI 类名覆写；应放在 `app.scss`。
- 不要把组件样式散写到页面 `index.scss` 或 `app.scss`；应写在组件同目录 `index.scss`（见「组件样式收窄」）。
- 不要用 NutUI `Button` 实现高度定制的页面 CTA；应使用 `View` + `Text`（见「自定义按钮」）。
- 不要在云函数中用 `https.get` 直接请求外部 JSON API；应使用 `fetch`（见「云函数」）。
- 不要省略业务逻辑函数的说明注释。

## 安全与防护措施

- **勿动**：`node_modules/`、`dist/`、`.env` 及含密钥/凭证的文件。
- **慎用**：全量 `pnpm install` 以外的破坏性 git 操作（`reset --hard`、`push --force` 等），除非用户明确要求。
- **构建**：`pnpm build:*` 会写入 `dist/`，属安全操作；开发优先 `pnpm dev:weapp` 而非反复全量构建。
- **依赖**：新增 npm 包前确认任务需要，并说明原因。

## Git 与 PR 规范

- 仅在用户**明确要求**时创建 commit；不要主动提交。
- 提交信息使用简体中文，简洁说明「为什么」。
- 不要修改 git 配置；不要 `--no-verify` 跳过钩子，除非用户要求。
- 不要对 `main`/`master` 做 force push；已推送的提交避免 `--amend`，除非用户明确要求。
- 创建 PR 时：先 `git status` / `git diff` 了解变更，说明测试方式（如微信开发者工具预览 `dist`）。

### 提交信息规范（Commit Message）

格式：`<type>: <简体中文描述>`（`type` 为英文小写，冒号后一个空格，描述用简体中文）。

```
feat: 添加穿搭建议功能，更新多个组件以支持 stylingAdvice 字段
refactor: 移除冗余的性别选择和输入逻辑，简化 MineProfileFieldPage 组件结构
style: 调整 MediaListCard 字体大小和 OutfitPanel 按钮文本
docs: 更新 AGENTS.md，翻译为简体中文并补充提交规范说明
fix: 修复衣橱列表图片链接解析失败的问题
```

`type` 取值（与本仓库历史提交保持一致）：

| type       | 说明                                             |
| ---------- | ------------------------------------------------ |
| `feat`     | 新增功能                                         |
| `fix`      | 修复 bug                                         |
| `refactor` | 重构（不改变外部行为的代码结构调整）             |
| `style`    | 样式/UI 调优（不涉及逻辑变更）                   |
| `docs`     | 文档变更（如 `AGENTS.md`、`README.md`）          |
| `chore`    | 构建配置、依赖、脚手架等杂项变更                 |
| `perf`     | 性能优化                                         |
| `test`     | 测试相关变更（当前仓库暂无测试 runner，谨慎使用）|

- 描述部分**用简体中文**，动词开头（如「添加」「修复」「更新」「移除」），概括本次改动做了什么、以及必要时说明为什么。
- 一次 commit 聚焦一个主题；避免把多个不相关改动混在一条提交信息里。
- 不使用 `feat(scope):` 这类带 scope 的写法（保持与历史提交一致的简单格式），除非用户明确要求。
- commit-msg 由 Husky + commitlint（`@commitlint/config-conventional`）校验；description 须为中文简体。

## 其他规则

- 人类可读的项目说明见 `CLAUDE.md`（与本文件同源约定）；勿在本文件重复长篇营销文案。
- 架构或命令变更时，同步更新 `AGENTS.md` 与 `CLAUDE.md`，避免代理读到过期结构（例如页面路径以 `app.config.ts` 为准）。

## 设计背景

设计与产品战略文档（做 UI/UX 任务前先读）：

- **[PRODUCT.md](./PRODUCT.md)** — 注册表 `product`；用户（穿搭爱好者）、产品目的、品牌气质（有机温暖）、反参考、设计原则、无障碍
- **[DESIGN.md](./DESIGN.md)** — 视觉体系「Botanica & Steel」：叶绿/钢蓝色板、Plus Jakarta Sans + Be Vietnam Pro、圆角与阴影令牌
- **代码令牌** — [`src/styles/theme/`](src/styles/theme/)（L0 palette → L1/L2 `--nutui-*` → L3 组件 → L4 `--sw-*` 扩展），与 DESIGN.md 对齐；当前实现使用系统字体回退，西文字体未打包。

