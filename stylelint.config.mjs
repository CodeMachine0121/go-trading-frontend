/**
 * SCSS 的中央控管由這份設定把關（規範見 .claude/rules/component-design.md）：
 * 元件樣式只能透過 token 函式取值，字面值一律留在 app/assets/styles/ 內。
 */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recommended-vue/scss'],
  ignoreFiles: ['.nuxt/**', '.output/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  rules: {
    // 字面值只准出現在 app/assets/styles/（見下方 overrides）；元件一律用 color() 取 token
    'color-no-hex': [true, { message: '色碼只能寫在 app/assets/styles/abstracts/_tokens.scss；元件請用 color(\'token\')。' }],
    'color-named': ['never', { message: '具名顏色不算 token；請改用 color(\'token\')。' }],
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    'declaration-no-important': true,
    // 我們的 SCSS 註解常用整段 // 區塊（含空的 // 行）寫設計說明，不視為空註解
    'scss/comment-no-empty': null,
    // token map 之間留空行是刻意的可讀性排版
    'scss/dollar-variable-empty-line-before': null,
    // BEM：block / block__element / block--modifier（含巢狀 & 解析後的結果）。
    // `cm-` 開頭是 CodeMirror 在執行期自己畫上去的 class，不是我們命名的東西——
    // 要覆寫它的長相只能照它的名字寫，因此放行（且僅限這個前綴）。
    'selector-class-pattern': [
      '^(?:cm-[A-Za-z0-9-]+|[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?)$',
      {
        resolveNestedSelectors: true,
        message: 'class 命名一律 BEM：block、block__element、block--modifier（全小寫 kebab-case）。',
      },
    ],
  },
  overrides: [
    {
      // 樣式中央層是「唯一」可以寫字面值的地方——token 的定義本身就是字面值。
      files: ['app/assets/styles/**/*.scss'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'declaration-no-important': null,
        'custom-property-pattern': null,
        // reset 要接上 Nuxt 自己掛在頁面上的根節點（`#__nuxt`）才能把「填滿視窗」
        // 一路傳下來。那個名字是框架給的，改不動，所以在這一層放行 id 的命名規則。
        'selector-id-pattern': null,
      },
    },
  ],
}
