/**
 * 将 cloudfunctions/common/ 下的共享模块按云函数按需同步。
 * 微信云函数按单目录独立部署，sibling 的 common/ 不会上传，须复制进函数包内。
 * SYNC_MAP 路径相对 common/，支持子目录（如 providers/ark/index.js）。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'cloudfunctions', 'common')

/** 各云函数需要同步的 common 文件（相对 common/，可用正斜杠） */
const SYNC_MAP = {
  'recognize-clothing': ['recognitionRules.js', 'wardrobeSave.js', 'env.js'],
  'generate-wardrobe-display': [
    'doubaoVision.js',
    'itemDisplayImageRules.js',
    'env.js',
    'providers/ark/index.js',
  ],
  'process-recognition-batch': [
    'recognitionRules.js',
    'doubaoVision.js',
    'itemDisplayImageRules.js',
    'env.js',
    'providers/ark/index.js',
  ],
  'save-wardrobe-items': ['wardrobeSave.js'],
  'recommend-outfit': ['recommendOutfitRules.js', 'env.js'],
  'generate-tryon-image': [
    'doubaoVision.js',
    'tryonImageRules.js',
    'modelTemplateMatch.js',
    'modelTemplateFileIds.js',
    'env.js',
    'providers/ark/index.js',
  ],
}

/** 递归列出目录下所有 .js 的相对路径（posix 风格） */
function listJsFilesRelative(dir, baseDir = dir) {
  const results = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...listJsFilesRelative(abs, baseDir))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(path.relative(baseDir, abs).split(path.sep).join('/'))
    }
  }
  return results
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

function sync() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`源目录不存在: ${SOURCE_DIR}`)
    process.exit(1)
  }

  let copied = 0

  for (const [fnName, files] of Object.entries(SYNC_MAP)) {
    const targetDir = path.join(ROOT, 'cloudfunctions', fnName, 'common')
    fs.mkdirSync(targetDir, { recursive: true })

    const allowed = new Set(files.map((f) => f.split(path.sep).join('/')))

    for (const file of files) {
      const rel = file.split('/').join(path.sep)
      const src = path.join(SOURCE_DIR, rel)
      if (!fs.existsSync(src)) {
        console.error(`源文件不存在: ${src}`)
        process.exit(1)
      }
      const dest = path.join(targetDir, rel)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      console.log(`已同步: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`)
      copied += 1
    }

    for (const rel of listJsFilesRelative(targetDir)) {
      if (allowed.has(rel)) continue
      const stale = path.join(targetDir, rel.split('/').join(path.sep))
      fs.unlinkSync(stale)
      console.log(`已移除过期文件: ${path.relative(ROOT, stale)}`)
    }
    removeEmptyDirs(targetDir, targetDir)
  }

  console.log(`\n完成，共同步 ${copied} 个文件到 ${Object.keys(SYNC_MAP).length} 个云函数`)
}

sync()
