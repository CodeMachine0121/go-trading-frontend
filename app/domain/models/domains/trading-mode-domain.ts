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
  leveragedLong: {
    label: '槓桿做多',
    description: '只做多，但開得了槓桿：進出場與現貨一模一樣，差別是它借得到錢（合約帳戶只做多）。',
  },
}

/** 借得到錢的那幾種。做不了空不代表借不到錢——合約帳戶只做多就是這一種。 */
const BORROWING_TRADING_MODES: readonly TradingMode[] = ['longShort', 'leveragedLong']

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

  /**
   * 這套規矩開不開得了槓桿。
   *
   * 問能力而不是問模式，與後端同名同義。這是這個模型除了那一句話之外的第二份
   * 職責，理由一樣：規則若寫在用到它的地方，多一種模式就得記得回去改那裡，
   * 而漏掉不會報錯——只會把新模式安靜地歸到錯的那一邊。
   */
  canUseLeverage(): boolean {
    return BORROWING_TRADING_MODES.includes(this.mode)
  }

  /** 這個模式在那一列上長什麼樣：名字，加上一句話說它做什麼。 */
  toOptionDto(): TradingModeOptionDto {
    const description = TRADING_MODE_DESCRIPTIONS[this.mode]

    return new TradingModeOptionDto(this.mode, description.label, description.description)
  }
}
