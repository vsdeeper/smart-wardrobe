/**
 * 从 NutUI variables.scss 提取 --nutui-* CSS 变量（仅单行 var(...) 默认值）
 * 生成 src/styles/theme/_nutui-components.scss
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const variablesPath = path.join(
  root,
  "node_modules/@nutui/nutui-react-taro/dist/styles/variables.scss",
);
const outPath = path.join(root, "src/styles/theme/_nutui-components.scss");

const content = fs.readFileSync(variablesPath, "utf8");

/** @type {Map<string, string>} */
const vars = new Map();

// 仅匹配单行：var(--nutui-*, default)
for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed.includes("var(--nutui-")) continue;
  if (trimmed.includes("\n")) continue;

  const re = /var\(\s*(--nutui-[a-z0-9-]+)\s*,\s*([^)]+)\)/g;
  let m;
  while ((m = re.exec(trimmed)) !== null) {
    const name = m[1];
    const def = m[2].trim();
    if (def.startsWith("$") || def.includes("$")) continue;
    if (def.includes("linear-gradient")) continue;
    if (!vars.has(name)) vars.set(name, def);
  }
}

/** L1/L2 已定义，L3 跳过 */
const skipInL3 = new Set([
  "--nutui-brand-1", "--nutui-brand-2", "--nutui-brand-3", "--nutui-brand-4",
  "--nutui-brand-5", "--nutui-brand-6", "--nutui-brand-7", "--nutui-brand-8",
  "--nutui-brand-9", "--nutui-brand-10", "--nutui-brand-stop-1", "--nutui-brand-stop-2",
  "--nutui-secondary-1",
  "--nutui-color-primary", "--nutui-color-primary-stop-1", "--nutui-color-primary-stop-2",
  "--nutui-color-primary-pressed", "--nutui-color-primary-disabled", "--nutui-color-primary-text",
  "--nutui-color-primary-light", "--nutui-color-primary-light-pressed",
  "--nutui-color-info", "--nutui-color-success", "--nutui-color-warning", "--nutui-color-danger",
  "--nutui-color-text-link", "--nutui-color-text-disabled",
  "--nutui-color-default", "--nutui-color-default-pressed", "--nutui-color-default-disabled",
  "--nutui-color-default-light",
  "--nutui-color-info-pressed", "--nutui-color-info-disabled", "--nutui-color-info-light",
  "--nutui-color-info-background",
  "--nutui-color-success-pressed", "--nutui-color-success-disabled", "--nutui-color-success-light",
  "--nutui-color-success-background",
  "--nutui-color-warning-pressed", "--nutui-color-warning-disabled", "--nutui-color-warning-light",
  "--nutui-color-warning-background",
  "--nutui-color-danger-pressed", "--nutui-color-danger-disabled", "--nutui-color-danger-light",
  "--nutui-color-danger-background",
  "--nutui-color-surface-1", "--nutui-color-surface-2", "--nutui-color-surface-3",
  "--nutui-color-surface-4", "--nutui-color-surface-overlay",
  "--nutui-color-title", "--nutui-color-text", "--nutui-color-text-help", "--nutui-color-text-dark",
  "--nutui-color-surface-container", "--nutui-color-surface-dim",
  "--nutui-color-secondary", "--nutui-color-secondary-container", "--nutui-color-tertiary",
  "--nutui-gray-0", "--nutui-gray-1", "--nutui-gray-2", "--nutui-gray-3", "--nutui-gray-4",
  "--nutui-gray-5", "--nutui-gray-6", "--nutui-gray-7", "--nutui-gray-8", "--nutui-gray-9",
  "--nutui-gray-10", "--nutui-gray-11", "--nutui-gray-12",
  "--nutui-black-1", "--nutui-black-2", "--nutui-black-3", "--nutui-black-4", "--nutui-black-5",
  "--nutui-black-6", "--nutui-black-7", "--nutui-black-8", "--nutui-black-9", "--nutui-black-10",
  "--nutui-black-11", "--nutui-black-12", "--nutui-black-13",
  "--nutui-white-1", "--nutui-white-2", "--nutui-white-3", "--nutui-white-4", "--nutui-white-5",
  "--nutui-white-6", "--nutui-white-7", "--nutui-white-8", "--nutui-white-9", "--nutui-white-10",
  "--nutui-white-11", "--nutui-white-12", "--nutui-white-13",
  "--nutui-font-size-1", "--nutui-font-size-2", "--nutui-font-size-3", "--nutui-font-size-4",
  "--nutui-font-size-5", "--nutui-font-size-6", "--nutui-font-size-7", "--nutui-font-size-8",
  "--nutui-font-size-9", "--nutui-font-size-10",
  "--nutui-font-weight", "--nutui-font-weight-bold", "--nutui-line-height-base",
  "--nutui-font-h1", "--nutui-font-h2", "--nutui-font-h3", "--nutui-font-h4", "--nutui-font-h5",
  "--nutui-spacing-1", "--nutui-spacing-2", "--nutui-spacing-3", "--nutui-spacing-4",
  "--nutui-spacing-5", "--nutui-spacing-6", "--nutui-spacing-7", "--nutui-spacing-8",
  "--nutui-spacing-9", "--nutui-spacing-10",
  "--nutui-spacing-xxs", "--nutui-spacing-xs", "--nutui-spacing-s", "--nutui-spacing-base",
  "--nutui-spacing-l", "--nutui-spacing-xl", "--nutui-spacing-xxl", "--nutui-spacing-xxxl",
  "--nutui-spacing-4xl", "--nutui-spacing-5xl",
  "--nutui-radius-1", "--nutui-radius-2", "--nutui-radius-3", "--nutui-radius-4",
  "--nutui-radius-5", "--nutui-radius-6", "--nutui-radius-7", "--nutui-radius-8",
  "--nutui-radius-9", "--nutui-radius-10", "--nutui-radius-xl", "--nutui-radius-full",
  "--nutui-radius-xxs", "--nutui-radius-xs", "--nutui-radius-s", "--nutui-radius-base",
  "--nutui-radius-l",
  "--nutui-shadow-light", "--nutui-shadow-raised", "--nutui-shadow-overlay",
  "--nutui-padding-xs",
]);

