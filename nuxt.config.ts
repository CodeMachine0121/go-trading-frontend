import { fileURLToPath } from 'node:url'

// SCSS 的 abstracts（token map、存取函式、mixin）自動注入到每一個 .scss 與
// <style lang="scss"> 區塊，元件因此不必逐檔 @use 就能用 color() / spacing() / respond-to()。
// abstracts 不產出任何 CSS，注入不會造成重複樣式。
// 注意：vitest.config.ts 有一份等價設定，兩邊要一起改（見 .claude/rules/component-design.md）。
const scssAbstractsPath = fileURLToPath(new URL('./app/assets/styles/abstracts/_index.scss', import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  // 原子化設計的資料夾（atoms/molecules/organisms/templates）只表示層級，不進元件名字：
  // components/atoms/AppButton.vue 的元件名就是 AppButton，不是 AtomsAppButton。
  components: [{ path: '~/components', pathPrefix: false }],
  devtools: { enabled: true },
  // 全域樣式只有這一支入口（token + reset + 排版底色調），其餘一律是元件自己的 scoped 樣式
  css: ['~/assets/styles/main.scss'],
  runtimeConfig: {
    public: {
      // 後端 go-trading REST API base URL；以 NUXT_PUBLIC_BACKEND_BASE_URL 覆寫
      backendBaseUrl: 'http://localhost:8080',
    },
  },
  // 原始碼一律住在 app/ 底下（分層結構見 .claude/rules/architecture.md）。
  // `~` / `@` 因此指向 app/，import 一律寫成 `~/domain/...`、`~/application/...`。
  srcDir: 'app/',
  // 開發 server 的 port 寫死，因為它就是我們的 origin：後端 go-trading 只回授權標頭給
  // CORS_ALLOWED_ORIGINS 名單內的來源（預設 http://localhost:3000）。這裡換 port，
  // 後端那個環境變數要一起換，否則瀏覽器會擋掉每一次呼叫。
  devServer: { port: 3000 },
  compatibilityDate: '2026-08-30',
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${scssAbstractsPath}" as *;\n`,
        },
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: false, // 型別檢查走 `bun run typecheck`（含 husky hook），不拖慢 dev server
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
