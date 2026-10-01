import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 哨兵錯誤：把 proxy 層的 FetchError 包成領域可辨識的錯誤，
 * 讓 .vue 元件能分流錯誤畫面，而不必認識 ofetch / HTTP 細節。
 */
export class BackendUnreachableError extends Error {
  constructor(public readonly endpoint: string, options?: { cause?: unknown }) {
    super(`backend unreachable: ${endpoint}`, options)
    this.name = 'BackendUnreachableError'
  }

  /**
   * 呈現給使用者的那一句。`message` 留給開發者看是哪一個端點；
   * 畫面上要說的是「連不上」與該怎麼辦，而不是一串內部的端點路徑。
   */
  get explanation(): LocalizedTextVo {
    return new LocalizedTextVo(
      '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。',
      'Cannot reach the go-trading API. Make sure it is running and that this site is listed in its CORS_ALLOWED_ORIGINS.',
    )
  }
}
