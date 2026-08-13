import type { Plugin } from "vite";

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

/**
 * 构建阶段拦截 *.test.* / *.spec.* 模块。
 * 未被 import 时不会触发；一旦误入依赖图则 fail-fast，避免打进 dist。
 */
export function excludeTestFilesPlugin(): Plugin {
  return {
    name: "exclude-test-files",
    enforce: "pre",
    load(id) {
      if (TEST_FILE_PATTERN.test(id)) {
        throw new Error(
          `[build] 禁止打包测试文件: ${id}。请移除业务代码中对 *.test.* / *.spec.* 的 import。`,
        );
      }
      return null;
    },
  };
}
