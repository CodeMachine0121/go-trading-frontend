import { fileURLToPath } from 'node:url'

// SCSS 的 abstracts（token map、存取函式、mixin）自動注入到每一個 .scss 與
// <style lang="scss"> 區塊，元件因此不必逐檔 @use 就能用 color() / spacing() / respond-to()。
// abstracts 不產出任何 CSS，注入不會造成重複樣式。
// 注意：vitest.config.ts 有一份等價設定，兩邊要一起改（見 .claude/rules/component-design.md）。
const scssAbstractsPath = fileURLToPath(new URL('./app/assets/styles/abstracts/_index.scss', import.meta.url))

export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  // 只在 dev 關掉 app manifest。它預設會把 `#app-manifest` 這個 alias 指向
  // .nuxt/manifest/meta/{buildId}.json，而那個檔案要等 nitro 建完才寫出來；
  // dev 冷啟動時 Vite 會先 pre-transform nuxt 的 manifest composable，於是撞上
  // 「Failed to resolve import "#app-manifest" ... Does the file exist?」。
  // 這是 race，`nuxt build` 清掉 .nuxt 之後的第一次 dev 最容易踩到。
  // 關掉後 alias 改指向 node_modules 裡恆存在的空模組，錯誤結構上就不會發生。
  //
  // 這個 race 只發生在 dev，所以用 `$development` 圈住：build 與 generate 維持開啟，
  // 「部署了新版本就重載」與靜態產出的 _payload.json 都不受影響。
  // 詳見 README「Dev server 有兩個『別讓它自己發現』的設定」。
  $development: {
    experimental: {
      appManifest: false,
    },
  },
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
    // CodeMirror 只在 AppCodeEditor 掛載後才動態 import（它碰得到 document，伺服器端沒有），
    // 所以 Vite 從進入點靜態掃不到它。dev 冷啟動時第一次打開「指標計算」才臨時發現這幾個套件、
    // 當場重新優化依賴，而正在飛的那批 import 就會拿到 504 Outdated Optimize Dep——
    // 三個編輯器的 onMounted 一起炸掉，畫面只剩空容器，得手動重新載入才會好。
    // 在這裡先報名，dev server 啟動時就一次預打包完，那個時序缺口就消失了。
    // lightweight-charts 同理：KCandleChart 掛載後才動態 import（它要的是真正的畫布），
    // 不先報名的話，dev 冷啟動時第一次打開「K 線圖表」才臨時發現它、當場重新優化依賴。
    optimizeDeps: {
      include: [
        'lightweight-charts',
        '@codemirror/view',
        '@codemirror/state',
        '@codemirror/commands',
        '@codemirror/language',
        '@codemirror/autocomplete',
        '@codemirror/lang-go',
        '@codemirror/theme-one-dark',
      ],
    },
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
