# AGENTS.md

面向在本仓库工作的 AI 编码代理的操作指南。与 `CLAUDE.md` 内容一致，并补充可执行命令与约束。

## Overview & Scope

智能衣橱（Smart Wardrobe）是基于 Taro 4.2 的跨平台小程序应用，结合 AI 打造个人化衣橱体验。技术栈：React 18、TypeScript 5.1、NutUI React Taro 2.6、Sass、Vite + SWC，包管理器为 pnpm。主要目标平台为微信小程序，亦支持 H5 及其他小程序平台。

本文件适用于仓库根目录下的全部源码（`src/`、`config/`、`types/`）。当前为单包项目，无嵌套 `AGENTS.md`；若日后在子目录新增，以距离被编辑文件最近的 `AGENTS.md` 为准。

## Agent Role

- **角色**：熟悉 Taro + React + 小程序生态的前端工程师，能按现有约定扩展页面与组件。
- **允许**：在 `src/` 下新增/修改页面与样式；使用 NutUI 与 Taro API；运行开发构建与 lint；小范围、聚焦的改动。
- **禁止**：未经要求提交 git、强制推送、修改 git 配置；引入与任务无关的依赖或大重构；编辑 `node_modules/`、`dist/`、锁文件（除非用户明确要求）；猜测不存在的脚本或工具。

## Build, Test & Validation Commands

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
# 代码检查（ESLint 已配置于 .eslintrc，package.json 无 eslint 脚本）
pnpm exec eslint .
```

当前仓库**未配置**测试 runner 与 `test` 脚本；不要臆造测试命令。完整平台命令以 `package.json` 为准。

## Conventions & Patterns

### 目录结构

```
src/
  app.ts              # 根组件（Taro 生命周期 hooks）
  app.config.ts       # 应用配置（路由、窗口样式）
  app.scss            # 全局样式
  index.html          # H5 入口
  pages/my-page/      # 页面，kebab-case（如 my-page、outfit-detail）
  pages/wardrobe/     # 单词页面同样合法
  layouts/Main/       # 布局组件，目录名大驼峰
  components/WardrobeCard/  # 通用 UI 组件，目录名大驼峰
  styles/             # 全局主题等
config/
  index.ts            # Taro 构建（designWidth: 375）
  dev.ts / prod.ts
types/
  global.d.ts
