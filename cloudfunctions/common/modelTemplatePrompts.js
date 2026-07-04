/** 虚拟试穿模特模板图 — 文生图 prompt（离线生成用） */

/** 与 Hero / doubaoVision DEFAULT_HERO_SIZE 一致 */
const MODEL_TEMPLATE_SIZE = "1600x2304";

const PRESET_META = {
  "female-slim": { label: "女性偏瘦" },
  "female-standard": { label: "女性标准" },
  "female-curvy": { label: "女性偏丰满" },
  "male-slim": { label: "男性偏瘦" },
  "male-standard": { label: "男性标准" },
  "male-curvy": { label: "男性偏壮" },
  neutral: { label: "中性形象" },
};

const PRESET_IDS = Object.keys(PRESET_META);

const BODY_BY_PRESET = {
  "female-slim":
    "生成一张用于虚拟试穿的亚洲女性标准模特参考图。年龄约 22–28 岁，身高约 165cm，体型偏瘦修长，肩线自然，腰线清晰，四肢纤细但健康，整体比例匀称。面部五官清晰自然，淡妆或无妆，表情中性平和，直视镜头。",
  "female-standard":
    "生成一张用于虚拟试穿的亚洲女性标准模特参考图。年龄约 24–30 岁，身高约 168cm，体型标准匀称，肩腰臀比例自然，无夸张肌肉或过度纤瘦。面部五官清晰自然，淡妆或无妆，表情中性平和，直视镜头。",
  "female-curvy":
    "生成一张用于虚拟试穿的亚洲女性标准模特参考图。年龄约 25–32 岁，身高约 165cm，体型偏丰满圆润，肩宽与臀宽自然，腰腹有柔和曲线，整体健康自信。面部五官清晰自然，淡妆或无妆，表情中性平和，直视镜头。",
  "male-slim":
    "生成一张用于虚拟试穿的亚洲男性标准模特参考图。年龄约 22–28 岁，身高约 175cm，体型偏瘦，肩窄腰细，四肢修长，整体清瘦但精神。面部五官清晰自然，无妆，表情中性平和，直视镜头。",
  "male-standard":
    "生成一张用于虚拟试穿的亚洲男性标准模特参考图。年龄约 25–32 岁，身高约 178cm，体型标准匀称，肩宽适中，胸腹平坦自然，整体比例协调。面部五官清晰自然，无妆，表情中性平和，直视镜头。",
  "male-curvy":
    "生成一张用于虚拟试穿的亚洲男性标准模特参考图。年龄约 28–35 岁，身高约 175cm，体型偏壮实，肩宽胸厚，腰腹略圆润，整体健壮但不夸张。面部五官清晰自然，无妆，表情中性平和，直视镜头。",
  neutral:
    "生成一张用于虚拟试穿的中性形象标准模特参考图。年龄约 25–30 岁，身高约 170cm，体型标准匀称，面部与身形无明显性别特征，气质自然中性。表情中性平和，直视镜头。",
};

const FEMALE_HAIR_VARIANTS = [
  {
    suffix: "01",
    hairHint:
      "发型：黑色或深棕色及肩中长发，自然直发，简洁利落，不遮挡肩颈与上半身轮廓。",
  },
  {
    suffix: "02",
    hairHint:
      "发型：黑色或深棕色 shoulder-length 中长发，自然微卷，蓬松柔和，不遮挡肩颈与上半身轮廓。",
  },
  {
    suffix: "03",
    hairHint: "发型：黑色或深棕色低马尾，整洁干练，不遮挡肩颈与上半身轮廓。",
  },
];

const MALE_HAIR_VARIANTS = [
  {
    suffix: "01",
    hairHint:
      "发型：黑色或深棕色短发，清爽侧分，简洁利落，不遮挡耳朵与颈部线条。",
  },
  {
    suffix: "02",
    hairHint: "发型：黑色或深棕色自然短发，纹理感适中，不遮挡耳朵与颈部线条。",
  },
  {
    suffix: "03",
    hairHint:
      "发型：黑色或深棕色寸头或极短发型，干净精神，不遮挡耳朵与颈部线条。",
  },
];

function buildVariantsForPreset(presetId, hairVariants) {
  return hairVariants.map(({ suffix, hairHint }) => ({
    id: `${presetId}-${suffix}`,
    hairHint,
  }));
}

