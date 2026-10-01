import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：還沒設定過 Telegram，所以送不出訊息。
 *
 * 它不是「哪一格填錯了」：沒有一格是錯的，是少了一個步驟。畫面因此要把人指向
 * 上面那張卡，而不是指向他剛打的那句話。
 */
export class TelegramNotConfiguredError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'TelegramNotConfiguredError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
