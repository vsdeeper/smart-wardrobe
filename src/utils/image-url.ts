/** Seedream / 火山 TOS 等签名临时链，不可作为长期封面持久化 */
export function isEphemeralExternalImageUrl(url: string): boolean {
  return /volces\.com|volcengine\.com|ark-acg/i.test(url);
}
