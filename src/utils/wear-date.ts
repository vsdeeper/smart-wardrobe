import { WEAR_FORECAST_DAYS } from "@/constants/wear-date";
import { getDateKey } from "@/utils/season";

export { getDateKey };

/** 将 YYYY-MM-DD 解析为本地零点 Date */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 在 dateKey 上加 days 天，返回 YYYY-MM-DD */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

export function getTomorrowDateKey(today = getDateKey()): string {
  return addDaysToDateKey(today, 1);
}

/** Picker 起始日：后天 */
export function getMinCustomWearDateKey(today = getDateKey()): string {
  return addDaysToDateKey(today, 2);
}

/** 可选上限：今天 + (WEAR_FORECAST_DAYS - 1) */
export function getMaxWearDateKey(today = getDateKey()): string {
  return addDaysToDateKey(today, WEAR_FORECAST_DAYS - 1);
}

export function isTodayDateKey(
  dateKey: string,
  today = getDateKey(),
): boolean {
  return dateKey === today;
}

export function isTomorrowDateKey(
  dateKey: string,
  today = getDateKey(),
): boolean {
  return dateKey === getTomorrowDateKey(today);
}

export function isCustomWearDateKey(
  dateKey: string,
  today = getDateKey(),
): boolean {
  return !isTodayDateKey(dateKey, today) && !isTomorrowDateKey(dateKey, today);
}

/** 相对今天的日偏移（今天=0，明天=1…） */
export function getWearDateOffset(
  dateKey: string,
  today = getDateKey(),
): number {
  const start = parseDateKey(today).getTime();
  const target = parseDateKey(dateKey).getTime();
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

/** v1 daily API 的 days 参数：刚好覆盖目标日 */
export function getForecastDaysParam(
  dateKey: string,
  today = getDateKey(),
): number {
  return getWearDateOffset(dateKey, today) + 1;
}

export function isWearDateKeyWithinForecastRange(
  dateKey: string,
  today = getDateKey(),
): boolean {
  const offset = getWearDateOffset(dateKey, today);
  return offset >= 0 && offset < WEAR_FORECAST_DAYS;
}

export function isWearDateKeySelectableInPicker(
  dateKey: string,
  today = getDateKey(),
): boolean {
  if (!isWearDateKeyWithinForecastRange(dateKey, today)) return false;
  return getWearDateOffset(dateKey, today) >= 2;
}

/** Chip / 标题展示：今天 / 明天 / M月D日（跨年带 YYYY 前缀） */
export function formatWearDateChipLabel(
  dateKey: string,
  today = getDateKey(),
): string {
  if (isTodayDateKey(dateKey, today)) return "今天";
  if (isTomorrowDateKey(dateKey, today)) return "明天";
  const date = parseDateKey(dateKey);
  const todayDate = parseDateKey(today);
  const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
  if (date.getFullYear() !== todayDate.getFullYear()) {
    return `${date.getFullYear()}年${monthDay}`;
  }
  return monthDay;
}

/** 视觉日记标题用搭配名 */
export function formatWearOutfitTitle(
  dateKey: string,
  today = getDateKey(),
): string {
  if (isTodayDateKey(dateKey, today)) return "今日搭配";
  if (isTomorrowDateKey(dateKey, today)) return "明日搭配";
  return `${formatWearDateChipLabel(dateKey, today)}搭配`;
}
