// 操作台每一頁在頂列說的標題與一句說明，由頁面以 definePageMeta 宣告、由 console 版型讀出。
// 宣告的是語言目錄裡的鍵，不是字：標題跟著顯示語言換，所以要到渲染當下才翻成字。
// 這是 Nuxt 型別擴充的唯一寫法（框架黏合），不是資料模型。
declare module '#app' {
  interface PageMeta {
    consoleTitleKey?: string
    consoleSubtitleKey?: string
    /** 這一頁剛好撐滿視窗、自己在裡面捲（例如對話）。 */
    consoleFillsViewport?: boolean
  }
}

export {}
