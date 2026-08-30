import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

const appDirectory = fileURLToPath(new URL('./app', import.meta.url))

export default defineVitestConfig({
  test: {
    // domain / application 測試是純 TypeScript，不需要 Nuxt 環境。
    // 需要 Nuxt runtime 的測試（useNuxtApp、auto-import）在檔頭加上
    // `// @vitest-environment nuxt` 個別開啟。
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'app/**/*.vue'],
      exclude: ['app/plugins/**', 'app/**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '~': appDirectory,
      '@': appDirectory,
    },
  },
})
