/**
 * 将 cloudfunctions/shared/、cloudfunctions/providers/ 按需同步到各云函数包。
 * shared → ./utils/、./constants/；providers → ./providers/（与 shared 同级源码，函数包内扁平 providers/）。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED_SOURCE_DIR = path.join(ROOT, 'cloudfunctions', 'shared')
const PROVIDERS_SOURCE_DIR = path.join(ROOT, 'cloudfunctions', 'providers')
const MANIFEST_NAME = '.sync-manifest.json'

/** 各云函数需要同步的 shared 文件（相对 shared/） */
const SHARED_SYNC_MAP = {
  'recognize-clothing': [
    'utils/env.js',
    'utils/seed-recognize.js',
    'constants/recognition-rules.js',
  ],
  'generate-wardrobe-display': [
    'utils/env.js',
    'utils/doubao-vision.js',
    'utils/upload-generated-image.js',
    'utils/wardrobe-display-pipeline.js',
    'utils/resolve-display-bg-url.js',
    'constants/item-display-rules.js',
    'constants/display-bg-file-ids.js',
  ],
  'process-recognition-batch': [
    'utils/env.js',
    'utils/credits.js',
    'utils/doubao-vision.js',
    'utils/seed-recognize.js',
    'utils/upload-generated-image.js',
    'utils/wardrobe-display-pipeline.js',
    'utils/resolve-display-bg-url.js',
    'constants/credits.js',
    'constants/recognition-rules.js',
    'constants/item-display-rules.js',
    'constants/display-bg-file-ids.js',
  ],
  'generate-tryon-image': [
    'utils/env.js',
    'utils/credits.js',
    'utils/doubao-vision.js',
    'utils/upload-generated-image.js',
    'constants/credits.js',
  ],
  'generate-tryon-model': [
    'utils/env.js',
    'utils/credits.js',
    'utils/doubao-vision.js',
    'utils/upload-generated-image.js',
    'constants/credits.js',
  ],
  'recommend-outfit': ['utils/env.js', 'utils/credits.js', 'constants/credits.js'],
  credits: ['utils/credits.js', 'constants/credits.js'],
}

/** 各云函数需要同步的 providers 文件（相对 providers/） */
const PROVIDERS_SYNC_MAP = {
  'generate-wardrobe-display': ['ark/constants.js'],
  'process-recognition-batch': ['ark/constants.js'],
  'generate-tryon-image': ['ark/constants.js'],
  'generate-tryon-model': ['ark/constants.js'],
}

function readManifest(fnDir) {
  const manifestPath = path.join(fnDir, MANIFEST_NAME)
  if (!fs.existsSync(manifestPath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    return Array.isArray(parsed.files) ? parsed.files : []
  } catch {
    return []
  }
}

function writeManifest(fnDir, files) {
  const manifestPath = path.join(fnDir, MANIFEST_NAME)
  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ files: files.sort() }, null, 2)}\n`,
    'utf8',
  )
}

function transformSharedContent(rel, content) {
  if (rel === 'utils/doubao-vision.js') {
    return content.replace(
      "require('../../providers/ark/constants')",
      "require('../providers/ark/constants')",
    )
  }
  return content
}

/** 自底向上删除空目录（不删除 root 本身） */
function removeEmptyDirs(dir, root) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return
  for (const entry of fs.readdirSync(dir)) {
    const child = path.join(dir, entry)
    if (fs.statSync(child).isDirectory()) {
      removeEmptyDirs(child, root)
    }
  }
  if (dir === root) return
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
    console.log(`已移除空目录: ${path.relative(ROOT, dir)}`)
  }
}

function removeLegacyDirs(fnDir) {
  for (const legacyName of ['common', 'shared']) {
    const legacy = path.join(fnDir, legacyName)
    if (!fs.existsSync(legacy)) continue
    fs.rmSync(legacy, { recursive: true, force: true })
    console.log(`已移除旧 ${legacyName}/: ${path.relative(ROOT, legacy)}`)
  }
}

function removeStaleManifestFiles(fnDir, previous, allowed) {
  for (const rel of previous) {
    if (allowed.has(rel)) continue
    const stale = path.join(fnDir, rel.split('/').join(path.sep))
    if (!fs.existsSync(stale)) continue
    fs.unlinkSync(stale)
    console.log(`已移除过期同步文件: ${path.relative(ROOT, stale)}`)
    removeEmptyDirs(path.dirname(stale), fnDir)
  }
}

function syncBundle(fnName, sourceDir, files, destPrefix) {
  const fnDir = path.join(ROOT, 'cloudfunctions', fnName)
  let copied = 0

  for (const file of files) {
    const rel = file.split('/').join(path.sep)
    const src = path.join(sourceDir, rel)
    if (!fs.existsSync(src)) {
      console.error(`源文件不存在: ${src}`)
      process.exit(1)
    }
    const destRel = destPrefix ? `${destPrefix}/${file}` : file
    const dest = path.join(fnDir, destRel.split('/').join(path.sep))
    fs.mkdirSync(path.dirname(dest), { recursive: true })

    let content = fs.readFileSync(src, 'utf8')
    if (!destPrefix) {
      content = transformSharedContent(file, content)
    }
    fs.writeFileSync(dest, content, 'utf8')
    console.log(`已同步: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`)
    copied += 1
  }

  return copied
}

function sync() {
  if (!fs.existsSync(SHARED_SOURCE_DIR)) {
    console.error(`源目录不存在: ${SHARED_SOURCE_DIR}`)
    process.exit(1)
  }
  if (!fs.existsSync(PROVIDERS_SOURCE_DIR)) {
    console.error(`源目录不存在: ${PROVIDERS_SOURCE_DIR}`)
    process.exit(1)
  }

  const allFns = new Set([
    ...Object.keys(SHARED_SYNC_MAP),
    ...Object.keys(PROVIDERS_SYNC_MAP),
  ])

  let copied = 0

  for (const fnName of allFns) {
    const fnDir = path.join(ROOT, 'cloudfunctions', fnName)
    const sharedFiles = SHARED_SYNC_MAP[fnName] || []
    const providerFiles = PROVIDERS_SYNC_MAP[fnName] || []

    const allowed = new Set([
      ...sharedFiles,
      ...providerFiles.map((f) => `providers/${f}`),
    ])
    const previous = readManifest(fnDir)

    copied += syncBundle(fnName, SHARED_SOURCE_DIR, sharedFiles, '')
    copied += syncBundle(fnName, PROVIDERS_SOURCE_DIR, providerFiles, 'providers')

    removeStaleManifestFiles(fnDir, previous, allowed)
    writeManifest(fnDir, [...allowed])
    removeLegacyDirs(fnDir)
  }

  console.log(`\n完成，共同步 ${copied} 个文件到 ${allFns.size} 个云函数`)
}

sync()
