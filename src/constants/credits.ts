/** 积分消耗与首赠常量（与 cloudfunctions/shared/constants/credits.js 对齐） */
export const INITIAL_GRANT = 1000;

/** 基础费：Seed 视觉/文本调用（识图、人物性别检测、搭评）收到 200 响应即收 */
export const BASE_FEE = 10;
/** 成果费：Seedream 成功出图每张（展示图、试穿图、模特生成图） */
export const IMAGE_FEE = 50;

/** 语义别名（识别保持原名，值 = BASE_FEE/IMAGE_FEE） */
export const RECOGNIZE_BASE = BASE_FEE;
export const DISPLAY_IMAGE = IMAGE_FEE;
export const DISPLAY_IMAGE_MAX_COUNT = 1;
export const RECOGNIZE_HOLD_MAX =
  RECOGNIZE_BASE + DISPLAY_IMAGE * DISPLAY_IMAGE_MAX_COUNT;

/** 生成本人模特：检测基础费 + 生成费 */
export const TRYON_MODEL_BASE = BASE_FEE;
export const TRYON_MODEL_GEN = IMAGE_FEE;
export const TRYON_MODEL_TOTAL = BASE_FEE + IMAGE_FEE;

/** AI 试穿：搭评基础费 + 试穿图费 */
export const OUTFIT_BASE = BASE_FEE;
export const OUTFIT_IMAGE = IMAGE_FEE;
export const OUTFIT_TOTAL = BASE_FEE + IMAGE_FEE;

export const CREDITS_ERROR_INSUFFICIENT = "INSUFFICIENT_CREDITS";
