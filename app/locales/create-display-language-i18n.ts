import { createI18n } from 'vue-i18n'
import { englishMessages } from '~/locales/english-messages'
import { traditionalChineseMessages } from '~/locales/traditional-chinese-messages'

/**
 * 建立操作台唯一的翻譯實例。Nuxt plugin 與元件測試都從這裡建，兩邊說的是同一套話。
 *
 * 一開始一律是繁體中文：記住的語言要到瀏覽器裡才讀得回來，由 `useDisplayLanguage` 套上。
 * 英文目錄缺了某一句時退回繁體中文——寧可露出原文，也不讓畫面出現一串鍵名。
 */
export function createDisplayLanguageI18n() {
  return createI18n({
    legacy: false,
    locale: 'zh-TW',
    fallbackLocale: 'zh-TW',
    messages: {
      'zh-TW': traditionalChineseMessages,
      'en': englishMessages,
    },
  })
}
