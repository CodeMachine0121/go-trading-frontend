import { StrategyBotRunRecordDomain } from '~/domain/models/domains/strategy-bot-run-record-domain'

/**
 * Entity：後端那一輪的原樣。乾淨的資料模型——只有欄位與往 Domain Model 的轉換。
 *
 * 只有三樣東西。一輪的完整經過——哪個來源說了什麼、哪一邊成立——是很大一筆記錄，
 * 換來一個還沒有人問過的問題；而人問歷史的是「它有沒有在跑，它說了什麼」，
 * 也就正好是這三樣。
 */
export class StrategyBotRunRecord {
  constructor(
    public readonly runNumber: number,
    public readonly ranAt: Date,
    public readonly result: string,
  ) {}

  toDomain(): StrategyBotRunRecordDomain {
    return new StrategyBotRunRecordDomain(this)
  }
}
