/**
 * 本地联调：衣物识别 + 指定背景展示图（Seed 识别 → Seedream 双参考生图）
 *
 * 仅用于快速观察「识别 → 指定背景合成」的效果稳定性与预期差距；
 * 不走微信云函数 / fileID，不改动线上 wardrobe-display-pipeline。
 *
 * 用法：
 *   1. 复制 .env.local.example → .env.local，填入 MODEL_API_KEY、CHAT_MODEL、IMAGE_MODEL 等
 *   2. pnpm test:recognize-display --image <衣物图> [--bg <背景图>] [--gender male|female] [--out <目录>] [--limit <n>]
 *
 * 示例：
 *   pnpm test:recognize-display --image ./sample.jpg
 *   pnpm test:recognize-display --image ./sample.jpg --bg output/item-bgs/clothing-wall-bg-1920-light.jpg
 *   pnpm test:recognize-display --image ./sample.jpg --gender female --limit 2
 *   pnpm test:recognize-display --help
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_BG = path.join(
  ROOT,
  "output",
  "item-bgs",
  "clothing-wall-bg-1920-light.jpg",
);
const DEFAULT_OUTPUT_ROOT = path.join(ROOT, "output", "recognition-bg-test");
const MAX_ITEMS = 5;
const REQUEST_DELAY_MS = 1500;

/** 与 item-display-rules 对齐的品类约束（仅用于 prompt 文案） */
const TYPE_CONSTRAINTS = {
  上装: {
    include: "仅上装（T恤/衬衫/卫衣等），平铺或挂拍",
    exclude: "下装、鞋靴、外套叠穿、模特",
  },
  下装: {
    include: "仅裤装/半裙/短裤",
    exclude: "上装、鞋靴、模特",
  },
  连衣裙: {
    include: "仅整条连衣裙",
    exclude: "上下分体、外套、鞋靴、模特",
  },
  外套: {
    include: "仅外套/大衣/夹克",
    exclude: "内搭上下装、鞋靴、模特",
  },
  运动: {
    include: "仅识别出的那件运动类单品",
    exclude: "其他品类、模特",
  },
  鞋靴: {
    include: "仅鞋/靴（一双或单只产品图）",
    exclude: "全身、裤脚、上装、模特",
  },
  配饰: {
    include: "仅该配饰（包/帽/围巾/腰带等）",
    exclude: "成衣、鞋靴、模特",
  },
  其他: {
    include: "仅识别出的那件单品",
    exclude: "任何额外衣物、模特",
  },
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));

try {
  require("dotenv").config({ path: path.join(ROOT, ".env.local") });
} catch {
  // dotenv 未安装时依赖上方 loadEnvFile 或 shell 环境变量
}

const {
  recognizeItemsFromImage,
} = require("../cloudfunctions/shared/utils/seed-recognize");
const {
  filterItemsByUserGender,
  RECOGNITION_LIMITS,
} = require("../cloudfunctions/shared/constants/recognition-rules");
const { generateImages } = require("../cloudfunctions/shared/utils/model-env");
const {
  getChatModel,
  getImageModel,
} = require("../cloudfunctions/shared/utils/model-env");
const ark = require("../cloudfunctions/providers/ark/constants");

const OUTPUT_SIZE = ark.VISION_SIZE;

/**
 * 过滤 pnpm/npm 传入的 `--` 参数分隔符。
 * @param {string[]} argv
 * @returns {string[]}
 */
function normalizeArgv(argv) {
  return argv.filter((arg) => arg !== "--");
}

/**
 * 解析 CLI 参数。
 * @returns {{ image?: string; bg: string; gender?: string; out?: string; limit?: number; help: boolean }}
 */
function parseCliArgs(argv) {
  const args = {
    image: undefined,
    bg: DEFAULT_BG,
    gender: undefined,
    out: undefined,
    limit: undefined,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--image") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--image 需要指定衣物原图路径");
      }
      args.image = next;
      i += 1;
      continue;
    }
    if (arg === "--bg") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--bg 需要指定背景图路径");
      }
      args.bg = next;
      i += 1;
      continue;
    }
    if (arg === "--gender") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--gender 需要指定 male 或 female");
      }
      if (next !== "male" && next !== "female") {
        throw new Error("--gender 仅支持 male 或 female");
      }
      args.gender = next;
      i += 1;
      continue;
    }
    if (arg === "--out") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--out 需要指定输出目录");
      }
      args.out = next;
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--limit 需要指定正整数");
      }
      const n = Number(next);
      if (!Number.isInteger(n) || n < 1 || n > MAX_ITEMS) {
        throw new Error(`--limit 须为 1–${MAX_ITEMS} 的整数`);
      }
      args.limit = n;
      i += 1;
      continue;
    }
    throw new Error(`未知参数: ${arg}。使用 --help 查看用法`);
  }

  return args;
}