const VARIANTS_BY_PRESET = {
  "female-slim": buildVariantsForPreset("female-slim", FEMALE_HAIR_VARIANTS),
  "female-standard": buildVariantsForPreset(
    "female-standard",
    FEMALE_HAIR_VARIANTS
  ),
  "female-curvy": buildVariantsForPreset("female-curvy", FEMALE_HAIR_VARIANTS),
  "male-slim": buildVariantsForPreset("male-slim", MALE_HAIR_VARIANTS),
  "male-standard": buildVariantsForPreset("male-standard", MALE_HAIR_VARIANTS),
  "male-curvy": buildVariantsForPreset("male-curvy", MALE_HAIR_VARIANTS),
  neutral: [
    {
      id: "neutral-01",
      hairHint: "发型：黑色短发，简洁干净，不遮挡肩颈轮廓。",
    },
  ],
};

function buildPromptSuffix() {
  return `纯摄影风格，电商 lookbook 质感，柔和自然光，无强烈阴影。
背景为单一浅色柔和色调（浅灰或米白），简洁无杂物、无道具。
人物正面站立，自然放松，双臂自然垂于身体两侧，双脚与肩同宽。
全身构图，从头顶到鞋尖完整入镜；人物水平居中，头顶与画面上边缘留白适中，头部完整清晰可见，不得裁切头部。
身穿极简基础款：纯白色无图案圆领 T 恤、深色直筒长裤、简约白色休闲鞋；无外套、无配饰、无 logo。
肤质真实自然，保留细腻肤质与柔和光影，避免蜡像感、过度磨皮或塑料感。
画面中不得出现任何中文、英文、数字、标题、水印、UI 元素或文字。
仅输出一张高清人物参考图，无文字说明。`;
}

function assertPresetId(presetId) {
  if (!PRESET_META[presetId]) {
    throw new Error(
      `未知的 preset: ${presetId}。可用: ${PRESET_IDS.join(", ")}, all`
    );
  }
}

function getPresetVariants(presetId) {
  assertPresetId(presetId);
  return VARIANTS_BY_PRESET[presetId];
}

function listModelTemplatePresets() {
  return PRESET_IDS.map((id) => ({
    id,
    label: PRESET_META[id].label,
    variantCount: VARIANTS_BY_PRESET[id].length,
  }));
}

function buildModelTemplatePrompt(presetId, variantIndex) {
  assertPresetId(presetId);
  const body = BODY_BY_PRESET[presetId];
  const variants = VARIANTS_BY_PRESET[presetId];
  const variant = variants[variantIndex];
  if (!variant) {
    throw new Error(
      `preset ${presetId} 无效的变体索引: ${variantIndex}（共 ${variants.length} 个）`
    );
  }
  return `${body}
${variant.hairHint}

${buildPromptSuffix()}`;
}

function buildJobsForPreset(presetId, variantOneBased) {
  const variants = getPresetVariants(presetId);
  let indices;

  if (variantOneBased != null) {
    const n = Number(variantOneBased);
    if (!Number.isInteger(n) || n < 1 || n > variants.length) {
      throw new Error(
        `preset ${presetId} 的 --variant 须为 1–${variants.length} 的整数，收到: ${variantOneBased}`
      );
    }
    indices = [n - 1];
  } else {
    indices = variants.map((_, i) => i);
  }

  return indices.map((variantIndex) => {
    const variant = variants[variantIndex];
    return {
      presetId,
      variantIndex,
      id: variant.id,
      prompt: buildModelTemplatePrompt(presetId, variantIndex),
    };
  });
}

function resolveGenerationJobs({ preset = "female-standard", variant } = {}) {
  if (preset === "all") {
    if (variant != null) {
      throw new Error("--variant 不能与 --preset all 同时使用");
    }
    return PRESET_IDS.flatMap((presetId) => buildJobsForPreset(presetId, null));
  }

  assertPresetId(preset);
  return buildJobsForPreset(preset, variant);
}

module.exports = {
  MODEL_TEMPLATE_SIZE,
  PRESET_IDS,
  listModelTemplatePresets,
  getPresetVariants,
  buildPromptSuffix,
  buildModelTemplatePrompt,
  resolveGenerationJobs,
};
