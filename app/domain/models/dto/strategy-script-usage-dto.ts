import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * DTO：一支策略腳本的用途，連同每個挑腳本的地方要問的那兩件事。
 *
 * 消費端只讀 `appliesToChart` / `feedsCalculation`，不自己比對 `value`——
 * 多一種用途時，它們一行都不必改。
 */
export class StrategyScriptUsageDto {
  constructor(
    public readonly value: StrategyScriptUsage,
    /** 「圖表用」或「計算用」。 */
    public readonly label: LocalizedTextVo,
    /** 切換那一顆鍵會把它切成哪一種。 */
    public readonly switchTarget: StrategyScriptUsage,
    /** 切換那一顆鍵上寫什麼，例如「改成圖表用」。 */
    public readonly switchLabel: LocalizedTextVo,
    /** 出現在 K 線圖表的指標選單裡。 */
    public readonly appliesToChart: boolean,
    /** 當得了交易策略的訊號來源、標的篩選的腳本。 */
    public readonly feedsCalculation: boolean,
  ) {}
}
