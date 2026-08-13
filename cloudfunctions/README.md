# 云函数部署说明

勿在云开发控制台网页「新建云函数」。使用本地目录上传：`pnpm dev:weapp` 构建后，微信开发者工具打开**项目根目录**，展开对应云函数目录，右键 → **上传并部署：云端安装依赖**。

各云函数 [`config.json`](weather/config.json) 已声明 `"runtime": "Nodejs18.15"`；若控制台显示版本不一致，重新上传部署后应与配置对齐。

若上传失败（ECONNRESET），可关闭 VPN 后重试，或使用 CLI：

```bash
npm i -g @cloudbase/cli
tcb login
tcb fn deploy <函数名> -e cloudbase-d6gkz1xlx9adbfe51
```

开发者工具 **Console 运行在小程序原生上下文**，仅识别 `wx` / `wx.cloud`，**没有** Taro 全局对象；勿在 Console 使用 `Taro.cloud`。若 App 尚未执行云初始化（或刚清缓存），需先调用 `wx.cloud.init`；App 已 `initCloud` 时可跳过。

API Key 仅配置在控制台，勿提交到 Git。

## 1. 部署 weather 云函数

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

## 2. 云数据库（衣橱 AI 分类）

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

### 集合 `user_credits` — 积分账户（仅云函数写）

| 字段             | 类型    | 说明                                   |
| ---------------- | ------- | -------------------------------------- |
| `_openid`        | string  | 用户隔离                               |
| `balance`        | number  | 可用余额（含已冻结部分的总账）         |
| `frozen`         | number  | 预占冻结中积分                         |
| `initialGranted` | boolean | 是否已发放体验首赠（1000，一次性）     |
| `updatedAt`      | number  | 最近更新                               |

可用积分 = `balance - frozen`。首次调用 `credits` 云函数 `balance` 或 AI 扣费入口时自动建账并赠送 1000。

### 集合 `credit_holds` — 积分预占

| 字段            | 类型   | 说明                                      |
| --------------- | ------ | ----------------------------------------- |
| `_openid`       | string | 用户隔离                                  |
| `amount`        | number | 预占上限                                  |
| `settledAmount` | number | 实扣积分（结算后写入）                    |
| `action`        | string | `recognize` / `outfit_session`            |
| `refId`         | string | 关联 batchId 或 wearDateKey 等            |
| `status`        | string | `held` \| `settled` \| `released`         |
| `createdAt`     | number | 创建时间                                  |

### 集合 `credit_ledger` — 积分流水

| 字段        | 类型   | 说明                                           |
| ----------- | ------ | ---------------------------------------------- |
| `_openid`   | string | 用户隔离                                       |
| `type`      | string | `grant` / `hold` / `settle` / `release` / `recharge` |
| `amount`    | number | 变动积分                                       |
| `action`    | string | 业务动作                                       |
| `refId`     | string | 关联 ID（充值时为 outTradeNo）                 |
| `holdId`    | string | 预占 ID（可选）                                |
| `note`      | string | 备注（如 `initial`、`wechat_pay`）             |
| `createdAt` | number | 时间戳                                         |

### 集合 `credit_orders` — 充值订单（仅云函数写）

| 字段            | 类型   | 说明                                      |
| --------------- | ------ | ----------------------------------------- |
| `_openid`       | string | 用户隔离                                  |
| `outTradeNo`    | string | 商户订单号（唯一）                        |
| `totalFee`      | number | 实付金额（分）                            |
| `credits`       | number | 到账积分（= totalFee）                    |
| `status`        | string | `pending` \| `paid` \| `closed`           |
| `transactionId` | string | 微信支付流水号（入账后）                  |
| `createdAt`     | number | 创建时间                                  |
| `paidAt`        | number | 入账时间（可选）                          |

建议索引：`outTradeNo` 唯一；`_openid + createdAt`（降序）。

### 积分相关安全规则

`user_credits`、`credit_holds`、`credit_ledger`、`credit_orders` 建议：

