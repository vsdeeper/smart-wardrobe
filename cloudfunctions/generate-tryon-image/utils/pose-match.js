/** 试穿姿势库随机匹配：从已配置的 fileID 中每次随机选取一张 */

const POSE_FILE_IDS = require('../constants/pose-file-ids')

/**
 * 收集所有已配置（非空）的姿势 fileID 条目。
 * @returns {Array<{ poseId: string, fileId: string }>}
 */
function listConfiguredPoses(fileIdMap = POSE_FILE_IDS) {
  const entries = Object.entries(fileIdMap || {})
  return entries
    .map(([poseId, fileId]) => {
      const trimmed = typeof fileId === 'string' ? fileId.trim() : ''
      return trimmed ? { poseId, fileId: trimmed } : null
    })
    .filter(Boolean)
}

/**
 * 从姿势库中随机选取一张已配置的参考图。
 * @returns {{ poseId: string, fileId: string } | null}
 */
function pickRandomPose(fileIdMap = POSE_FILE_IDS) {
  const configured = listConfiguredPoses(fileIdMap)
  if (configured.length === 0) return null

  const index = Math.floor(Math.random() * configured.length)
  return configured[index]
}

module.exports = {
  POSE_FILE_IDS,
  listConfiguredPoses,
  pickRandomPose,
}