function printHelp() {
  console.log(`用法: pnpm test:recognize-display --image <衣物图> [选项]

参数:
  --image <path>     必填，衣物原图本地路径
  --bg <path>        背景图路径（默认 ${path.relative(ROOT, DEFAULT_BG)}）
  --gender <g>       可选，male | female，过滤相反性别单品
  --out <dir>        输出目录（默认 output/recognition-bg-test/<timestamp>/）
  --limit <n>        最多生成几件（1–${MAX_ITEMS}，默认识别结果全部，上限 ${MAX_ITEMS}）
  --help, -h         显示此帮助

环境变量（.env.local）:
  MODEL_PROVIDER=ark（可选，缺省 ark）
  MODEL_API_KEY、MODEL_API_BASE_URL
  CHAT_MODEL（识别）、IMAGE_MODEL（生图）

输出:
  recognition.json   识别结果
  meta.json          入参、模型、耗时
  01-<slug>.jpg …    各单品展示图（${OUTPUT_SIZE}）

示例:
  pnpm test:recognize-display --image ./sample.jpg
  pnpm test:recognize-display --image ./sample.jpg --bg output/item-bgs/clothing-wall-bg-1920-light.jpg
  pnpm test:recognize-display --image ./sample.jpg --gender female --limit 2`);
}

/**
 * 将本地图片读为 data URL，供 Seed / Seedream 使用。
 * @param {string} filePath
 * @returns {string}
 */
function readLocalImageAsDataUrl(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`图片不存在: ${abs}`);
  }
  const ext = path.extname(abs).slice(1).toLowerCase() || "jpeg";
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";
  const base64 = fs.readFileSync(abs).toString("base64");
  return `data:${mime};base64,${base64}`;
}

/**
 * 构造指定背景双参考展示图 prompt。
 * @param {{ typeName: string; name: string; tags?: string[] }} item
 * @returns {string}
 */
function buildBgRefDisplayPrompt(item) {
  const typeName = String(item.typeName ?? "").trim();
  const name = String(item.name ?? "").trim();
  const tags = Array.isArray(item.tags) ? item.tags.join("、") : "";
  const rule = TYPE_CONSTRAINTS[typeName] || TYPE_CONSTRAINTS.其他;

  return `参考附带图片：
- 图1：目标背景场景（空场景，保持其色调、光感、地面/墙面透视与质感）
- 图2：衣物原图（从中提取指定单品）

请从图2原图中提取下列衣物单品，生成 1 张产品展示图，将该单品自然放置于图1背景场景的中央区域（平铺或挂拍均可）。

<target_item>
品类：${typeName}
名称：${name}${tags ? `\n标签：${tags}` : ""}
画面应含：${rule.include}
禁止：${rule.exclude}
</target_item>

【背景与合成硬性要求 — 最高优先级】
- 背景必须严格沿用图1的场景：色调、明暗、光向、地面/墙面关系不得被替换为其他风格
- 单品与背景光向一致；允许柔和接触投影，使单品贴地/贴台；禁止硬阴影、黑色阴影块
- 禁止改变背景构图、添加新道具、家具、植物、文字、水印或 UI

【提取要求】
- 从图2对应位置/区域提取，保留原图该件的款式、颜色、材质、图案，以及衣物上的品牌 logo、标贴、印花文字等细节（须与原图一致，不得抹除或篡改）
- 单品居中，约占画面 85–90%；四边各留约 5–8% 空白，不得留大片空边，也不得贴边裁切衣物
- 无模特；只含目标单品，不含图2中其他衣物
- 画面中不得出现原图以外的叠加文字、照片水印、边框或 UI 元素；衣物本体上的 logo/印花除外`;
}

/**
 * 将名称转为安全文件名 slug。
 * @param {string} name
 * @returns {string}
 */
