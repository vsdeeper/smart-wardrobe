/** 积分消耗与首赠常量（与 cloudfunctions/shared/constants/credits.js 对齐） */
export const INITIAL_GRANT = 1000;
export const RECOGNIZE_BASE = 10;
export const DISPLAY_IMAGE = 50;
export const TRYON_MODEL = 50;
export const OUTFIT_SESSION = 70;
export const DISPLAY_IMAGE_MAX_COUNT = 1;
export const RECOGNIZE_HOLD_MAX =
  RECOGNIZE_BASE + DISPLAY_IMAGE * DISPLAY_IMAGE_MAX_COUNT;

export const CREDITS_ERROR_INSUFFICIENT = "INSUFFICIENT_CREDITS";
