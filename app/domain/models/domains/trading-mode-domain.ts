import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import { TradingModeOptionDto } from '~/domain/models/dto/trading-mode-option-dto'

/** 每一種模式怎麼稱呼，以及一句話說它拿賣出信號做什麼。 */
const TRADING_MODE_DESCRIPTIONS: Readonly<
  Record<TradingMode, { label: string, description: string }>
> = {
  longShort: {
    label: '多空反手',
    description: '永遠在市場裡：賣出會把多倉平掉，並在同一棒反手做空。',
  },
  spot: {
    label: '現貨',
    description: '只做多：賣出就平倉、把錢收回來，之後空手等下一個買點，不放空。',
  },
}

/**
 * Domain Model：一次回測照哪一套規矩操作。
 *
 * 它不驗證任何東西——使用者是從兩顆並排的按鈕挑的，挑不出非法值，
 * 與彙總刻度同一套處理。它存在的理由是另一件事：**那一句話要有一個家**。
 *
 * 說明若寫在畫面上，兩個去處就是兩份字串，改了一邊不會改到另一邊，
 * 而使用者在兩頁上會讀到對同一件事的兩種說法。
 */
export class TradingModeDomain {
  constructor(private readonly mode: TradingMode) {}

  /** 這個模式在那一列上長什麼樣：名字，加上一句話說它做什麼。 */
  toOptionDto(): TradingModeOptionDto {
    const description = TRADING_MODE_DESCRIPTIONS[this.mode]

    return new TradingModeOptionDto(this.mode, description.label, description.description)
  }
}