/** Botanica & Steel 项目定制 */
const projectOverrides = {
  "--nutui-button-border-radius": "var(--sw-radius-pill)",
  "--nutui-button-normal-padding": "0 16px",
  "--nutui-button-default-height": "32px",
  "--nutui-button-default-font-size": "var(--nutui-font-size-4)",
  "--nutui-button-default-color": "var(--nutui-gray-7)",
  "--nutui-input-border-radius": "var(--nutui-radius-5)",
  "--nutui-input-border-bottom-width": "0",
  "--nutui-input-color": "var(--nutui-gray-7)",
  "--nutui-input-font-size": "var(--nutui-font-size-3)",
  "--nutui-tabs-titles-height": "50px",
  "--nutui-tabs-titles-background-color": "transparent",
  "--nutui-tabs-titles-gap": "8px",
  "--nutui-tabs-titles-font-size": "var(--nutui-font-size-2)",
  "--nutui-tabs-titles-item-min-width": "60px",
  "--nutui-tabs-titles-item-color": "var(--nutui-gray-5)",
  "--nutui-tabs-titles-item-active-color": "var(--nutui-color-primary-text)",
  "--nutui-tabs-titles-item-active-font-weight": "500",
  "--nutui-tabs-titles-item-active-font-size": "var(--nutui-font-size-2)",
  "--nutui-tabs-titles-item-active-background-color": "transparent",
  "--nutui-tabs-tab-line-width": "0",
  "--nutui-tabs-tab-line-height": "0",
  "--nutui-tabs-tab-line-color": "transparent",
  "--nutui-tabs-line-bottom": "0",
  "--nutui-tabs-line-border-radius": "0",
  "--nutui-tabs-tab-line-opacity": "0",
  "--nutui-tabs-button-border-radius": "var(--nutui-button-border-radius)",
  "--nutui-tabs-button-active-background-color": "var(--nutui-brand-6)",
  "--nutui-tabs-button-active-border": "none",
  "--nutui-tabs-vertical-titles-width": "100px",
  "--nutui-tabs-vertical-titles-item-height": "40px",
  "--nutui-tabs-vertical-tab-line-color": "var(--nutui-brand-6)",
  "--nutui-tabs-vertical-tab-line-width": "0",
  "--nutui-tabs-vertical-tab-line-height": "0",
  "--nutui-tabs-titles-item-smile-bottom": "0",
  "--nutui-tabs-tabpane-padding": "0",
  "--nutui-tabs-tabpane-background-color": "transparent",
  "--nutui-tabs-tabpane-backgroundColor": "transparent",
  "--nutui-dialog-content-margin": "10px 0 12px 0",
  "--nutui-tag-background-color": "var(--sw-palette-tag-bg)",
  "--nutui-tag-color": "var(--sw-palette-tag-text)",
  "--nutui-tag-height": "20px",
  "--nutui-tag-font-size": "var(--nutui-font-size-2)",
  "--nutui-tag-padding": "4px 10px",
  "--nutui-tag-round-border-radius": "8px",
  "--nutui-tabbar-active-color": "var(--nutui-brand-6)",
  "--nutui-navbar-background": "var(--nutui-gray-3)",
  "--nutui-navbar-color": "var(--nutui-gray-7)",
  "--nutui-cell-title-color": "var(--nutui-gray-7)",
  "--nutui-cell-extra-color": "var(--nutui-gray-5)",
  "--nutui-loading-icon-color": "var(--nutui-gray-5)",
  "--nutui-textarea-text-color": "var(--nutui-gray-7)",
  "--nutui-textarea-font": "var(--nutui-font-size-3)",
};

