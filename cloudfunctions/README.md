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
| `DOUBAO_MODEL`          | 方舟推理接入点 ID（`ep-` 前缀）                       |

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

### 安全规则示例

两个集合均使用：

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

云函数 `recognize-clothing`（`persist: true`）与 `save-wardrobe-items` 写入时会显式设置 `_openid`；小程序端查询时规则自动过滤当前用户数据。

## 6. 共享代码同步（部署衣橱相关云函数前必读）

`recognize-clothing` 与 `save-wardrobe-items` 共用 [`cloudfunctions/common/wardrobeSave.js`](cloudfunctions/common/wardrobeSave.js)。微信云函数**按单目录独立打包上传**，同级 `common/` 不会随函数部署，须在本地同步进各函数目录：

```bash
pnpm cf:sync-common
```

同步后各函数内会有 `common/wardrobeSave.js`（如 `cloudfunctions/recognize-clothing/common/wardrobeSave.js`）。**修改 `cloudfunctions/common/` 下源码后，须重新执行上述命令再上传部署。**

| 错误信息 | 常见原因 |
| -------- | -------- |
| `Cannot find module '../common/wardrobeSave'` | 未同步 common 或使用了旧的 `../common/` 引用；运行 `pnpm cf:sync-common` 后重新「上传并部署：云端安装依赖」 |

## 7. 部署 recognize-clothing 云函数

1. 执行 `pnpm cf:sync-common`（若刚修改过 common 或首次部署）
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
| `DOUBAO_VISION_MODEL` | 方舟**多模态**推理接入点 ID（`ep-` 前缀，与文本模型不同） |

须在[火山方舟控制台](https://console.volcengine.com/ark)创建支持图像理解的推理接入点，并将接入点 ID 填入 `DOUBAO_VISION_MODEL`。

### Console 验证

先通过小程序上传一张图片到云存储，取得 `fileID`，再调用：

```javascript
wx.cloud
  .callFunction({
    name: "recognize-clothing",
    data: { fileID: "cloud://xxx.jpg", persist: false },
  })
  .then(console.log)
  .catch(console.error);
```

预览模式（`persist: false`，小程序默认）预期返回 `{ preview: { name, typeName, tags, imageFileId } }`；`persist: true` 时直接入库，返回 `{ item, type, isNewType }`。失败时返回 `{ error, message }`。

### 故障排查

| 返回 message | 常见原因 |
| ------------ | -------- |
| `145 code exit unexpected` | SDK 在 `cloud.init()` 前调用 `cloud.database()`；确保已部署最新代码后重新「上传并部署：云端安装依赖」 |
| `Cannot find module '../common/wardrobeSave'` | 未同步 common；见第 6 节，运行 `pnpm cf:sync-common` 后重新部署 |
| `未配置 DOUBAO_VISION_MODEL` | 未设置多模态接入点环境变量 |
| `无法获取图片临时链接` | fileID 无效或云存储权限问题 |
| `AI 返回格式无效` | Vision 模型未按 JSON 格式返回，检查 prompt 或换模型 |
| `LLM_API_ERROR` | API Key 无效、接入点未开通 Vision、或配额用尽 |

页面内通过衣橱页 FAB 上传触发：`chooseMedia` → `uploadFile` → `callFunction('recognize-clothing')`（预览不入库，确认后由 `save-wardrobe-items` 批量入库）。

## 8. 部署 save-wardrobe-items 云函数

1. 执行 `pnpm cf:sync-common`（与 recognize-clothing 共用 common 模块）
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
| `Cannot find module '../common/wardrobeSave'` | 未同步 common；见第 6 节 |
| `缺少待入库衣物数据` | `items` 为空或非数组 |
| `无法获取用户身份` | 未登录或未初始化云开发 |
