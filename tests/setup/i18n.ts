import { config } from '@vue/test-utils'
import { afterEach } from 'vitest'
import { createDisplayLanguageI18n } from '~/locales/create-display-language-i18n'

// 元件測試不啟動 Nuxt，翻譯實例改由這裡裝上——與 app/plugins/i18n.ts 建的是同一套。
// 預設是繁體中文，所以以中文說法驗證畫面的測試照常成立；換過語言的測試結束後換回來。
const i18n = createDisplayLanguageI18n()
config.global.plugins.push(i18n)

afterEach(() => {
  i18n.global.locale.value = 'zh-TW'
})
