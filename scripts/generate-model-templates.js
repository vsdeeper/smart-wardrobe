/**
 * 离线生成模特模板候选图（调用 Seedream，与 generate-tryon-image 共用配置）
 *
 * 用法：
 *   1. 复制 .env.local.example → .env.local，填入 DOUBAO_API_KEY 等
 *   2. pnpm generate:model-templates [--preset <id>] [--variant <n>]
 *
 * 示例：
 *   pnpm generate:model-templates                              # female-standard × 3
 *   pnpm generate:model-templates --preset male-standard         # 男性标准 × 3
 *   pnpm generate:model-templates --preset neutral               # 中性 × 1
 *   pnpm generate:model-templates --preset all                   # 全部 19 张
 *   pnpm generate:model-templates --preset female-slim --variant 1
 *   pnpm generate:model-templates --help
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output", "model-templates");

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
const {
  MODEL_TEMPLATE_SIZE,
  listModelTemplatePresets,
  resolveGenerationJobs,
} = require("../cloudfunctions/generate-tryon-image/constants/model-template-prompts");

const REQUEST_DELAY_MS = 1500;
const TEMPLATE_OUTPUT_SIZE = "4K";

function parseCliArgs(argv) {
  const args = { preset: "female-standard", variant: undefined, help: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--preset") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--preset 需要指定 preset ID 或 all");
      }
      args.preset = next;
      i += 1;
      continue;
    }
    if (arg === "--variant") {
      const next = argv[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("--variant 需要指定 1-based 变体序号");
      }
      args.variant = next;
      i += 1;
      continue;
    }
    throw new Error(`未知参数: ${arg}。使用 --help 查看用法`);
  }

  return args;
}

function printHelp() {
  console.log(`用法: pnpm generate:model-templates [--preset <id>] [--variant <n>]

参数:
  --preset <id>   preset ID 或 all（默认 female-standard）
  --variant <n>   仅生成该 preset 的第 n 个变体（1-based，不可与 all 同用）
  --help, -h      显示此帮助

可用 preset:`);
  for (const item of listModelTemplatePresets()) {
    console.log(
      `  ${item.id.padEnd(16)} ${item.label}（${item.variantCount} 变体）`
    );
  }
  console.log(`  ${"all".padEnd(16)} 全部 preset（共 19 张）

示例:
  pnpm generate:model-templates
  pnpm generate:model-templates --preset male-standard
  pnpm generate:model-templates --preset female-standard --variant 2
  pnpm generate:model-templates --preset all`);
}

function assertPortraitSize(size) {
  const match = String(size).match(/^(\d+)x(\d+)$/i);
  if (!match) return;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width >= height) {
    console.warn(
      `警告: 输出尺寸 ${size} 非竖版（宽≥高），模特模板建议使用 ${MODEL_TEMPLATE_SIZE}`
    );
  }
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

  let jobs;
  try {
    jobs = resolveGenerationJobs({ preset: cli.preset, variant: cli.variant });
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.error("使用 --help 查看可用 preset");
    process.exit(1);
  }

  if (!process.env.DOUBAO_API_KEY) {
    console.error(
      "缺少 DOUBAO_API_KEY。请复制 .env.local.example 为 .env.local，填入云函数 generate-tryon-image 的环境变量后重试。"
    );
    process.exit(1);
  }
  if (!process.env.DOUBAO_VISION_MODEL) {
    console.error(
      "缺少 DOUBAO_VISION_MODEL。请复制 .env.local.example 为 .env.local，填入云函数 generate-tryon-image 的环境变量后重试。"
    );
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  assertPortraitSize(TEMPLATE_OUTPUT_SIZE);
  console.log(
    `preset: ${cli.preset}${cli.variant != null ? `, variant: ${cli.variant}` : ""}`
  );
  console.log(
    `任务数: ${jobs.length}，输出尺寸: ${TEMPLATE_OUTPUT_SIZE}（竖版）`
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
        size: TEMPLATE_OUTPUT_SIZE,
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
