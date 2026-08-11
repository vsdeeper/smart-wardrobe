# 云函数部署说明

## 1. 部署 chat 云函数

勿在云开发控制台网页「新建云函数」。使用本地目录上传：

1. `pnpm dev:weapp` 构建后，微信开发者工具打开**项目根目录**
2. 左侧文件树展开 `cloudfunctions/chat`
3. 右键 → **上传并部署：云端安装依赖**

各云函数 [`config.json`](cloudfunctions/weather/config.json) 已声明 `"runtime": "Nodejs18.15"`；若控制台显示版本不一致，重新上传部署后应与配置对齐。

若上传失败（ECONNRESET），可关闭 VPN 后重试，或使用 CLI：

```bash
npm i -g @cloudbase/cli
tcb login
tcb fn deploy chat -e cloudbase-d6gkz1xlx9adbfe51
```

## 2. 配置环境变量

云开发控制台 → **云函数** → `chat` → **配置** → **环境变量**：

| 变量名                  | 说明                                                  |
| ----------------------- | ----------------------------------------------------- |
| `LLM_DEFAULT_PROVIDER`  | 默认 `deepseek`                                       |
| `DEEPSEEK_API_KEY`      | DeepSeek API Key                                      |
| `DEEPSEEK_API_BASE_URL` | 可选，默认 `https://api.deepseek.com`                 |
| `DEEPSEEK_MODEL`        | 可选，默认 `deepseek-v4-flash`（简单对话）            |
| `DOUBAO_API_KEY`        | 火山方舟 API Key                                      |
| `DOUBAO_API_BASE_URL`   | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_MODEL`          | 方舟文本对话模型 ID（`/chat/completions` 的 `model` 字段） |

API Key 仅配置在控制台，勿提交到 Git。

## 3. Console 验证

开发者工具 **Console 运行在小程序原生上下文**，仅识别 `wx` / `wx.cloud`，**没有** Taro 全局对象；勿在 Console 使用 `Taro.cloud`，否则会报 `Taro is not defined`。

若 App 尚未执行云初始化（或刚清缓存），需先在 Console 调用 `wx.cloud.init`；App 已 `initCloud` 时可跳过 init。

| 场景               | API                                            |
| ------------------ | ---------------------------------------------- |
| 开发者工具 Console | `wx.cloud.*`                                   |
| 页面 / 业务代码    | `chatWithLLM` → 内部 `Taro.cloud.callFunction` |

开发者工具 Console：

```javascript
// 若尚未初始化（可选，App 已 initCloud 时可跳过）
wx.cloud.init({
  env: "cloudbase-d6gkz1xlx9adbfe51",
  traceUser: true,
});

// DeepSeek（默认）
wx.cloud
  .callFunction({
    name: "chat",
    data: { messages: [{ role: "user", content: "你好" }] },
  })
  .then(console.log)
  .catch(console.error);

