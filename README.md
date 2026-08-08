# 凡衣橱 · Smart Wardrobe

结合 AI 的智能衣橱小程序，帮助用户管理衣物、获取穿搭建议、试穿预览造型，并记录视觉日记。

## 技术栈

| 类别     | 选型                                         |
| -------- | -------------------------------------------- |
| 框架     | Taro 4.2（React 18 + TypeScript 5.1）        |
| UI 组件  | NutUI React Taro 2.6                         |
| 样式     | Sass + CSS 变量（Botanica & Steel 设计体系） |
| 构建     | Vite + SWC                                   |
| 包管理   | pnpm                                         |
| 目标平台 | 微信小程序（主）、H5、支付宝、抖音等         |
| 后端     | 微信云开发（云函数 + 云数据库 + 云存储）     |
| AI 集成  | 火山方舟 Seed / Seedream、DeepSeek           |

## 功能概览

- **衣橱管理** — 拍照识别衣物入库，分类浏览与编辑
- **AI 搭评** — 结合天气、季节、个人资料，智能推荐穿搭方案
- **虚拟试穿** — 选定单品生成 AI 试穿预览图，支持固定模特模板
- **穿搭日记** — 记录每日造型，形成个人风格成长视觉档案
- **天气感知** — 实时获取本地天气与空气质量，辅助穿搭决策

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发（微信小程序）
pnpm dev:weapp

# 开发（H5）
pnpm dev:h5

# 代码检查
pnpm exec eslint .
```

构建后在微信开发者工具中打开项目根目录即可预览。

## 目录结构

```
smart-wardrobe/
├── src/
│   ├── pages/              # 页面（kebab-case 目录名）
│   ├── components/         # 跨页复用 UI 组件（大驼峰）
│   ├── layouts/            # 布局组件
│   ├── hooks/              # 可复用状态与副作用
│   ├── services/           # 云/API 调用
│   ├── utils/              # 纯函数
│   ├── data/               # 类型、枚举、常量
│   ├── styles/             # 全局主题变量
│   ├── app.ts              # 根组件
│   └── app.config.ts       # 路由与窗口配置
├── cloudfunctions/         # 微信云函数
├── config/                 # Taro 构建配置
├── types/                  # 全局类型声明
├── PRODUCT.md              # 产品战略文档
├── DESIGN.md               # 设计体系文档
└── AGENTS.md               # AI 代理操作指南
```

## 待办

- [ ] 试穿图幻觉提示词优化，位置飘忽、背景稳定、人物姿势稳定
- [ ] 衣物单品识别图背景色稳定性优化
- [ ] 展示模特从基础穿搭进化到百变穿搭的引导页，体现 AI 赋能个人风格成长

## 相关文档

- [产品战略（PRODUCT.md）](./PRODUCT.md)
- [设计体系（DESIGN.md）](./DESIGN.md)
- [代理操作指南（AGENTS.md）](./AGENTS.md)
- [云函数部署说明（cloudfunctions/README.md）](./cloudfunctions/README.md)