/** 颜色类默认值 → L1/L2 引用 */
function normalizeDefault(name, def) {
  if (projectOverrides[name]) return projectOverrides[name];
  def = def.replace(/\s+/g, " ").trim();
  if (def.startsWith("var(")) return def;
  if (/^#[0-9a-fA-F]{3,8}$/.test(def)) return def;
  if (/^rgba?\(/.test(def)) return def;
  if (/^\d+(\.\d+)?px$/.test(def)) return def;
  if (/^\d+$/.test(def)) return def;
  if (/^none$/i.test(def)) return def;
  if (/^transparent$/i.test(def)) return def;
  if (/^[\d.]+$/.test(def)) return def;
  if (/^0(\s|$)/.test(def) || def === "0") return def;
  if (/^\d+px\s+\d+px/.test(def)) return def;
  if (def.includes("px")) return def;
  return null;
}

/** @type {Map<string, string[]>} */
const groups = new Map();
for (const name of [...vars.keys()].sort()) {
  if (skipInL3.has(name)) continue;
  const prefix = name.replace(/^--nutui-/, "").split("-")[0];
  if (!groups.has(prefix)) groups.set(prefix, []);
  groups.get(prefix).push(name);
}

// 合并 projectOverrides 中 L3 独有项
for (const name of Object.keys(projectOverrides)) {
  if (skipInL3.has(name)) continue;
  const prefix = name.replace(/^--nutui-/, "").split("-")[0];
  if (!groups.has(prefix)) groups.set(prefix, []);
  if (!groups.get(prefix).includes(name)) groups.get(prefix).push(name);
}

const lines = [
  "// L3：NutUI 组件 CSS 变量（scripts/extract-nutui-css-vars.mjs 生成）",
  "",
  "@mixin tokens {",
];

let count = 0;
for (const [prefix, names] of [...groups.entries()].sort()) {
  const section = [];
  const sorted = [...new Set(names)].sort();
  for (const name of sorted) {
    const def =
      projectOverrides[name] ??
      normalizeDefault(name, vars.get(name) ?? "");
    if (!def) continue;
    section.push(`  ${name}: ${def};`);
    count++;
  }
  if (section.length === 0) continue;
  lines.push(`  // --- ${prefix} ---`);
  lines.push(...section);
  lines.push("");
}

lines.push("}");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");

// 覆盖率校验：variables.scss 中全部 --nutui- 名
const allNames = new Set(
  [...content.matchAll(/--nutui-[a-z0-9-]+/g)].map((x) => x[0]),
);
const defined = new Set([...skipInL3, ...Object.keys(projectOverrides)]);
for (const [prefix, names] of groups) {
  for (const n of names) {
    const def =
      projectOverrides[n] ?? normalizeDefault(n, vars.get(n) ?? "");
    if (def) defined.add(n);
  }
}
const missing = [...allNames].filter((n) => !defined.has(n) && !skipInL3.has(n));
console.log(`Wrote ${count} L3 vars`);
console.log(`NutUI unique names in source: ${allNames.size}`);
console.log(`Missing from theme (use NutUI CSS fallback): ${missing.length}`);
if (missing.length <= 20) console.log(missing.join(", "));
