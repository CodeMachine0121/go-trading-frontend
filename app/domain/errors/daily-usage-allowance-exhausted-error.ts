import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

/**
 * 哨兵錯誤：今日的助手用量額度已經用盡。
 *
 * 它自成一種，是因為使用者要做的事是**等**——訊息裡帶著後端說的重置時刻。
 * 混進「稍後再試」那一類的代價是有人對著一個要等到明天的拒絕重試一整個小時。
 */
export class DailyUsageAllowanceExhaustedError extends Error {
  /** 後端說的原文，原樣呈現、不翻。 */
  readonly localizedMessage: UntranslatedTextVo

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DailyUsageAllowanceExhaustedError'
    this.localizedMessage = new UntranslatedTextVo(message)
  }
}
