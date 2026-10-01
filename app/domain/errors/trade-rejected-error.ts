import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'

/**
 * 一筆交易被擋下來：可能是這一側表單自己看出來的，也可能是後端拒絕的。
 * 後端拒絕時帶的是後端的原文（`UntranslatedTextVo`），由 proxy 包好再交進來。
 */
export class TradeRejectedError extends Error {
  readonly localizedMessage: LocalizedTextVo

  constructor(
    localizedMessage: LocalizedTextVo,
    public readonly formField: TradeFormFieldVo | null,
    public readonly recordedTradeId: number | null = null,
    public readonly savedFillCount = 0,
    options?: { cause?: unknown },
  ) {
    super(localizedMessage.traditionalChinese, options)
    this.name = 'TradeRejectedError'
    this.localizedMessage = localizedMessage
  }
}
