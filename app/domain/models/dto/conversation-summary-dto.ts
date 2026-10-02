import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * DTO：對話清單上一列離開 domain 的唯一形狀。
 *
 * 沒有名字這一欄，因為後端不讓對話取名。時刻與則數是這裡唯一能用來認出
 * 「這是哪一段」的東西，所以兩個都在。
 */
export class ConversationSummaryDto {
  constructor(
    public readonly id: number,
    public readonly lastActiveAt: Date,
    public readonly messageCount: number,
  ) {}

  /** 清單上說有幾則的那一句。 */
  get messageCountLabel(): LocalizedTextVo {
    return new LocalizedTextVo(
      `${this.messageCount} 則訊息`,
      this.messageCount === 1 ? '1 message' : `${this.messageCount} messages`,
    )
  }
}
