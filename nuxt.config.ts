export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // 後端 go-stock REST API base URL；以 NUXT_PUBLIC_BACKEND_BASE_URL 覆寫
      backendBaseUrl: 'http://localhost:8080',
    },
  },
  // 原始碼一律住在 app/ 底下（分層結構見 .claude/rules/architecture.md）。
  // `~` / `@` 因此指向 app/，import 一律寫成 `~/domain/...`、`~/application/...`。
  srcDir: 'app/',
  compatibilityDate: '2026-08-30',
  typescript: {
    strict: true,
    typeCheck: false, // 型別檢查走 `pnpm typecheck`（含 husky hook），不拖慢 dev server
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
