# 智能衣橱 (Smart Wardrobe)

结合 AI 模型打造具有个人特色的智能衣橱 —— 基于 Taro 的跨平台小程序应用。

## 技术栈

- **框架**: Taro 4.2（React 18 + TypeScript 5.1）
- **UI 组件库**: NutUI React Taro 2.6（京东移动端组件库）
- **样式**: Sass 1.60
- **构建**: Vite 4.2 + SWC
- **包管理器**: pnpm
- **目标平台**: 微信、支付宝、字节跳动、百度、京东、QQ 小程序 + H5 + React Native + 快应用

## 常用命令

```bash
# 开发（微信小程序为主要目标平台）
pnpm dev:weapp          # 微信小程序开发模式
pnpm dev:h5             # H5 开发模式

# 构建
pnpm build:weapp        # 微信小程序生产构建

# 代码检查
pnpm eslint             # ESLint 检查
```

完整平台命令见 `package.json` 中 scripts 字段。

## 项目结构

```
src/
  app.ts              # 根组件（Taro 生命周期 hooks）
  app.config.ts       # 应用配置（路由、窗口样式）
  app.scss            # 全局样式
  index.html          # H5 入口
  pages/
    index/            # 首页（当前唯一页面，NutUI 示例）
      index.tsx
      index.config.ts  # 页面级配置
      index.scss
config/
  index.ts            # Taro 构建配置（designWidth: 375）
  dev.ts / prod.ts    # 开发/生产环境配置
types/
  global.d.ts         # 全局类型声明
```

## 架构约定

### 页面组织
- 每个页面一个目录，位于 `src/pages/<page-name>/`
- 页面必须在 `src/app.config.ts` 的 `pages` 数组中注册
- 页面级配置通过 `definePageConfig` 导出（导航栏标题等）

### 组件与样式
- 使用 NutUI React Taro 组件（`@nutui/nutui-react-taro`），按需加载已通过 `vite-plugin-imp` 配置
- 样式文件命名为 `*.scss`，与组件同目录
- px 单位会自动转换为小程序 rpx（NutUI 的 `nut-` 前缀选择器被排除）

### TypeScript
- 严格空值检查开启（`strictNullChecks: true`）
- 隐式 any 关闭（`noImplicitAny: false`）
- 未使用的局部变量/参数会报错
- 目标编译为 ES2017

### Taro 生命周期
- 页面/应用生命周期使用 Taro hooks：`useDidShow`、`useDidHide`、`useReady` 等
- 标准 React hooks（`useState`、`useEffect` 等）可正常使用

## 协作约定

- **语言**: AI 对话使用中文简体，代码注释和提交信息也用中文
