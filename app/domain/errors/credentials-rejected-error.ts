import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：後端說這組帳密對不上。
 *
 * 它只有一種說法——不論是查無這個電子郵件、還是密碼打錯，後端都回同一句。
 * 畫面因此也只轉述那一句，不試圖多解釋：分開講等於奉送一份「哪些電子郵件註冊過」的名單。
 */
export class CredentialsRejectedError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'CredentialsRejectedError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
