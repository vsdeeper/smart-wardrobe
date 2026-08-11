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
pnpm lint
```

构建后在微信开发者工具中打开项目根目录即可预览。

部署或修改云函数前，须先同步跨函数共享代码：

```bash
pnpm cf:sync-shared
```

详见 [云函数部署说明](./cloudfunctions/README.md)。

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
│   ├── types/              # 跨模块业务类型
│   ├── constants/          # 跨模块常量与枚举
│   ├── styles/             # 全局主题变量
│   ├── app.ts              # 根组件
│   └── app.config.ts       # 路由与窗口配置
├── cloudfunctions/         # 微信云函数
│   ├── shared/             # 跨函数共享源码（utils/、constants/）
│   ├── providers/          # 第三方静态配置（如 ark/constants.js）
│   ├── chat/               # 各云函数：index.js 仅编排
│   ├── weather/            # utils/、constants/ 为函数专属或 sync 注入
│   └── …/
├── scripts/
│   └── sync-cloud-shared.js  # 将 shared/、providers/ 同步进各函数包
├── config/                 # Taro 构建配置
├── types/                  # 全局类型声明（非业务 types）
├── PRODUCT.md              # 产品战略文档
├── DESIGN.md               # 设计体系文档
└── AGENTS.md               # AI 代理操作指南
```

## 待办

- [x] 搭配、我的新缓存策略重构（业务数据应用级内存；临时链统一 `imageUrlCache`，含 avatar；已移除 `sw_user_profile_cache`）
- [ ] AI 出图固定参考图（预设离线图）：试穿/单品展示等场景统一采用离线预设参考图 + 云存储 fileID 清单（对齐固定模特模板模式），替代运行时生成或纯 prompt 约束
- [ ] 试穿图姿势自定义（离线姿势库）：图1 模特身份 + 图2 离线姿势库（`output/poses/`）+ 图3 起衣物；改 `generate-tryon-image` 与 `tryon-image-rules`（图2 仅管体态构图、不得复制面孔与服装）
- [x] 衣物单品展示图稳定（离线预设底图）：图1 离线预设底图（`output/item-bgs/clothing-wall-bg-1920-light.jpg`）+ 图2 用户原图；改 `wardrobe-display-pipeline` 与 `item-display-rules`
- [ ] **Flux Art 国外生图模型接入**：评估并接入 Flux Art 生图 API，用于试穿/单品展示等场景；云函数侧抽象 Provider（与现有 Seedream 并列或可切换），环境变量配置密钥与模型参数，按场景选型与降级策略
- [ ] 展示模特从基础穿搭进化到百变穿搭的引导页，体现 AI 赋能个人风格成长
- [ ] **按需积分变现**：充值积分、按 AI 动作消耗（识别入库按张、虚拟试穿按次、AI 搭评按次等）；衣橱浏览/编辑、视觉日记等非 AI 能力免费；定价按第三方 AI API 成本 + 合理溢价，App 内定价说明页公示各动作积分消耗与调价规则；云函数入口预扣积分、失败回滚；微信支付充值档位 + 余额/流水

## 相关文档

- [产品战略（PRODUCT.md）](./PRODUCT.md)
- [设计体系（DESIGN.md）](./DESIGN.md)
- [代理操作指南（AGENTS.md）](./AGENTS.md)
- [云函数部署说明（cloudfunctions/README.md）](./cloudfunctions/README.md)