function slugifyName(name) {
  const raw = String(name ?? "item")
    .trim()
    .slice(0, 40)
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return raw || "item";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 保存 Seedream 返回的图片到本地。
 * @param {{ url?: string | null; b64?: string | null }} result
 * @param {string} destPath
 */
async function saveImageResult(result, destPath) {
  if (result.url) {
    const res = await fetch(result.url);
    if (!res.ok) {
      throw new Error(`下载图片失败: HTTP ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
    return;
  }

  if (result.b64) {
    const raw = String(result.b64).trim();
    const match = raw.match(/^data:image\/(\w+);base64,(.+)$/);
    const base64Body = match ? match[2] : raw;
    fs.writeFileSync(destPath, Buffer.from(base64Body, "base64"));
    return;
  }

  throw new Error("Seedream 未返回 url 或 b64");
}

/**
 * 生成默认带时间戳的输出目录。
 * @returns {string}
 */
function createDefaultOutputDir() {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  return path.join(DEFAULT_OUTPUT_ROOT, stamp);
}

async function main() {
  let cli;
  try {
    cli = parseCliArgs(normalizeArgv(process.argv.slice(2)));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error("使用 --help 查看用法");
    process.exit(1);
  }

  if (cli.help) {
    printHelp();
    return;
  }

  if (!cli.image) {
    console.error("缺少 --image 参数");
    printHelp();
    process.exit(1);
  }

  if (!process.env.MODEL_API_KEY) {
    console.error(
      "缺少 MODEL_API_KEY。请复制 .env.local.example 为 .env.local 后重试。",
    );
    process.exit(1);
  }
  try {
    getChatModel();
    getImageModel();
  } catch (err) {
    console.error(
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }

  const chatModel = getChatModel();
  const imageModel = getImageModel();

  const imagePath = path.resolve(cli.image);
  const bgPath = path.resolve(cli.bg);
  const outDir = path.resolve(cli.out || createDefaultOutputDir());

  fs.mkdirSync(outDir, { recursive: true });

  console.log("=== 识别 + 指定背景展示图测试 ===");
  console.log(`衣物原图: ${imagePath}`);
  console.log(`背景图:   ${bgPath}`);
  console.log(`输出目录: ${outDir}`);
  console.log(`输出尺寸: ${OUTPUT_SIZE}`);

  const startedAt = Date.now();
  const meta = {
    startedAt: new Date(startedAt).toISOString(),
    imagePath,
    bgPath,
    gender: cli.gender ?? null,
    limit: cli.limit ?? null,
    models: {
      chat: chatModel,
      image: imageModel,
    },
    outputSize: OUTPUT_SIZE,
  };

  const sourceDataUrl = readLocalImageAsDataUrl(imagePath);
  const bgDataUrl = readLocalImageAsDataUrl(bgPath);

  console.log("\n[1/2] Seed 识别衣物单品…");
  const recognizeStarted = Date.now();
  let rawItems;
  try {
    rawItems = await recognizeItemsFromImage(sourceDataUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`识别失败: ${message}`);
    process.exit(1);
  }
  const recognizeMs = Date.now() - recognizeStarted;
  console.log(`  识别耗时: ${recognizeMs}ms，原始 ${rawItems.length} 件`);

  const genderResult = filterItemsByUserGender(rawItems, cli.gender);
  let items = genderResult.items;
  if (genderResult.filteredCount > 0) {
    console.log(`  性别过滤: 移除 ${genderResult.filteredCount} 件`);
  }

  const maxLimit = cli.limit ?? Math.min(items.length, RECOGNITION_LIMITS.maxItems);
  items = items.slice(0, maxLimit);

  if (items.length === 0) {
    console.error("识别结果为空，无法生成展示图");
    fs.writeFileSync(
      path.join(outDir, "recognition.json"),
      JSON.stringify({ rawItems, items: [], filteredCount: genderResult.filteredCount }, null, 2),
      "utf8",
    );
    process.exit(1);
  }

  fs.writeFileSync(
    path.join(outDir, "recognition.json"),
    JSON.stringify(
      {
        rawItems,
        items,
        filteredCount: genderResult.filteredCount,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\n[2/2] Seedream 生成展示图（${items.length} 件）…`);

  const displayResults = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const index = String(i + 1).padStart(2, "0");
    const slug = slugifyName(item.name);
    const destPath = path.join(outDir, `${index}-${slug}.jpg`);
    const prompt = buildBgRefDisplayPrompt(item);

    console.log(`\n  [${i + 1}/${items.length}] ${item.typeName} · ${item.name}`);

    const genStarted = Date.now();
    try {
      const { images } = await generateImages({
        prompt,
        imageUrls: [bgDataUrl, sourceDataUrl],
        maxImages: 1,
        size: OUTPUT_SIZE,
      });
      await saveImageResult(images[0], destPath);
      const genMs = Date.now() - genStarted;
      console.log(`    已保存: ${destPath}（${genMs}ms）`);
      displayResults.push({
        item,
        outputFile: path.basename(destPath),
        durationMs: genMs,
        status: "ok",
      });
      success += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const genMs = Date.now() - genStarted;
      console.error(`    失败: ${message}`);
      displayResults.push({
        item,
        durationMs: genMs,
        status: "failed",
        error: message,
      });
      failed += 1;
    }

    if (i < items.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  const totalMs = Date.now() - startedAt;
  meta.finishedAt = new Date().toISOString();
  meta.durationMs = totalMs;
  meta.recognizeDurationMs = recognizeMs;
  meta.itemCount = items.length;
  meta.successCount = success;
  meta.failedCount = failed;
  meta.displayResults = displayResults;

  fs.writeFileSync(
    path.join(outDir, "meta.json"),
    JSON.stringify(meta, null, 2),
    "utf8",
  );

  console.log(`\n完成: 识别 ${items.length} 件，生图成功 ${success}，失败 ${failed}`);
  console.log(`总耗时: ${totalMs}ms`);
  console.log(`输出目录: ${outDir}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