```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

积分写入仅通过云函数（管理员权限）；客户端可读自己的余额与流水。

### 安全规则示例

`clothing_types`、`wardrobe_items`、`recognition_batches` 均使用：

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

云函数 `save-wardrobe-items` / `process-recognition-batch` 写入时会显式设置或校验 `_openid`；小程序端查询时规则自动过滤当前用户数据。

## 3. 共享代码同步（部署相关云函数前必读）

跨函数共用代码位于 [`cloudfunctions/shared/`](shared/) 与 [`cloudfunctions/providers/`](providers/)（kebab-case）。微信云函数**按单目录独立打包**，须在本地同步进各函数包：

```bash
pnpm cf:sync-shared
```

**源码树（节选）**

| 源码路径 | 同步到函数包内 |
| ---- | -------------- |
| `shared/utils/env.js` | `./utils/env.js` |
| `shared/utils/model-env.js` | `./utils/model-env.js` |
| `shared/utils/resolve-cloud-image.js` | `./utils/resolve-cloud-image.js` |
| `providers/ark/chat.js` | `./providers/ark/chat.js` |
| `providers/ark/images.js` | `./providers/ark/images.js` |
| `shared/constants/recognition-rules.js` | `./constants/recognition-rules.js` |
| `providers/ark/constants.js` | `./providers/ark/constants.js` |

**各函数 sync 范围**（见 [`scripts/sync-cloud-shared.js`](../scripts/sync-cloud-shared.js) 的 `SHARED_SYNC_MAP` / `PROVIDERS_SYNC_MAP`）。

**主路径**：小程序上传走 `process-recognition-batch`（异步批次）；`recognize-clothing` + `generate-wardrobe-display` 保留为薄封装 / Console 调试。

修改 `cloudfunctions/shared/` 或 `cloudfunctions/providers/` 后须重新 `pnpm cf:sync-shared` 再上传部署。

| 错误信息 | 常见原因 |
| -------- | -------- |
| `Cannot find module './utils/...'` 或 `./constants/...` | 未 sync；运行 `pnpm cf:sync-shared` 后重新「上传并部署：云端安装依赖」 |

## 4. 部署 recognize-clothing 云函数

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
| `MODEL_PROVIDER` | 可选，模型供应商，当前仅 `ark`（缺省 `ark`）；`bailian` 尚未接入 |
| `MODEL_API_KEY`      | 火山方舟 API Key                                   |
| `MODEL_API_BASE_URL` | OpenAI 兼容基址，须含 `https://`，示例 `https://ark.cn-beijing.volces.com/api/v3` |
| `CHAT_MODEL` | 方舟 Seed 全模态模型 ID，示例 `doubao-seed-2-0-lite-260428`（从原图提取 `items[]` JSON） |

