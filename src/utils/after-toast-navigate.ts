/** 与微信/Taro showToast 默认 duration 对齐，避免跳转打断提示 */
export const TOAST_NAVIGATE_DELAY_MS = 1500;

export function afterToastNavigate(action: () => void): void {
  setTimeout(action, TOAST_NAVIGATE_DELAY_MS);
}
