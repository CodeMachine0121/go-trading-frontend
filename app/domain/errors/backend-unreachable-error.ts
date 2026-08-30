/**
 * 哨兵錯誤：把 proxy 層的 FetchError 包成領域可辨識的錯誤，
 * 讓 .vue 元件能分流錯誤畫面，而不必認識 ofetch / HTTP 細節。
 */
export class BackendUnreachableError extends Error {
  constructor(public readonly endpoint: string, options?: { cause?: unknown }) {
    super(`backend unreachable: ${endpoint}`, options)
    this.name = 'BackendUnreachableError'
  }
}