```

### 页面组织

- 页面目录：`src/pages/<page-name>/`，**目录名使用 kebab-case**（短横线连接，如 `my-page`、`outfit-detail`）；单词页面如 `wardrobe` 同样合法。
- 每个页面目录包含 `index.tsx`、`index.config.ts`、`index.scss`。
- 必须在 `src/app.config.ts` 的 `pages` 数组中注册路径（如 `'pages/my-page/index'`）。
- 页面配置：同目录 `index.config.ts`，使用 `definePageConfig` 导出。

### 组件与样式

- 页面 UI **默认使用** `@nutui/nutui-react-taro`，优先复用 NutUI 组件，避免重复造轮子。
- NutUI 按需加载已由 `vite-plugin-imp` 配置，直接 `import` 即可。
- 样式文件：`*.scss`，与组件同目录；`px` 会转为小程序 `rpx`（`nut-` 前缀选择器排除转换）。

#### 自定义按钮

- **页面 CTA、卡片操作按钮等需自定义样式的可点击按钮**，优先使用 Taro `View` + `Text` + `onClick`，**不使用** NutUI `Button`。
- 原因：NutUI `Button` 在小程序端编译为原生 `button`，在 `ScrollView` 内易出现布局异常；自定义样式需大量覆盖 NutUI 默认样式（渐变背景、圆角、尺寸变量等），维护成本高。
- 参考实现：[`src/pages/wardrobe/index.tsx`](src/pages/wardrobe/index.tsx) 中 `wardrobe-cta__btn`（样式见同目录 `index.scss`）。
- **例外**：标准 NutUI 风格的功能按钮（如表单「提交」、对话框确认）可使用 NutUI `Button`；若样式异常，检查 `vite-plugin-imp` 是否引入组件 CSS，并用 `.nut-button` 组合选择器覆盖，勿仅用页面级 class。

#### 组件目录命名

- **布局组件**（`src/layouts/`）：目录名**大驼峰**，与 default export 组件名一致。示例：`src/layouts/Main/index.tsx` + `index.scss`；引入 `import Main from "@/layouts/Main"`。
- **通用组件**（`src/components/`）：同样大驼峰 + `index.tsx` / `index.scss`。示例：`src/components/WardrobeCard/index.tsx`；引入 `import WardrobeCard from "@/components/WardrobeCard"`。
- 布局级外壳放 `layouts/`，可复用 UI 块放 `components/`，二者目录结构一致、父目录不同。

### 样式分层（必须遵守）

| 文件 | 职责 |
|------|------|
| `src/styles/theme.scss` | **仅**定义 CSS 变量（`--nutui-*` 覆盖 NutUI 主题、`--sw-*` 应用语义令牌）。不写选择器、不覆写组件类名。 |
| `src/app.scss` | 全局样式：在 `@use "./styles/theme.scss"` 之后引入；`page` 基础排版、`.card` / `.chip` 等工具类、NutUI 组件**全局**覆写（如 `.nut-tabs-titles-button`）。 |
| `src/pages/<page>/index.scss` | 页面局部布局与结构，优先使用 `var(--nutui-*)` / `var(--sw-*)`；避免重复已在 `app.scss` 的全局覆写。 |

- `app.scss` 必须在任何 NutUI 样式之前 `@use` `theme.scss`，保证变量先生效。
- 新增 NutUI 主题项：变量加在 `theme.scss`；若组件无对应 CSS 变量、需改类名样式，覆写写在 `app.scss`。

### TypeScript

- `strictNullChecks: true`；`noImplicitAny: false`。
- 未使用的局部变量/参数会报错；编译目标 ES2017。

### Taro 生命周期

- 页面/应用生命周期使用 Taro hooks：`useDidShow`、`useDidHide`、`useReady` 等。
- 标准 React hooks（`useState`、`useEffect` 等）可正常使用。

### 搜索范围

排查代码时排除：`node_modules/`、`dist/`、`.git/`。

## Dos and Don’ts

**Do**

- 改动前阅读相邻文件，匹配命名、导入与目录习惯。
- 新页面按「目录 + 注册 `app.config.ts` + `definePageConfig`」完整落地。
- 保持 diff 最小，只改与任务相关的文件。
- 与用户、注释、提交说明使用**简体中文**。

**Don’t**

- 不要为简单 UI 手写大量原生组件，应先查 NutUI。
- 不要跳过 `app.config.ts` 注册页面。
- 不要添加无意义的注释、过度抽象或无关重构。
- 不要在未要求时执行 `git commit` / `git push`。
- 不要在 `theme.scss` 中写全局选择器或 NutUI 类名覆写；应放在 `app.scss`。
- 不要用 NutUI `Button` 实现高度定制的页面 CTA；应使用 `View` + `Text`（见「自定义按钮」）。

## Safety & Guardrails

- **勿动**：`node_modules/`、`dist/`、`.env` 及含密钥/凭证的文件。
- **慎用**：全量 `pnpm install` 以外的破坏性 git 操作（`reset --hard`、`push --force` 等），除非用户明确要求。
- **构建**：`pnpm build:*` 会写入 `dist/`，属安全操作；开发优先 `pnpm dev:weapp` 而非反复全量构建。
- **依赖**：新增 npm 包前确认任务需要，并说明原因。

## Git & PR Rules

- 仅在用户**明确要求**时创建 commit；不要主动提交。
- 提交信息使用简体中文，简洁说明「为什么」。
- 不要修改 git 配置；不要 `--no-verify` 跳过钩子，除非用户要求。
- 不要对 `main`/`master` 做 force push；已推送的提交避免 `--amend`，除非用户明确要求。
- 创建 PR 时：先 `git status` / `git diff` 了解变更，说明测试方式（如微信开发者工具预览 `dist`）。

## Additional rules

- 人类可读的项目说明见 `CLAUDE.md`（与本文件同源约定）；勿在本文件重复长篇营销文案。
- 架构或命令变更时，同步更新 `AGENTS.md` 与 `CLAUDE.md`，避免代理读到过期结构（例如页面路径以 `app.config.ts` 为准）。
