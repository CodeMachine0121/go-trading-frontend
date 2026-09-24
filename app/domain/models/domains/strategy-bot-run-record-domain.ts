import type { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'
import { StrategyBotRunSuggestionDomain } from '~/domain/models/domains/strategy-bot-run-suggestion-domain'

/**
 * Domain Model：一輪跑過的紀錄對畫面的樣子。
 *
 * 它把「那個結果怎麼講、用什麼語氣」收在這裡，與狀態標籤同一條規則：
 * 那是**業務決定**而不是配色偏好——買入與賣出是兩個相反的動作，
 * 它們在一排紀錄裡必須一眼分得出來，而持有是「它沒有叫我做什麼」，不該搶戲。
 *
 * 衝突是第四種，而且是唯一**要人去處理**的那一種：那台機器人還在跑、也還健康，
 * 但它的兩個條件同時成立，所以在有人去改掉其中一個之前它一句話都不會說。
 * 持有是在等市場，衝突是在等人——所以它不能跟持有共用同一個字、同一個語氣。
 *
 * 那一輪建議過的部位怎麼寫成一句話，交給 StrategyBotRunSuggestionDomain——
 * 現貨與合約有兩種寫法，那是它自己的一套規則。
 */
export class StrategyBotRunRecordDomain {
  constructor(private readonly runRecord: StrategyBotRunRecord) {}

  toDto(): StrategyBotRunRecordDto {
    return new StrategyBotRunRecordDto(
      this.runRecord.runNumber,
      this.runRecord.ranAt,
      this.resultLabel,
      this.resultTone,
      this.runRecord.result === 'conflict',
      new StrategyBotRunSuggestionDomain(this.runRecord).toText(),
    )
  }

  private get resultLabel(): string {
    switch (this.runRecord.result) {
      case 'buy':
        return '買入'
      case 'sell':
        return '賣出'
      case 'conflict':
        return '衝突'
      default:
        // 後端只會吐這四個，而認不得的那一個當成持有——
        // 一格空白在一排紀錄裡讀起來像「這一列壞了」。
        return '持有'
    }
  }

  private get resultTone(): 'success' | 'danger' | 'neutral' | 'warning' {
    switch (this.runRecord.result) {
      case 'buy':
        return 'success'
      case 'sell':
        return 'danger'
      // 警告，不是危險：機器人沒有壞，是它被交代了一件做不到的事。
      // 用危險的語氣會讓它看起來跟停擺同一級，而停擺是它自己出了問題。
      case 'conflict':
        return 'warning'
      default:
        return 'neutral'
    }
  }
}
