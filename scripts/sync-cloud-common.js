/**
 * 将 cloudfunctions/common/ 下的共享模块同步到各云函数目录。
 * 微信云函数按单目录独立部署，sibling 的 common/ 不会上传，须复制进函数包内。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SOURCE_DIR = path.join(ROOT, 'cloudfunctions', 'common')
const TARGET_FUNCTIONS = ['recognize-clothing', 'save-wardrobe-items']

function sync() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`源目录不存在: ${SOURCE_DIR}`)
    process.exit(1)
  }

  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith('.js'))
  if (files.length === 0) {
    console.warn('common/ 下没有 .js 文件，跳过同步')
    return
  }

  for (const fnName of TARGET_FUNCTIONS) {
    const targetDir = path.join(ROOT, 'cloudfunctions', fnName, 'common')
    fs.mkdirSync(targetDir, { recursive: true })

    for (const file of files) {
      const src = path.join(SOURCE_DIR, file)
      const dest = path.join(targetDir, file)
      fs.copyFileSync(src, dest)
      console.log(`已同步: ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`)
    }
  }

  console.log(`\n完成，共同步 ${files.length} 个文件到 ${TARGET_FUNCTIONS.length} 个云函数`)
}

sync()
