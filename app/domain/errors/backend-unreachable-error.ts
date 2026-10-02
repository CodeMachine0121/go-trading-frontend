import { LocalizedError } from '~/domain/errors/localized-error'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 哨兵錯誤：把 proxy 層的 FetchError 包成領域可辨識的錯誤，
 * 讓 .vue 元件能分流錯誤畫面，而不必認識 ofetch / HTTP 細節。
 *
 * 畫面上要說的是「連不上」與該怎麼辦，而不是一串內部的端點路徑——
 * 是哪一個端點留在 `endpoint` 給開發者看。
 */
export class BackendUnreachableError extends LocalizedError {
  constructor(public readonly endpoint: string, options?: { cause?: unknown }) {
    super(new LocalizedTextVo(
      '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。',
      'Cannot reach the go-trading API. Make sure it is running and that this site is listed in its CORS_ALLOWED_ORIGINS.',
    ), options)
    this.name = 'BackendUnreachableError'
  }
}
