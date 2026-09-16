import type { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'

/**
 * Domain Model：一輪跑過的紀錄對畫面的樣子。
 *
 * 它把「那個結果怎麼講、用什麼語氣」收在這裡，與狀態標籤同一條規則：
 * 那是**業務決定**而不是配色偏好——買入與賣出是兩個相反的動作，
 * 它們在一排紀錄裡必須一眼分得出來，而持有是「它沒有叫我做什麼」，不該搶戲。
 */
export class StrategyBotRunRecordDomain {
  constructor(private readonly runRecord: StrategyBotRunRecord) {}

  toDto(): StrategyBotRunRecordDto {
    return new StrategyBotRunRecordDto(
      this.runRecord.runNumber,
      this.runRecord.ranAt,
      this.resultLabel,
      this.resultTone,
    )
  }

  private get resultLabel(): string {
    switch (this.runRecord.result) {
      case 'buy':
        return '買入'
      case 'sell':
        return '賣出'
      default:
        // 後端只會吐這三個，而認不得的那一個當成持有——
        // 一格空白在一排紀錄裡讀起來像「這一列壞了」。
        return '持有'
    }
  }

  private get resultTone(): 'success' | 'danger' | 'neutral' {
    switch (this.runRecord.result) {
      case 'buy':
        return 'success'
      case 'sell':
        return 'danger'
      default:
        return 'neutral'
    }
  }
}
