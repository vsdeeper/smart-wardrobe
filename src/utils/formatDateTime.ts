/** 将时间戳格式化为 YYYY-MM-DD HH:mm（本地时区） */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/** 更新时间缺失时回退到创建时间 */
export function formatUpdatedAt(
  updatedAt: number | undefined,
  createdAt: number,
): string {
  return formatDateTime(updatedAt ?? createdAt);
}
