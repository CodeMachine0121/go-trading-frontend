import type { StrategyScriptUsageDto } from '~/domain/models/dto/strategy-script-usage-dto'
import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 一份交易策略聽得懂的唯一一種指標值種類。
 *
 * 條件比對的是買入／賣出／持有，而只有這一種策略腳本吐得出那三個值。
 * 挑得到一支吐數字的策略腳本，跟著它跑的機器人第一輪就會算式失敗——
 * 而算式失敗是會**停擺**的那一類。
 */
const SIGNAL_RESULT_TYPE: IndicatorResultType = 'signal'

/**
 * Domain Model：一支候選的訊號來源策略腳本。
 * 自己的與市集副本形狀不同（副本沒有算式），先收成同一個樣子再判斷。
 */
export class SignalSourceCandidateDomain {
  constructor(
    readonly id: number,
    readonly name: string,
    readonly resultType: string,
    readonly parameterNames: readonly string[],
    readonly usage: StrategyScriptUsageDto,
  ) {}

  get emitsSignal(): boolean {
    return this.resultType === SIGNAL_RESULT_TYPE
  }

  /** 吐訊號而且是計算用，才當得了訊號來源：圖表用的腳本交易服務一律拒絕。 */
  get feedsSignalSource(): boolean {
    return this.emitsSignal && this.usage.feedsCalculation
  }

  /** 當不了訊號來源的原因：不吐訊號先說（原有的規則），吐訊號但是圖表用的說它是圖表用。 */
  get unusableReason(): LocalizedTextVo {
    return this.emitsSignal
      ? new LocalizedTextVo(
          `${this.name}（這支是圖表用，當不了訊號來源）`,
          `${this.name} (a chart script, so it cannot be a signal source)`)
      : new LocalizedTextVo(
          `${this.name}（這支不吐訊號，當不了訊號來源）`,
          `${this.name} (does not output a signal, so it cannot be a signal source)`)
  }
}
