import type Decimal from 'decimal.js'
import { StrategyBotRunRecordDomain } from '~/domain/models/domains/strategy-bot-run-record-domain'

/**
 * Entity：後端那一輪的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * 它記的很窄。一輪的完整經過——哪個來源說了什麼、哪一邊成立——是很大一筆記錄，
 * 換來一個還沒有人問過的問題；而人問歷史的是「它有沒有在跑，它說了什麼」。
 *
 * 那一輪建議過的三個數字是例外，而它們是有理由的：訊息叫他押五千、停在 66105.915，
 * 而他三天後回頭看的時候那些設定可能已經改過了。**三個都可以是 `null`**，
 * 而 `null` 是常態（沒填部位規劃的機器人、判出持有的那幾輪）。
 */
export class StrategyBotRunRecord {
  constructor(
    public readonly runNumber: number,
    public readonly ranAt: Date,
    public readonly result: string,
    /** 那一輪建議的開倉金額。沒有建議過就是 `null`。 */
    public readonly suggestedStake: Decimal | null,
    /** 那一輪建議的止損價。沒有設止損就是 `null`。 */
    public readonly suggestedStopLossPrice: Decimal | null,
    /** 那一輪建議的止盈價。沒有設止盈就是 `null`。 */
    public readonly suggestedTakeProfitPrice: Decimal | null,
  ) {}

  toDomain(): StrategyBotRunRecordDomain {
    return new StrategyBotRunRecordDomain(this)
  }
}