在[火山方舟控制台](https://console.volcengine.com/ark)模型列表中查看模型 ID，填入 `CHAT_MODEL`。

识别规则（typeName 白名单、Prompt 文案）见 [`cloudfunctions/shared/constants/recognition-rules.js`](shared/constants/recognition-rules.js)。修改 shared 后须 `pnpm cf:sync-shared` 并重新部署相关云函数。

**超时**：`config.json` 为 `timeout: 60`（仅 Seed 识别，通常 5–15s 内完成）。展示图生成已拆至 `generate-wardrobe-display`（见第 5 节）。

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

预期返回 `{ items: [{ name, typeName, tags }], sourceFileId }`。失败时返回 `{ error, message }`。展示图须再调 `generate-wardrobe-display`（见第 5 节）。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `145 code exit unexpected` | SDK 在 `cloud.init()` 前调用 `cloud.database()`；确保已部署最新代码后重新「上传并部署：云端安装依赖」 |
| `Cannot find module './utils/...'` | 未 sync；见第 3 节，运行 `pnpm cf:sync-shared` 后重新部署 |
| `未配置 CHAT_MODEL` | 未设置 Seed 全模态模型 ID 环境变量 |
| `未识别到衣物单品` | 原图中 Seed 未识别到衣物 |
| `-504003` / 云函数超时 | 若仍出现在识别阶段，检查是否误将 Seedream 逻辑合并在本函数；生图超时见第 5 节 `generate-wardrobe-display` |
| `无法获取图片临时链接` | fileID 无效或云存储权限问题 |
| `AI 返回格式无效` | Vision 模型未按 JSON 格式返回，检查 prompt 或换模型 |
| `LLM_API_ERROR` | API Key 无效、模型 ID 错误或 API 与模型不匹配、或配额用尽 |

页面内通过衣橱页 FAB 上传触发：`chooseMedia` → `uploadFile` → 创建 `recognition_batches` → `callFunction('process-recognition-batch')`（云端异步识别 + 出图）；结果在「我的」识别记录中确认后由 `save-wardrobe-items` 入库。

## 5. 部署 generate-wardrobe-display 云函数

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
| `MODEL_API_KEY`      | 火山方舟 API Key（可与其它云函数共用）             |
| `MODEL_API_BASE_URL` | OpenAI 兼容基址，须含 `https://` |
| `IMAGE_MODEL` | Seedream 模型 ID，示例 `doubao-seedream-5-0-260128`（按 items 从原图生成展示图） |

出图尺寸由 [`providers/ark/constants.js`](../providers/ark/constants.js) 的 `VISION_SIZE`（`1920x1920`）静态配置，与试穿图共用，无需环境变量。

**预设参考图目录**（本地 `output/` 与云存储根目录一致）：

| 分类 | 本地 | 云存储 | 用途 |
| ---- | ---- | ------ | ---- |
| 模特 | `output/models/` | `models/` | 试穿固定模特模板 |
| Pose | `output/poses/` | `poses/` | 试穿姿势库（运行时随机选取） |
| 试穿背景 | `output/tryon-bgs/` | `tryon-bgs/` | 试穿 Hero 场景底图（`light-scene-bg-1920.jpg`） |
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
| `未配置 IMAGE_MODEL` | 未在 `generate-wardrobe-display` 配置 Seedream 模型 ID |
| `SEEDREAM_FAILED` | Seedream 组图失败，检查模型 ID 与 prompt/参考图 |
| `Seedream 未返回图片` | 模型无图像生成权限或组图参数不符合要求 |
| `image size must be at least 3686400 pixels` | 展示图 `size` 过小；检查 `providers/ark` 的 `VISION_SIZE`（须 ≥3686400 像素） |
| `-504003` / 云函数超时 | 确认 `config.json` 为 `timeout: 120` 且客户端 `callFunction` timeout 为 120000 |

## 5.1 部署 process-recognition-batch 云函数

异步处理 `recognition_batches`：对 `coverFileId` 单张原图执行识别 + 展示图生成，写回 `status` / `items`（一图一批次，原图保留作列表封面）。

1. 执行 `pnpm cf:sync-shared`
2. 微信开发者工具展开 `cloudfunctions/process-recognition-batch`
3. 右键 → **上传并部署：云端安装依赖**

环境变量与 `recognize-clothing` + `generate-wardrobe-display` 相同：`MODEL_PROVIDER`（可选）、`MODEL_API_KEY`、`MODEL_API_BASE_URL`、`CHAT_MODEL`、`IMAGE_MODEL`。出图尺寸见 `providers/ark/constants.js` 的 `VISION_SIZE`。

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

预期返回 `{ batchId, itemCount }`；失败时 batch 文档 `status` 为 `failed`，并按场景写入 `errorCode`：未识别到任何衣物 → `NOTHING_RECOGNIZED`；识别到的单品全部与资料性别不符 → `GENDER_MISMATCH`。两种情况均收**识图基础费 10**（识别 API 已完成）；第三方识别调用报错（`LLM_API_ERROR`）则整单释放不扣。

**性别过滤**：识别结果按 `userGender` 过滤 `audienceGender === 相反性别` 的单品。若同图部分单品不符，保留相符单品并写 `genderFilteredCount`（前端结果页据此 Toast「已按性别过滤部分单品」）；全部不符则批次失败。

## 6. 部署 save-wardrobe-items 云函数

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

## 6.5 credits 云函数（积分账户）

部署前须 `pnpm cf:sync-shared`（同步 `shared/utils/credits.js`、`shared/constants/credits.js`）。

右键 `cloudfunctions/credits` → **上传并部署：云端安装依赖**。

Console 验证：

```javascript
wx.cloud
  .callFunction({ name: "credits", data: { action: "balance" } })
  .then(console.log)
  .catch(console.error);
```

预期首次返回 `{ balance: 1000, frozen: 0, available: 1000, initialGranted: true }`。

积分扣费还挂载在 `process-recognition-batch`、`recommend-outfit`、`generate-tryon-image`、`generate-tryon-model`；修改 `shared/` 积分模块后须 sync 并**重新部署上述 5 个函数**。

定价为「基础费 **10**（Seed 调用收到响应即收）+ 成果费 **50**/张（Seedream 成功出图）」，成功价统一 **60**（识别 / 模特 / 试穿）；任一 API 报错即免对应费用。

## 6.6 recharge / pay-callback 云函数（积分充值）

部署前须 `pnpm cf:sync-shared`（同步 `shared/utils/recharge-order.js`、`shared/constants/recharge.js` 等）。

1. **先部署** `cloudfunctions/pay-callback`（支付结果通知）
2. 再部署 `cloudfunctions/recharge`（下单 / 查单补单）

### 控制台前置（真实收款）

- 微信公众平台为小程序开通 **微信支付**，绑定**个人商户号**
- 云开发控制台 → **设置** → **微信支付** → 绑定商户号
- 云函数 `recharge` 环境变量（可选）：`WECHAT_PAY_MCH_ID` = 商户号（作为 `unifiedOrder` 的 `subMchId`）
- 新建集合 `credit_orders`（见上文 schema）

未配置 `WECHAT_PAY_MCH_ID` 或未开通微信支付时，`createOrder` 返回 `PAY_NOT_CONFIGURED`，小程序提示「微信支付即将开放」。

### 调用示例

```javascript
// 创建订单（amountFen 单位：分，100 = ¥1）
wx.cloud
  .callFunction({
    name: "recharge",
    data: { action: "createOrder", amountFen: 600 },
  })
  .then(console.log)
  .catch(console.error);

// 支付成功后查单补单
wx.cloud
  .callFunction({
    name: "recharge",
    data: { action: "queryOrder", outTradeNo: "R..." },
  })
  .then(console.log)
  .catch(console.error);
```

充值按 **1 积分 = ¥0.01** 入账；单次 **¥1–¥200**。入账幂等：`pay-callback` 与 `queryOrder` 重复调用不会重复加积分。

修改 `shared/` 充值模块后须 sync 并**重新部署 `recharge` 与 `pay-callback`**。

## 7. 试穿相关云函数

### recommend-outfit

右键 `cloudfunctions/recommend-outfit` → **上传并部署：云端安装依赖**。

调用火山方舟 Seed 文本模型：`POST {MODEL_API_BASE_URL}/chat/completions`。

环境变量（云开发控制台 → `recommend-outfit` → 配置）：

| 变量名 | 说明 |
| ------ | ---- |
| `MODEL_API_KEY` | 火山方舟 API Key（可与其它云函数共用） |
| `MODEL_API_BASE_URL` | OpenAI 兼容基址，须含 `https://` |
| `CHAT_MODEL` | Seed 模型 ID，可与 `recognize-clothing` 相同 |

采样温度在代码内按场景写死（搭评 `0.3`），无需环境变量。

入参：`weather`、`season`、`profile`、`wardrobeByType`（按 typeName 分组的衣橱摘要）。

LLM 失败时回退规则推荐 `buildFallbackRecommendation`。

**积分**：成功返回 `{ recommendation }`（不再返回 `creditHoldId`）；搭评调用完成即结算基础费 **10**（200 已返回但内容不可用也收），第三方调用报错走本地回退则**不扣**。试穿图费 50 由 `generate-tryon-image` 单独预占/结算。

| 返回 message | 常见原因 |
| ------------ | -------- |
| `未配置 CHAT_MODEL` | 未设置 Seed 模型 ID 环境变量 |

### generate-tryon-image

右键 `cloudfunctions/generate-tryon-image` → **上传并部署：云端安装依赖**。

部署前若修改过 `cloudfunctions/shared/` 下 vision / 上传模块，或 `generate-tryon-image/constants/` 下试穿规则 / 模特配置，须先执行 `pnpm cf:sync-shared`（仅改 tryon 专属 constants 时可只部署该函数）。

调用火山方舟 **Seedream 图像生成 API**：`POST {MODEL_API_BASE_URL}/images/generations`（非 `/chat/completions`）。参考图通过 `image` 传入，顺序为：**图1 = 模特人物参考**（锁定脸型/发型/肤质，姿势不沿用模板）→ **图2 = 姿势体态参考**（每次从姿势库随机选取，仅管站姿与构图，不得复制面孔与服装）→ **图3 = 场景背景参考**（固定浅色工作室场景）→ **图4 起 = 衣物参考图**；缺任一参考时动态前移序号并降级为文案描述。文本需求通过 `prompt` 描述。输出尺寸来自 [`providers/ark/constants.js`](../providers/ark/constants.js) 的 `VISION_SIZE`（`1920x1920`，1:1，满足 Seedream 5.0 像素下限）。

场景约定（`tryon-image-rules.js`）：始终**全身**生活方式构图；有姿势参考时沿用图2 体态，无则回退文案姿势；有背景参考时严格沿用图3 场景，无则回退浅色纹理墙描述；光影按 `weatherConditionCode` 叠在背景之上（缺省按晴天暖日光）。固定参考 + 衣物合计不超过 10 张。

环境变量（云开发控制台 → `generate-tryon-image` → 配置）：

| 变量名 | 说明 |
| ------ | ---- |
| `MODEL_API_KEY` | 火山方舟 API Key（可与其它云函数共用） |
| `MODEL_API_BASE_URL` | OpenAI 兼容基址，须含 `https://` |
| `IMAGE_MODEL` | Hero 试穿图专用 Seedream 模型 ID，示例 `doubao-seedream-5-0-260128` |

入参：`imageFileIds[]`（衣物）、`heightCm`、`weightKg`、`gender`（`male`/`female`）、`pieceLabels[]`、`pieceTypeNames[]`、可选 `weatherConditionCode`（如 `sunny`/`rainy`，用于背景光影）。

成功时返回 `{ coverFileId, coverUrl }`，解析响应 `data[0].url` 或 `b64_json`。失败时返回 `{ error, message }`。

**积分**：本函数独立预占/结算**试穿图费 50**（搭评基础费 10 已由 `recommend-outfit` 结算）；性别拦截或试穿图失败只释放试穿图预占，不再额外扣费。

**性别一致性校验**：出图前校验启用模特已知性别与资料 `gender` 是否一致——预设取 `templateId` 前缀；自定义取生成时检测并存库的 `gender`。已知且相反时返回 `{ error: 'GENDER_MISMATCH', message: '试穿模特与您的性别不符，请更换' }` 并释放试穿图预占；模特性别未知（旧自定义数据）不拦截。

| 返回 message | 常见原因 |
| ------------ | -------- |
| `未配置 IMAGE_MODEL` | 未在 `generate-tryon-image` 云函数配置 Hero 专用模型 ID |
| `Seedream 未返回图片` | 模型 ID 无图像生成权限，或 prompt/参考图不符合要求 |

**固定模特模板（运行时按性别匹配）**：

- 匹配规则：仅按 `gender` 选择 `female-standard-*` / `male-standard-*`；发型变体 `01/02/03` 由用户 `openid` 稳定哈希决定；**身高体重不参与选图**（仍写入 prompt 作文案提示）。
- 缺图回退：目标变体无 fileID 时回退同性别 `*-standard-01`；仍无或临时链解析失败时降级为纯文案模式（不阻断试穿）。
- fileID 清单：[`generate-tryon-image/constants/model-template-file-ids.js`](../generate-tryon-image/constants/model-template-file-ids.js)。

上传并启用（一次性）：

1. 将 [`output/models/`](../output/models/) 下 `female/male-standard-{01,02,03}-1920.jpg` 上传到云存储目录 `models/`（微信开发者工具 → 云开发 → 云存储）。
2. 把各文件的 `cloud://...` fileID 填入 [`generate-tryon-image/constants/model-template-file-ids.js`](../generate-tryon-image/constants/model-template-file-ids.js) 对应键。
3. 执行 `pnpm cf:sync-shared`，再重新部署 `generate-tryon-image`。

**试穿姿势库（运行时随机选取）**：

- 匹配规则：每次生成从已配置的 `unisex-pose-01` … `unisex-pose-06` 中 **随机** 选取一张；仅管体态/构图，不得复制该图面孔、发型或服装。
- 缺图回退：全空或临时链解析失败时降级为文案姿势（不阻断试穿）。
- fileID 清单：[`generate-tryon-image/constants/pose-file-ids.js`](../generate-tryon-image/constants/pose-file-ids.js)。

上传并启用（一次性）：

1. 将 [`output/poses/`](../output/poses/) 下 `unisex-pose-0{1-6}-1920.jpg` 上传到云存储目录 `poses/`。
2. 把各文件的 `cloud://...` fileID 填入 [`generate-tryon-image/constants/pose-file-ids.js`](../generate-tryon-image/constants/pose-file-ids.js) 对应键。
3. 重新部署 `generate-tryon-image`。

**试穿场景背景**：

- 本地目录 [`output/tryon-bgs/`](../output/tryon-bgs/)，云存储 `tryon-bgs/`；当前使用 `light-scene-bg-1920.jpg`（浅色场景墙 + 地面 + 侧向柔光）。
- fileID 清单：[`generate-tryon-image/constants/tryon-bg-file-ids.js`](../generate-tryon-image/constants/tryon-bg-file-ids.js) 的 `LIGHT_SCENE_BG_FILE_ID`。
- 缺图回退：未配置或解析失败时降级为文案背景描述（不阻断试穿）。

上传并启用（一次性）：

1. 将 [`output/tryon-bgs/light-scene-bg-1920.jpg`](../output/tryon-bgs/light-scene-bg-1920.jpg) 上传到云存储目录 `tryon-bgs/`。
2. 把 `cloud://...` fileID 填入 [`generate-tryon-image/constants/tryon-bg-file-ids.js`](../generate-tryon-image/constants/tryon-bg-file-ids.js)。
3. 重新部署 `generate-tryon-image`。

**离线生成模特模板候选图**（非云函数部署）：

1. 在项目根目录 `.env.local` 配置与 `generate-tryon-image` 相同的 `MODEL_API_KEY`、`IMAGE_MODEL`（脚本固定竖版 `1600x2304`）。
2. 执行 `pnpm generate:model-templates`，默认生成 `female-standard` 的 3 张变体，输出至 `output/models/`（如 `female-standard-01-1920.jpg`）。
3. 可选 CLI 参数（直接追加在 `pnpm generate:model-templates` 后）：

| 参数 | 默认 | 说明 |
| ---- | ---- | ---- |
| `--preset <id>` | `female-standard` | preset ID 或 `all`（全部 19 张） |
| `--variant <n>` | 无 | 仅生成该 preset 第 n 个变体（1-based，不可与 `all` 同用） |
| `--help` | - | 列出 preset 与示例 |

可用 preset：`female-slim`、`female-standard`、`female-curvy`、`male-slim`、`male-standard`、`male-curvy`、`neutral`（1 变体）。Prompt 定义见 [`generate-tryon-image/constants/model-template-prompts.js`](../generate-tryon-image/constants/model-template-prompts.js)。当前运行时仅使用 `*-standard-*`。

4. 本地预览后可将选定图提交 git；启用试穿前须按上文上传云存储并填写 fileID。

### generate-tryon-model

「生成本人试穿模特」：上传本人照片（**全身照或清晰上半身照均可**）→ 严格校验照片人物性别 → Seedream 生成全身标准模特 → 写入 `user_profiles.customTryOnModels`（**检测 10 + 生成 50，成功共 60 积分/次**；检测调用完成即收基础费 10，被拦截或生成失败不产生生成费）。

右键 `cloudfunctions/generate-tryon-model` → **上传并部署：云端安装依赖**。

环境变量（云开发控制台 → `generate-tryon-model` → 配置）：

| 变量名 | 说明 |
| ------ | ---- |
| `MODEL_API_KEY` | 火山方舟 API Key（可与其它云函数共用） |
| `MODEL_API_BASE_URL` | OpenAI 兼容基址，须含 `https://` |
| `IMAGE_MODEL` | Seedream 模型 ID，用于生成模特图 |
| `CHAT_MODEL` | 视觉理解模型 ID（与 `process-recognition-batch` 相同），用于人物性别检测；**漏配会导致性别识别不可用、生成被全量阻断** |

入参：`sourceFileId`（本人照片 fileID）、`gender`（资料性别 `male`/`female`）。成功返回 `{ fileId, coverUrl, gender }`；`gender` 为生成时检测的人物性别，前端写入 `customTryOnModels[].gender` 供试穿一致性校验。

**严格性别校验**：出图前调用 `CHAT_MODEL` 检测照片人物性别，仅「确定性别 + 置信度 ≥ 0.7 + 与资料性别一致」放行；明确相反 → `{ error: 'GENDER_MISMATCH', message: '照片与您的性别不符，请更换照片' }`；无法识别 / 低置信 / 检测异常 / 缺模型 → `{ error: 'GENDER_UNKNOWN', ... }`。阻断时检测调用已完成收**基础费 10**（检测调用报错 / 缺配置则免费），生成费不产生。

**超时**：`config.json` 为 `timeout: 300`（检测 + 生图耗时较长）。

**隐私**：上传的本人照片会发送至第三方视觉 API（识别链路本就如此），请在对外文档注明。
