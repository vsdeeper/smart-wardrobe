/** 第 1 件 large；中间双列；末行单条 wide */
export function getCardLayout(
  index: number,
  total: number,
): 'large' | 'wide' | undefined {
  if (index === 0) return 'large'
  const remaining = total - 1
  if (remaining % 2 === 1 && index === total - 1) return 'wide'
  return undefined
}
