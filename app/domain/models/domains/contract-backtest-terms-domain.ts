import Decimal from 'decimal.js'
import type { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { CONTRACT_TRADING_MODES } from '~/domain/models/vo/contract-trading-mode-vo'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

const NO_BORROWING = new Decimal(1)
const WHOLE_PRICE_PERCENTAGE = new Decimal(100)

/**
 * Domain Model：合約重演多問的那幾格，驗過了。
 *
 * 規則與交易服務的一字不差，擋在這裡是因為那幾句話本來就說得出來——
 * 送出去再被拒絕，只是讓他多等一趟。認不得的標的最高能開幾倍則只有交易服務知道，
 * 那一句照它說的落在槓桿旁邊。
 */
export class ContractBacktestTermsDomain {
  readonly leverage: Decimal
  readonly slippagePercentage: Decimal
  readonly tradingMode: ContractTradingMode | null

  constructor(termsDto: ContractBacktestTermsDto) {
    if (termsDto.leverage.isNaN()) {
      throw new BacktestFieldError('leverage', '槓桿倍數請填一個數字')
    }
    if (!termsDto.leverage.isZero() && termsDto.leverage.lessThan(NO_BORROWING)) {
      throw new BacktestFieldError('leverage', '槓桿倍數不得小於 1 倍')
    }

    if (termsDto.slippagePercentage.isNaN()) {
      throw new BacktestFieldError('slippage', '滑點請填一個數字')
    }
    if (termsDto.slippagePercentage.isNegative()) {
      throw new BacktestFieldError('slippage', '滑點不得為負——負的滑點等於每一筆都成交得比市價好')
    }
    if (termsDto.slippagePercentage.greaterThan(WHOLE_PRICE_PERCENTAGE)) {
      throw new BacktestFieldError('slippage', '滑點不得超過 100%——那會讓賣出的成交價變成負數')
    }

    if (termsDto.tradingMode !== null && !CONTRACT_TRADING_MODES.includes(termsDto.tradingMode)) {
      throw new BacktestFieldError('tradingMode', '合約的交易模式只有多空反手、只做多、只做空三種')
    }

    this.leverage = termsDto.leverage
    this.slippagePercentage = termsDto.slippagePercentage
    this.tradingMode = termsDto.tradingMode
  }

  /** 槓桿有沒有填。沒填的不上線，交易服務讀成一倍。 */
  get leverageIsSet(): boolean {
    return !this.leverage.isZero()
  }

  /** 滑點有沒有填。沒填的不上線，交易服務讀成不計。 */
  get slippageIsSet(): boolean {
    return !this.slippagePercentage.isZero()
  }
}
