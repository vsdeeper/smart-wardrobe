/**
 * 将 cloudfunctions/common/ 下的共享模块按云函数按需同步。
 * 微信云函数按单目录独立部署，sibling 的 common/ 不会上传，须复制进函数包内。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'cloudfunctions', 'common')

/** 各云函数需要同步的 common 文件（相对 common/） */
const SYNC_MAP = {
  'recognize-clothing': ['recognitionRules.js', 'wardrobeSave.js'],
  'save-wardrobe-items': ['wardrobeSave.js'],
  'recommend-outfit': ['recommendOutfitRules.js'],
  'generate-tryon-image': ['doubaoVision.js', 'tryonImageRules.js'],
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

    const allowed = new Set(files)

    for (const file of files) {
      const src = path.join(SOURCE_DIR, file)
      if (!fs.existsSync(src)) {
        console.error(`源文件不存在: ${src}`)
        process.exit(1)
      }
      const dest = path.join(targetDir, file)
      fs.copyFileSync(src, dest)
      console.log(`已同步: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`)
      copied += 1
    }

    if (fs.existsSync(targetDir)) {
      for (const entry of fs.readdirSync(targetDir)) {
        if (!entry.endsWith('.js') || allowed.has(entry)) continue
        const stale = path.join(targetDir, entry)
        fs.unlinkSync(stale)
        console.log(`已移除过期文件: ${path.relative(ROOT, stale)}`)
      }
    }
  }

  console.log(`\n完成，共同步 ${copied} 个文件到 ${Object.keys(SYNC_MAP).length} 个云函数`)
}

sync()