// 豆包
wx.cloud
  .callFunction({
    name: "chat",
    data: {
      provider: "doubao",
      messages: [{ role: "user", content: "用三句话介绍秋季穿搭" }],
    },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ provider, model, content, usage }`（默认 `model` 为 `deepseek-v4-flash`）。

或在页面代码中（Taro 项目内用法）：

```typescript
import { chatWithLLM } from "@/services/ai";

const res = await chatWithLLM([{ role: "user", content: "你好" }]);
console.log(res.content);
```

## 4. 部署 weather 云函数

1. 微信开发者工具展开 `cloudfunctions/weather`
2. 右键 → **上传并部署：云端安装依赖**

或使用 CLI：

```bash
tcb fn deploy weather -e cloudbase-d6gkz1xlx9adbfe51
```

### 环境变量

云开发控制台 → **云函数** → `weather` → **配置** → **环境变量**：

| 变量名              | 说明                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `QWEATHER_API_KEY`  | [和风天气](https://dev.qweather.com/) 开发 Key（必填）；云函数内通过请求头 **`X-QW-Api-Key`** 传递，勿写在 URL query 中 |
| `QWEATHER_API_HOST` | 和风控制台 → 设置 → **API Host**，须含 `https://`；Geo / Weather / Air v1 共用此 Host，须与 Key **同一项目** |

云函数请求链路（[`cloudfunctions/weather/index.js`](cloudfunctions/weather/index.js)）：

| 步骤 | 接口 | 参数位置 |
| ---- | ---- | -------- |
| 1 Geo 反查 | `/geo/v2/city/lookup` | query `location=经度,纬度` |
| 2 实时天气 | `/v7/weather/now` | query `location={LocationID}`（Geo 返回的 id） |
| 3 实时空气 | `/airquality/v1/current/{纬度}/{经度}` | path 传坐标（非 v7/air/now） |

凭据 **API 限制**须勾选：GeoAPI、实时天气、**实时空气质量 v1**。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `fetch is not defined` | 运行时为 Node 16 及以下；确认 `config.json` 含 `"runtime": "Nodejs18.15"` 后重新上传部署。若控制台无法改运行时，删除云端该函数后从开发者工具重新「上传并部署：云端安装依赖」 |
| `Invalid URL` | `QWEATHER_API_HOST` 缺少 `https://` 协议前缀 |
| `Unexpected end of JSON input` | 使用了 `https.get` 未解压 Gzip；请确保已部署使用 `fetch` 的版本 |
| `HTTP 403` / `Security Restriction` | 凭据应用限制（云函数勿绑 IP 白名单）或 API 权限未勾选（Geo / 实时天气 / 空气 v1）；确认 Host 与 Key 同属一个项目 |
| `HTTP 403` / 其他业务 error | Key 与 API Host 不匹配，或配额用尽 |
| `和风 API 返回空响应` | Host 或路径错误 |
| `aqi` 为 0 但天气正常 | 空气 v1 接口失败或未授权；天气与空气独立，空气失败时 AQI 回退 0 |

### Console 验证

```javascript
wx.cloud
  .callFunction({
    name: "weather",
    data: { latitude: 39.9042, longitude: 116.4074 },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ city, conditionCode, temperature, humidity, aqi }`。

页面内通过 `useWeather` hook 调用，定位失败时卡片引导「开启定位」。

## 5. 云数据库（衣橱 AI 分类）

云开发控制台 → **数据库** → 新建以下集合，并配置安全规则（仅创建者可读写）：

### 集合 `clothing_types` — 衣物类型字典

| 字段        | 类型     | 说明                         |
| ----------- | -------- | ---------------------------- |
| `_openid`   | string   | 自动注入，按用户隔离         |
| `name`      | string   | 类型名，如「T恤」「牛仔裤」  |
| `itemCount` | number   | 该类型下衣物数量             |
| `createdAt` | Date     | 首次识别时间                 |
| `updatedAt` | Date     | 最近更新                     |

建议索引：`_openid` + `name`（组合）、`_openid` + `itemCount`（降序，供 Tab 排序）

### 集合 `wardrobe_items` — 衣物单品

| 字段          | 类型     | 说明                        |
| ------------- | -------- | --------------------------- |
| `_openid`     | string   | 用户隔离                    |
| `name`        | string   | AI 识别名称                 |
| `typeId`      | string   | 关联 `clothing_types._id` |
| `typeName`    | string   | 冗余，卡片展示              |
| `imageFileId` | string   | 云存储 fileID               |
| `tags`        | array    | 颜色、材质等                |
| `createdAt`   | Date     | 排序 + 分页                 |

建议索引：`_openid` + `createdAt`（降序）、`_openid` + `typeId` + `createdAt`（降序，供类型筛选分页）

### 集合 `recognition_batches` — 衣物识别批次

| 字段            | 类型     | 说明                                                                 |
| --------------- | -------- | -------------------------------------------------------------------- |
| `_openid`       | string   | 用户隔离                                                             |
| `status`        | string   | `processing` \| `succeeded` \| `failed`                              |
| `confirmStatus` | string   | `pending` \| `confirmed` \| `discarded`（创建时 `pending`）          |
| `coverFileId`   | string   | 本批次唯一原图 / 列表封面（一图一批次）                              |
| `progress`      | object   | `{ current, total, phase? }` 识别中进度                              |
| `items`         | array    | 成功后的预览单品（含 `tempId` / `name` / `typeName` / `imageFileId` 等） |
| `itemCount`     | number   | 成功件数                                                             |
| `errorMessage`  | string   | 失败原因                                                             |
| `createdAt`     | number   | 创建时间戳                                                            |
| `updatedAt`     | number   | 最近更新                                                             |
| `confirmedAt`   | number   | 确认入库时间（可选）                                                 |

建议索引：`_openid` + `createdAt`（降序）

由小程序端建单（`status=processing`），云函数 `process-recognition-batch` 异步写回结果；确认/放弃由小程序端更新 `confirmStatus`。

### 安全规则示例

`clothing_types`、`wardrobe_items`、`recognition_batches` 均使用：

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

云函数 `save-wardrobe-items` / `process-recognition-batch` 写入时会显式设置或校验 `_openid`；小程序端查询时规则自动过滤当前用户数据。

## 6. 共享代码同步（部署相关云函数前必读）

跨函数共用代码位于 [`cloudfunctions/shared/`](shared/) 与 [`cloudfunctions/providers/`](providers/)（kebab-case）。微信云函数**按单目录独立打包**，须在本地同步进各函数包：

```bash
pnpm cf:sync-shared
```

**源码树（节选）**

| 源码路径 | 同步到函数包内 |
| ---- | -------------- |
| `shared/utils/env.js` | `./utils/env.js` |
| `shared/utils/doubao-vision.js` | `./utils/doubao-vision.js` |
| `shared/constants/recognition-rules.js` | `./constants/recognition-rules.js` |
| `providers/ark/constants.js` | `./providers/ark/constants.js` |

**各函数 sync 范围**（见 [`scripts/sync-cloud-shared.js`](../scripts/sync-cloud-shared.js) 的 `SHARED_SYNC_MAP` / `PROVIDERS_SYNC_MAP`）。

**主路径**：小程序上传走 `process-recognition-batch`（异步批次）；`recognize-clothing` + `generate-wardrobe-display` 保留为薄封装 / Console 调试。

修改 `cloudfunctions/shared/` 或 `cloudfunctions/providers/` 后须重新 `pnpm cf:sync-shared` 再上传部署。

| 错误信息 | 常见原因 |
| -------- | -------- |
| `Cannot find module './utils/...'` 或 `./constants/...` | 未 sync；运行 `pnpm cf:sync-shared` 后重新「上传并部署：云端安装依赖」 |

## 7. 部署 recognize-clothing 云函数

1. 执行 `pnpm cf:sync-shared`（若刚修改过 common 或首次部署）
2. 微信开发者工具展开 `cloudfunctions/recognize-clothing`
3. 右键 → **上传并部署：云端安装依赖**

或使用 CLI：

```bash
tcb fn deploy recognize-clothing -e cloudbase-d6gkz1xlx9adbfe51
```

### 环境变量

云开发控制台 → **云函数** → `recognize-clothing` → **配置** → **环境变量**：

| 变量名                | 说明                                               |
| --------------------- | -------------------------------------------------- |
| `DOUBAO_API_KEY`      | 火山方舟 API Key（可与 chat 共用）                 |
| `DOUBAO_API_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_SEED_MODEL` | 方舟 Seed 全模态模型 ID，示例 `doubao-seed-2-0-lite-260428`（从原图提取 `items[]` JSON） |
| `DOUBAO_SEED_TEMPERATURE` | 可选，识别采样温度，默认 `0.1`，范围 0–2 |

在[火山方舟控制台](https://console.volcengine.com/ark)模型列表中查看模型 ID，填入 `DOUBAO_SEED_MODEL`。

识别规则（typeName 白名单、Prompt 文案）见 [`cloudfunctions/shared/constants/recognition-rules.js`](shared/constants/recognition-rules.js)。修改 shared 后须 `pnpm cf:sync-shared` 并重新部署相关云函数。

**超时**：`config.json` 为 `timeout: 60`（仅 Seed 识别，通常 5–15s 内完成）。展示图生成已拆至 `generate-wardrobe-display`（见第 8 节）。

### Console 验证

先通过小程序上传一张图片到云存储，取得 `fileID`，再调用：

```javascript
wx.cloud
  .callFunction({
    name: "recognize-clothing",
    data: { fileID: "cloud://xxx.jpg" },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ items: [{ name, typeName, tags }], sourceFileId }`。失败时返回 `{ error, message }`。展示图须再调 `generate-wardrobe-display`（见第 8 节）。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `145 code exit unexpected` | SDK 在 `cloud.init()` 前调用 `cloud.database()`；确保已部署最新代码后重新「上传并部署：云端安装依赖」 |
| `Cannot find module './utils/...'` | 未 sync；见第 6 节，运行 `pnpm cf:sync-shared` 后重新部署 |
| `未配置 DOUBAO_SEED_MODEL` | 未设置 Seed 全模态模型 ID 环境变量 |
| `未识别到衣物单品` | 原图中 Seed 未识别到衣物 |
| `-504003` / 云函数超时 | 若仍出现在识别阶段，检查是否误将 Seedream 逻辑合并在本函数；生图超时见第 8 节 `generate-wardrobe-display` |
| `无法获取图片临时链接` | fileID 无效或云存储权限问题 |
| `AI 返回格式无效` | Vision 模型未按 JSON 格式返回，检查 prompt 或换模型 |
| `LLM_API_ERROR` | API Key 无效、模型 ID 错误或 API 与模型不匹配、或配额用尽 |

页面内通过衣橱页 FAB 上传触发：`chooseMedia` → `uploadFile` → 创建 `recognition_batches` → `callFunction('process-recognition-batch')`（云端异步识别 + 出图）；结果在「我的」识别记录中确认后由 `save-wardrobe-items` 入库。

## 8. 部署 generate-wardrobe-display 云函数

识别与生图已拆分为两个云函数，避免 Seed + Seedream 合计超过 60s 导致 `-504003`。

1. 执行 `pnpm cf:sync-shared`
2. 微信开发者工具展开 `cloudfunctions/generate-wardrobe-display`
3. 右键 → **上传并部署：云端安装依赖**

或使用 CLI：

```bash
tcb fn deploy generate-wardrobe-display -e cloudbase-d6gkz1xlx9adbfe51
```

### 环境变量

云开发控制台 → **云函数** → `generate-wardrobe-display` → **配置** → **环境变量**：

| 变量名                | 说明                                               |
| --------------------- | -------------------------------------------------- |
| `DOUBAO_API_KEY`      | 火山方舟 API Key（可与其它云函数共用）             |
| `DOUBAO_API_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_VISION_MODEL` | Seedream 模型 ID，示例 `doubao-seedream-5-0-260128`（按 items 从原图生成展示图） |

出图尺寸由 [`providers/ark/constants.js`](../providers/ark/constants.js) 的 `VISION_SIZE`（`1920x1920`）静态配置，与试穿图共用，无需环境变量。

**预设参考图目录**（本地 `output/` 与云存储根目录一致）：

| 分类 | 本地 | 云存储 | 用途 |
| ---- | ---- | ------ | ---- |
| 模特 | `output/models/` | `models/` | 试穿固定模特模板 |
| Pose | `output/poses/` | `poses/` | 试穿姿势库（后续） |
| 试穿背景 | `output/tryon-bgs/` | `tryon-bgs/` | 试穿 Hero 场景底图（如 `light-scene-bg-1920.jpg`） |
| 衣物单品背景 | `output/item-bgs/` | `item-bgs/` | 识别后单品展示图底图 |

单品展示图采用双参考：图1 预设背景（[`shared/constants/display-bg-file-ids.js`](../shared/constants/display-bg-file-ids.js)）+ 图2 用户原图。上传 `output/item-bgs/clothing-wall-bg-1920-light.jpg` 至云存储 `item-bgs/` 后，将 fileID 填入该常量，执行 `pnpm cf:sync-shared` 并重新部署 `process-recognition-batch` / `generate-wardrobe-display`。

**超时**：`config.json` 为 `timeout: 120`（Seedream 组图常需 40–90s）。客户端 `callFunction` 须设 `config.timeout: 120000` 与之对齐。

### Console 验证

先调用 `recognize-clothing` 取得 `items` 与原图 `fileID`，再：

```javascript
wx.cloud
  .callFunction({
    name: "generate-wardrobe-display",
    data: {
      fileID: "cloud://xxx.jpg",
      items: [{ name: "基础白色T恤", typeName: "T恤", tags: ["白色"] }],
    },
    config: { timeout: 120000 },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ previews: [{ name, typeName, tags, imageFileId }], failed?: [...] }`；成功后云函数会删除原图 `fileID`。`previews.length === 0` 时返回 `{ error: 'GENERATE_FAILED', message, failed }`。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `未配置 DOUBAO_VISION_MODEL` | 未在 `generate-wardrobe-display` 配置 Seedream 模型 ID |
| `SEEDREAM_FAILED` | Seedream 组图失败，检查模型 ID 与 prompt/参考图 |
| `Seedream 未返回图片` | 模型无图像生成权限或组图参数不符合要求 |
| `image size must be at least 3686400 pixels` | 展示图 `size` 过小；检查 `providers/ark` 的 `VISION_SIZE`（须 ≥3686400 像素） |
| `-504003` / 云函数超时 | 确认 `config.json` 为 `timeout: 120` 且客户端 `callFunction` timeout 为 120000 |

## 8.1 部署 process-recognition-batch 云函数

异步处理 `recognition_batches`：对 `coverFileId` 单张原图执行识别 + 展示图生成，写回 `status` / `items`（一图一批次，原图保留作列表封面）。

1. 执行 `pnpm cf:sync-shared`
2. 微信开发者工具展开 `cloudfunctions/process-recognition-batch`
3. 右键 → **上传并部署：云端安装依赖**

环境变量与 `recognize-clothing` + `generate-wardrobe-display` 相同：`DOUBAO_API_KEY`、`DOUBAO_SEED_MODEL`、`DOUBAO_VISION_MODEL`（及可选 Base URL / Temperature）。出图尺寸见 `providers/ark/constants.js` 的 `VISION_SIZE`。

**超时**：`config.json` 为 `timeout: 300`。

### Console 验证

先由小程序建单取得 `batchId`，再调用：

```javascript
wx.cloud
  .callFunction({
    name: "process-recognition-batch",
    data: { batchId: "xxx", userGender: "female" },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ batchId, itemCount }`；失败时 batch 文档 `status` 为 `failed`。

## 9. 部署 save-wardrobe-items 云函数

1. 执行 `pnpm cf:sync-shared`（save-wardrobe-items 无 shared 依赖，可跳过 sync）
2. 微信开发者工具展开 `cloudfunctions/save-wardrobe-items`
3. 右键 → **上传并部署：云端安装依赖**

或使用 CLI：

```bash
tcb fn deploy save-wardrobe-items -e cloudbase-d6gkz1xlx9adbfe51
```

### Console 验证

```javascript
wx.cloud
  .callFunction({
    name: "save-wardrobe-items",
    data: {
      items: [
        {
          name: "基础白色T恤",
          typeName: "T恤",
          imageFileId: "cloud://xxx.jpg",
          tags: ["白色", "棉质"],
        },
      ],
    },
  })
  .then(console.log)
  .catch(console.error);
```

预期返回 `{ saved: [...], failed: [] }`；单条格式无效时出现在 `failed` 数组，不影响其余条目。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `Cannot find module './utils/wardrobe-save'` | 函数目录缺少 utils；确认已部署最新代码 |
| `缺少待入库衣物数据` | `items` 为空或非数组 |
| `无法获取用户身份` | 未登录或未初始化云开发 |

## 7. 试穿相关云函数

### recommend-outfit

右键 `cloudfunctions/recommend-outfit` → **上传并部署：云端安装依赖**。

调用火山方舟 Seed 文本模型：`POST {DOUBAO_API_BASE_URL}/chat/completions`。

环境变量（云开发控制台 → `recommend-outfit` → 配置）：

| 变量名 | 说明 |
| ------ | ---- |
| `DOUBAO_API_KEY` | 火山方舟 API Key（可与其它云函数共用） |
| `DOUBAO_API_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_SEED_MODEL` | Seed 模型 ID，可与 `recognize-clothing` 相同 |
| `DOUBAO_SEED_TEMPERATURE` | 可选，采样温度，默认 `0.3`，范围 0–2 |

入参：`weather`、`season`、`profile`、`wardrobeByType`（按 typeName 分组的衣橱摘要）。

LLM 失败时回退规则推荐 `buildFallbackRecommendation`。

| 返回 message | 常见原因 |
| ------------ | -------- |
| `未配置 DOUBAO_SEED_MODEL` | 未设置 Seed 模型 ID 环境变量 |

### generate-tryon-image

右键 `cloudfunctions/generate-tryon-image` → **上传并部署：云端安装依赖**。

部署前若修改过 `cloudfunctions/shared/` 下 vision / 上传模块，或 `generate-tryon-image/constants/` 下试穿规则 / 模特配置，须先执行 `pnpm cf:sync-shared`（仅改 tryon 专属 constants 时可只部署该函数）。

调用火山方舟 **Seedream 图像生成 API**：`POST {DOUBAO_API_BASE_URL}/images/generations`（非 `/chat/completions`）。参考图通过 `image` 传入：若已配置固定模特模板，则 **图1 = 模特人物参考**（锁定脸型/发型/肤质，姿势不沿用模板），其后为衣物参考图；文本需求通过 `prompt` 描述。输出尺寸来自 [`providers/ark/constants.js`](../providers/ark/constants.js) 的 `VISION_SIZE`（`1920x1920`，1:1，满足 Seedream 5.0 像素下限）。

场景约定（`tryon-image-rules.js`）：始终**全身**生活方式构图；身体略侧、一手插袋；背景为简洁浅色纹理墙 + 中性地面；光影按 `weatherConditionCode` 调节（缺省按晴天暖日光）。

环境变量（云开发控制台 → `generate-tryon-image` → 配置）：

| 变量名 | 说明 |
| ------ | ---- |
| `DOUBAO_API_KEY` | 火山方舟 API Key（可与其它云函数共用） |
| `DOUBAO_API_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_VISION_MODEL` | Hero 试穿图专用 Seedream 模型 ID，示例 `doubao-seedream-5-0-260128` |

入参：`imageFileIds[]`（衣物）、`heightCm`、`weightKg`、`gender`（`male`/`female`）、`pieceLabels[]`、`pieceTypeNames[]`、可选 `weatherConditionCode`（如 `sunny`/`rainy`，用于背景光影）。

成功时返回 `{ coverFileId, coverUrl }`，解析响应 `data[0].url` 或 `b64_json`。失败时返回 `{ error, message }`。

| 返回 message | 常见原因 |
| ------------ | -------- |
| `未配置 DOUBAO_VISION_MODEL` | 未在 `generate-tryon-image` 云函数配置 Hero 专用模型 ID |
| `Seedream 未返回图片` | 模型 ID 无图像生成权限，或 prompt/参考图不符合要求 |

**固定模特模板（运行时按性别匹配）**：

- 匹配规则：仅按 `gender` 选择 `female-standard-*` / `male-standard-*`；发型变体 `01/02/03` 由用户 `openid` 稳定哈希决定；**身高体重不参与选图**（仍写入 prompt 作文案提示）。
- 缺图回退：目标变体无 fileID 时回退同性别 `*-standard-01`；仍无或临时链解析失败时降级为纯文案模式（不阻断试穿）。
- fileID 清单：[`generate-tryon-image/constants/model-template-file-ids.js`](../generate-tryon-image/constants/model-template-file-ids.js)。

上传并启用（一次性）：

1. 将 [`output/models/`](../output/models/) 下 `female/male-standard-{01,02,03}-1920.jpg` 上传到云存储目录 `models/`（微信开发者工具 → 云开发 → 云存储）。
2. 把各文件的 `cloud://...` fileID 填入 [`generate-tryon-image/constants/model-template-file-ids.js`](../generate-tryon-image/constants/model-template-file-ids.js) 对应键。
3. 执行 `pnpm cf:sync-shared`，再重新部署 `generate-tryon-image`。

**试穿场景背景**（后续接入 Hero 双参考时使用）：

- 本地目录 [`output/tryon-bgs/`](../output/tryon-bgs/)，云存储 `tryon-bgs/`；示例 `light-scene-bg-1920.jpg`（浅色场景墙 + 地面）。
- 接入试穿流水线前须上传至云存储；fileID 清单待 `generate-tryon-image/constants/` 扩展（与模特模板模式一致）。

**离线生成模特模板候选图**（非云函数部署）：

1. 在项目根目录 `.env.local` 配置与 `generate-tryon-image` 相同的 `DOUBAO_API_KEY`、`DOUBAO_VISION_MODEL`（脚本固定竖版 `1600x2304`）。
2. 执行 `pnpm generate:model-templates`，默认生成 `female-standard` 的 3 张变体，输出至 `output/models/`（如 `female-standard-01-1920.jpg`）。
3. 可选 CLI 参数（直接追加在 `pnpm generate:model-templates` 后）：

| 参数 | 默认 | 说明 |
| ---- | ---- | ---- |
| `--preset <id>` | `female-standard` | preset ID 或 `all`（全部 19 张） |
| `--variant <n>` | 无 | 仅生成该 preset 第 n 个变体（1-based，不可与 `all` 同用） |
| `--help` | - | 列出 preset 与示例 |

可用 preset：`female-slim`、`female-standard`、`female-curvy`、`male-slim`、`male-standard`、`male-curvy`、`neutral`（1 变体）。Prompt 定义见 [`generate-tryon-image/constants/model-template-prompts.js`](../generate-tryon-image/constants/model-template-prompts.js)。当前运行时仅使用 `*-standard-*`。

4. 本地预览后可将选定图提交 git；启用试穿前须按上文上传云存储并填写 fileID。
