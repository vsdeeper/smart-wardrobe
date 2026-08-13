/**
 * 将用户输入的元字符串转为分（整数）；无效或越界返回 null。
 */
export function parseYuanToFen(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const yuan = Number(trimmed);
  if (!Number.isFinite(yuan) || yuan <= 0) return null;

  const fen = Math.round(yuan * 100);
  if (!Number.isInteger(fen) || fen <= 0) return null;
  return fen;
}

/**
 * 分转展示用元字符串（去掉多余尾零）。
 */
export function formatFenToYuanLabel(fen: number): string {
  if (!(fen > 0)) return "0";
  const yuan = fen / 100;
  if (Number.isInteger(yuan)) return String(yuan);
  return yuan.toFixed(2).replace(/\.?0+$/, "");
}
