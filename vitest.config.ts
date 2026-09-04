import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const appDirectory = fileURLToPath(new URL('./app', import.meta.url))
// 與 nuxt.config.ts 等價的 SCSS abstracts 注入，讓元件測試掛載帶 <style lang="scss"> 的 SFC 時
// 也能解析 color() / spacing() / respond-to()。兩邊要一起改。
const scssAbstractsPath = fileURLToPath(new URL('./app/assets/styles/abstracts/_index.scss', import.meta.url))

export default defineVitestConfig({
  test: {
    // 所有測試都是純 TypeScript 或單一 SFC 的掛載，不需要 Nuxt runtime。
    // 頁面（app/pages/）刻意只做接線：取得 Application 後往下傳，互動邏輯一律住在
    // organism，元件測試因此不必啟動 Nuxt（見 .claude/rules/testing.md）。
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'app/**/*.vue'],
      // 組裝根、頁面與應用程式的根都只做接線：取得 Application 後往下傳。
      // 互動邏輯一律住在 organism 與 composable，那些才是覆蓋率要看的地方。
      exclude: ['app/plugins/**', 'app/pages/**', 'app/app.vue', 'app/**/*.d.ts'],
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "${scssAbstractsPath}" as *;\n`,
      },
    },
  },
  resolve: {
    alias: {
      '~': appDirectory,
      '@': appDirectory,
    },
  },
})
