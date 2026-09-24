import type { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'
import { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'

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
 * 那一輪建議過的三個數字也在這裡變成字：**有沒有**那一格是業務決定
 * （沒有建議是常態），而**不是**元件該去判斷一個 `null` 要畫成什麼。
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
      this.suggestionText,
    )
  }

  /**
   * 那一輪建議的部位寫成一句話。
   *
   * 合約那一輪（記得方向、槓桿或名目任何一樣）先說它是哪個方向、幾倍，
   * 押下去的叫**保證金**、實際承擔的叫**名目**——那正是回頭對訊息的人要找的東西。
   * 現貨那一輪照舊只說押多少。出場價有才寫，沒有開倉金額就整段不寫。
   *
   * 認不得的方向不猜：寫錯方向比不寫更糟，那是在告訴他當時該往哪邊下單。
   */
  private get suggestionText(): string | null {
    const stake = this.runRecord.suggestedStake
    if (stake === null) {
      return null
    }

    const exitParts = [
      this.runRecord.suggestedStopLossPrice === null
        ? null
        : `停損 ${this.runRecord.suggestedStopLossPrice.toString()}`,
      this.runRecord.suggestedTakeProfitPrice === null
        ? null
        : `停利 ${this.runRecord.suggestedTakeProfitPrice.toString()}`,
    ]

    const isContractRound = this.runRecord.suggestedDirection !== null
      || this.runRecord.suggestedLeverage !== null
      || this.runRecord.suggestedNotional !== null

    if (!isContractRound) {
      return [`押 ${stake.toString()}`, ...exitParts]
        .filter(part => part !== null)
        .join(' · ')
    }

    const directionAndLeverage = [
      this.directionWord,
      this.runRecord.suggestedLeverage === null
        ? null
        : `${this.runRecord.suggestedLeverage.toString()} 倍`,
    ].filter(part => part !== null).join(' ')

    return [
      directionAndLeverage === '' ? null : directionAndLeverage,
      `保證金 ${stake.toString()}`,
      this.runRecord.suggestedNotional === null
        ? null
        : `名目 ${this.runRecord.suggestedNotional.toString()}`,
      ...exitParts,
    ].filter(part => part !== null).join(' · ')
  }

  private get directionWord(): string | null {
    switch (this.runRecord.suggestedDirection) {
      case 'long':
        return '做多'
      case 'short':
        return '做空'
      default:
        return null
    }
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
