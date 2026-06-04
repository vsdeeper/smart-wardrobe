# 云函数部署说明

## 1. 部署 chat 云函数

勿在云开发控制台网页「新建云函数」。使用本地目录上传：

1. `pnpm dev:weapp` 构建后，微信开发者工具打开**项目根目录**
2. 左侧文件树展开 `cloudfunctions/chat`
3. 右键 → **上传并部署：云端安装依赖**

若上传失败（ECONNRESET），可关闭 VPN 后重试，或使用 CLI：

```bash
npm i -g @cloudbase/cli
tcb login
tcb fn deploy chat -e cloudbase-d6gkz1xlx9adbfe51
```

## 2. 配置环境变量

云开发控制台 → **云函数** → `chat` → **配置** → **环境变量**：

| 变量名 | 说明 |
| --- | --- |
| `LLM_DEFAULT_PROVIDER` | 默认 `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `DEEPSEEK_API_BASE_URL` | 可选，默认 `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | 可选，默认 `deepseek-chat` |
| `DOUBAO_API_KEY` | 火山方舟 API Key |
| `DOUBAO_API_BASE_URL` | 可选，默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `DOUBAO_MODEL` | 方舟推理接入点 ID（`ep-` 前缀） |

API Key 仅配置在控制台，勿提交到 Git。

## 3. Console 验证

开发者工具 Console：

```javascript
// DeepSeek（默认）
Taro.cloud.callFunction({
  name: 'chat',
  data: { messages: [{ role: 'user', content: '你好' }] }
}).then(console.log)

// 豆包
Taro.cloud.callFunction({
  name: 'chat',
  data: {
    provider: 'doubao',
    messages: [{ role: 'user', content: '用三句话介绍秋季穿搭' }]
  }
}).then(console.log)
```

预期返回 `{ provider, model, content, usage }`。

或在页面代码中：

```typescript
import { chatWithLLM } from '@/services/ai'

const res = await chatWithLLM([{ role: 'user', content: '你好' }])
console.log(res.content)
```
