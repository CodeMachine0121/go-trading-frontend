// 操作台每一頁在頂列說的標題與一句說明，由頁面以 definePageMeta 宣告、由 console 版型讀出。
// 這是 Nuxt 型別擴充的唯一寫法（框架黏合），不是資料模型。
declare module '#app' {
  interface PageMeta {
    consoleTitle?: string
    consoleSubtitle?: string
  }
}

export {}
