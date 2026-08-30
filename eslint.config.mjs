// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

/**
 * 除了 Nuxt / TypeScript 的基本規則外，這裡把 .claude/rules 裡的分層與型別規範
 * 轉成 lint 能擋下來的規則——架構規範不該只靠人工遵守。
 */
export default withNuxt(
  {
    name: 'go-trading-frontend/ignores',
    ignores: ['.nuxt/**', '.output/**', 'coverage/**', 'dist/**', 'node_modules/**'],
  },

  {
    name: 'go-trading-frontend/type-safety',
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      // code-style.md：禁止 any / as any / @ts-ignore
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', {
        'ts-ignore': true,
        'ts-expect-error': 'allow-with-description',
        'ts-nocheck': true,
      }],
      // code-style.md：宣告當下即賦值、預設 const
      'prefer-const': 'error',
      'no-var': 'error',
      'init-declarations': ['error', 'always'],
    },
  },

  {
    // data-access.md：$fetch / useFetch / 瀏覽器儲存只准出現在 Proxy 實作內
    name: 'go-trading-frontend/data-access-boundary',
    files: ['app/**/*.ts', 'app/**/*.vue'],
    ignores: ['app/infrastructure/proxy/**'],
    rules: {
      'no-restricted-globals': ['error',
        { name: '$fetch', message: '只能在 app/infrastructure/proxy/ 內呼叫；請改走 I{能力}Proxy 介面。' },
        { name: 'useFetch', message: '只能在 app/infrastructure/proxy/ 內呼叫；請改走 I{能力}Proxy 介面。' },
        { name: 'useAsyncData', message: '只能在 app/infrastructure/proxy/ 內呼叫；請改走 I{能力}Proxy 介面。' },
        { name: 'useLazyFetch', message: '只能在 app/infrastructure/proxy/ 內呼叫；請改走 I{能力}Proxy 介面。' },
        { name: 'localStorage', message: '只能在 app/infrastructure/proxy/ 內存取。' },
        { name: 'sessionStorage', message: '只能在 app/infrastructure/proxy/ 內存取。' },
      ],
    },
  },

  {
    // architecture.md：Domain 不 import 任何其他層，也不認識 Vue / Nuxt
    name: 'go-trading-frontend/domain-purity',
    files: ['app/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['~/application/**', '~/infrastructure/**', '~/components/**', '~/pages/**', '~/plugins/**'], message: 'Domain 不得依賴外層（依賴方向一律指向 Domain）。' },
          { group: ['vue', 'vue-router', 'nuxt', 'nuxt/**', '#app', '#app/**', '#imports'], message: 'Domain 不得認識 Vue / Nuxt。' },
        ],
      }],
    },
  },

  {
    // architecture.md：Application 不認識 infrastructure，也不碰 Vue
    name: 'go-trading-frontend/application-purity',
    files: ['app/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['~/infrastructure/**', '~/components/**', '~/pages/**', '~/plugins/**'], message: 'Application 只依賴 Domain，具體實作由組裝根注入。' },
          { group: ['vue', 'vue-router', 'nuxt', 'nuxt/**', '#app', '#app/**', '#imports'], message: 'Application 是純 TypeScript，不得認識 Vue / Nuxt。' },
        ],
      }],
    },
  },

  {
    // architecture.md：.vue 元件只認識 Application、DTO 與哨兵錯誤
    name: 'go-trading-frontend/controller-boundary',
    files: ['app/pages/**/*.vue', 'app/components/**/*.vue'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['~/infrastructure/**'], message: '元件不得認識 Proxy 實作；請透過 Application 取用。' },
          { group: ['~/domain/service/**', '~/domain/interface/**', '~/domain/models/entities/**', '~/domain/models/domains/**'], message: '元件只看得到 DTO 與哨兵錯誤，看不到 entity / domain model / service。' },
        ],
      }],
    },
  },

  {
    name: 'go-trading-frontend/tests',
    files: ['tests/**/*.ts'],
    rules: {
      // 測試裡組 mock 需要跨層 import，不套分層限制
      'no-restricted-imports': 'off',
      'no-restricted-globals': 'off',
    },
  },
)
