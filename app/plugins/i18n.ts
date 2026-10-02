import { createDisplayLanguageI18n } from '~/locales/create-display-language-i18n'

// 翻譯實例在任何元件掛載之前就要裝好：每一個元件的 setup 都可能要說話。
// 全域那一份另外 provide 出去，讓元件以外（切換語言的 composable）也改得到同一個 locale。
export default defineNuxtPlugin({
  name: 'i18n',
  enforce: 'pre',
  setup(nuxtApp) {
    const i18n = createDisplayLanguageI18n()
    nuxtApp.vueApp.use(i18n)

    return { provide: { globalTranslation: i18n.global } }
  },
})
