import Decimal from 'decimal.js'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { BacktestTimeRangeDto } from '~/domain/models/dto/backtest-time-range-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import { POSITION_SIZING_MODES } from '~/domain/models/vo/position-sizing-mode-vo'
import { BacktestRequestDomain } from '~/domain/models/domains/backtest-request-domain'
import { BacktestTimeRangeDomain } from '~/domain/models/domains/backtest-time-range-domain'
import { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import type { BacktestRuleDto } from '~/domain/models/dto/backtest-rule-dto'
import type { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'
import { BACKTEST_RULES } from '~/domain/models/vo/backtest-rule-vo'
import { SIGNAL_READINGS } from '~/domain/models/vo/signal-reading-vo'
import { SIGNAL_INDICATOR_NAME } from '~/domain/models/vo/signal-vo'

/**
 * 沒特別填時一開始有多少錢。
 *
 * 一萬——一個整數，賺賠算起來一眼看得出是幾成，而不是要先除一遍。
 * 它與預設的時間區間住在一起，因為兩者是同一件事的兩半：「一次還沒被指定過任何東西的
 * 回測」長什麼樣。
 */
const DEFAULT_INITIAL_CAPITAL = '10000'

/**
 * Domain Service：回測的編排。
 * 公開用例方法之間互不呼叫。
 */
export class BacktestService {
  constructor(private readonly backtestProxy: IBacktestProxy) {}

  /** 跑一次回測：驗證輸入（不合法就不送出）→ 送出 → 已經可以直接畫的結果。 */
  async runBacktest(backtestRequestDto: BacktestRequestDto): Promise<BacktestResultDto> {
    const requestDomain = new BacktestRequestDomain(backtestRequestDto)
    const backtest = await this.backtestProxy.runBacktest(requestDomain)

    return backtest.toDomain().toDto()
  }

  /**
   * 一打開回測就填好的那一段。
   *
   * 現在這一刻由呼叫端給進來——一個讀時鐘的預設值沒有辦法被驗證，
   * 而「打開回測看到的是哪兩個時間」正是這個切片最該被釘死的一條。
   */
  defaultTimeRange(now: Date): BacktestTimeRangeDto {
    return new BacktestTimeRangeDomain(now, now).defaultRangeAt(now)
  }

  /** 沒特別填時一開始有多少錢。畫面不自己指定預設值。 */
  defaultInitialCapital(): Decimal {
    return new Decimal(DEFAULT_INITIAL_CAPITAL)
  }

  /** 沒特別挑時押多少。同上——畫面不自己指定預設值。 */
  defaultPositionSizingMode(): PositionSizingMode {
    return POSITION_SIZING_MODES[0] as PositionSizingMode
  }

  /**
   * 回測照什麼規則走，以及那個叫信號的數字怎麼讀。
   *
   * 畫面問這個而不是自己寫幾段說明，理由與「算式裡可以用什麼」相同：這些字描述的是
   * 系統真正的行為。寫在對話框裡的話，行為改了沒有人會知道要回頭改它們，
   * 於是那份說明會安靜地開始說謊——而說明一旦說謊，讀的人比沒看還糟。
   */
  listBacktestRules(): BacktestRuleDto[] {
    return BACKTEST_RULES.map(rule => rule.toDto())
  }

  /** 信號的每一種讀法，排成一張對照表。 */
  listSignalReadings(): SignalReadingDto[] {
    return SIGNAL_READINGS.map(reading => reading.toDto())
  }

  /** 算式要放的那個指標名稱。畫面不自己寫死這個字。 */
  signalIndicatorName(): string {
    return SIGNAL_INDICATOR_NAME
  }

  /**
   * 每次開倉押多少：選單上可以挑的每一個，連「選了之後旁邊要不要出現一格」一起帶著。
   *
   * 畫面問這個而不是自己記著「只有全押不用填」，因為那是規則——
   * 哪天多一種不必填的模式，畫面會安靜地繼續要求填數字。
   */
  listPositionSizingModeOptions(): PositionSizingModeOptionDto[] {
    return POSITION_SIZING_MODES.map(
      mode => new PositionSizingDomain(mode, new Decimal(0)).toOptionDto())
  }
}
