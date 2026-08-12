/**
 * 从 user_profiles 读取用户启用的试穿模特 fileID。
 * 预设模特须与当前 gender 前缀一致；自定义模特直接返回。
 */

function isPresetCompatible(templateId, gender) {
  if (!templateId || !gender) return false
  return String(templateId).startsWith(`${gender}-standard-`)
}

async function resolveActiveTryOnModelFileId(db, openid, gender) {
  if (!openid) return null

  try {
    const res = await db
      .collection('user_profiles')
      .where({ _openid: openid })
      .limit(1)
      .get()

    const profile = res.data?.[0]
    const active = profile?.activeTryOnModel
    if (!active || typeof active.fileId !== 'string' || !active.fileId.trim()) {
      return null
    }

    if (active.source === 'preset') {
      if (!isPresetCompatible(active.templateId, gender)) {
        return null
      }
    }

    return active.fileId.trim()
  } catch {
    return null
  }
}

module.exports = { resolveActiveTryOnModelFileId };
