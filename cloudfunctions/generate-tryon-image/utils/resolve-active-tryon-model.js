/**
 * 从 user_profiles 读取用户启用的试穿模特 fileID 与模特性别。
 * 预设模特须与当前 gender 前缀一致（不兼容返回 null 走回退）；自定义模特直接返回。
 * modelGender：预设取 templateId 前缀；自定义取入库时检测的 gender（旧数据无该字段 → undefined = 未知）。
 */

function isPresetCompatible(templateId, gender) {
  if (!templateId || !gender) return false
  return String(templateId).startsWith(`${gender}-standard-`)
}

function derivePresetGender(templateId) {
  const value = String(templateId || '')
  if (value.startsWith('male-')) return 'male'
  if (value.startsWith('female-')) return 'female'
  return undefined
}

async function resolveActiveTryOnModel(db, openid, gender) {
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
      return {
        fileId: active.fileId.trim(),
        modelGender: derivePresetGender(active.templateId),
      }
    }

    const customEntry = (profile?.customTryOnModels || []).find(
      (entry) => entry && entry.fileId === active.fileId,
    )
    return {
      fileId: active.fileId.trim(),
      modelGender:
        customEntry?.gender === 'male' || customEntry?.gender === 'female'
          ? customEntry.gender
          : undefined,
    }
  } catch {
    return null
  }
}

module.exports = { resolveActiveTryOnModel };
