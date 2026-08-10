/**
 * 离线生成通用衣物陈列电商底图（Seedream，与展示图共用 VISION_SIZE）
 *
 * 视觉方向：冷调软银灰无限影棚（cool soft silver cyclorama），
 * 刻意区别于现有暖米白 flat-lay 目录风；不引用 item-display-rules。
 *
 * 用法：
 *   1. 复制 .env.local.example → .env.local，填入 DOUBAO_API_KEY 等
 *   2. pnpm generate:display-templates [--variant <n>]
 *
 * 示例：
 *   pnpm generate:display-templates
 *   pnpm generate:display-templates --variant 2
 *   pnpm generate:display-templates --help
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output", "display-templates");

/** 冷调银灰 cyclorama 底图 prompt（独立视觉，非暖米白目录风） */
const DISPLAY_BG_PROMPT = `Professional e-commerce product photography background, empty studio cyclorama.
Cool soft silver-gray infinite backdrop with a subtle curved cove where floor meets wall, slight depth but no clutter.
Large softbox overhead lighting, even exposure, slightly cool color temperature — no warm yellow ambient light.
Clean central placement area occupying most of the frame, neutral and color-accurate for any garment type.
Photorealistic studio look, smooth seamless surface, no paper texture, no noise, no gradient tint, no vignette.
Absolutely empty scene: no clothing, no mannequin, no hanger, no props, no wood, no plants, no text, no watermark, no UI.
Square composition, product-ready empty stage.`;

const VARIANT_PROMPTS = [
  DISPLAY_BG_PROMPT,
  `${DISPLAY_BG_PROMPT}
Slightly brighter floor plane with a very subtle cool reflection, still empty.`,
  `${DISPLAY_BG_PROMPT}
Marginally darker upper backdrop, gentle falloff toward the top edge, still seamless and empty.`,
];

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
  generateSeedreamImage,
} = require("../cloudfunctions/shared/utils/doubao-vision");
const ark = require("../cloudfunctions/providers/ark/constants");

const OUTPUT_SIZE = ark.VISION_SIZE;
const REQUEST_DELAY_MS = 1500;

/**
 * 解析 CLI 参数。
 * @returns {{ variant: number | undefined; help: boolean }}
 */
function parseCliArgs(argv) {
  const args = { variant: undefined, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--variant") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--variant 需要指定 1-based 变体序号");
      }
      const n = Number(next);
      if (!Number.isInteger(n) || n < 1 || n > VARIANT_PROMPTS.length) {
        throw new Error(
          `--variant 须为 1–${VARIANT_PROMPTS.length} 的整数`
        );
      }
      args.variant = n;
      i += 1;
      continue;
    }
    throw new Error(`未知参数: ${arg}。使用 --help 查看用法`);
  }

  return args;
}

function printHelp() {
  console.log(`用法: pnpm generate:display-templates [--variant <n>]

参数:
  --variant <n>   生成第 n 个变体（1–${VARIANT_PROMPTS.length}，默认 1）
  --help, -h      显示此帮助

输出:
  ${OUTPUT_DIR}/display-bg-universal-0{n}.jpg
  尺寸: ${OUTPUT_SIZE}（正方形，与 VISION_SIZE 一致）

示例:
  pnpm generate:display-templates
  pnpm generate:display-templates --variant 1`);
}

/**
 * 根据 CLI 解析待生成的变体任务列表；未指定 --variant 时仅生成 01。
 * @param {{ variant?: number }} cli
 * @returns {{ id: string; prompt: string }[]}
 */
function resolveGenerationJobs(cli) {
  const variant = cli.variant ?? 1;
  const index = variant - 1;
  return [
    {
      id: `display-bg-universal-0${variant}`,
      prompt: VARIANT_PROMPTS[index],
    },
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function main() {
  let cli;
  try {
    cli = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error("使用 --help 查看用法");
    process.exit(1);
  }

  if (cli.help) {
    printHelp();
    return;
  }

  if (!process.env.DOUBAO_API_KEY) {
    console.error(
      "缺少 DOUBAO_API_KEY。请复制 .env.local.example 为 .env.local，填入云函数环境变量后重试。"
    );
    process.exit(1);
  }
  if (!process.env.DOUBAO_VISION_MODEL) {
    console.error(
      "缺少 DOUBAO_VISION_MODEL。请复制 .env.local.example 为 .env.local，填入云函数环境变量后重试。"
    );
    process.exit(1);
  }

  const jobs = resolveGenerationJobs(cli);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(
    `任务数: ${jobs.length}，输出尺寸: ${OUTPUT_SIZE}（正方形，VISION_SIZE）`
  );

  let success = 0;
  let failed = 0;

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const destPath = path.join(OUTPUT_DIR, `${job.id}.jpg`);

    console.log(`\n[${i + 1}/${jobs.length}] 生成 ${job.id}…`);

    try {
      const result = await generateSeedreamImage({
        prompt: job.prompt,
        imageUrls: [],
        size: OUTPUT_SIZE,
      });
      await saveImageResult(result, destPath);
      console.log(`  已保存: ${destPath}`);
      success += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  失败: ${message}`);
      failed += 1;
    }

    if (i < jobs.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`\n完成: 成功 ${success}，失败 ${failed}`);
  console.log(`输出目录: ${OUTPUT_DIR}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
