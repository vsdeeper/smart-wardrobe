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
