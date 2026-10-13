import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'

/**
 * 每一種參數種類給人看的名字，**只有這一份**：種類選單與「在算式裡怎麼讀」那一段都從這裡取，
 * 免得一邊改了名字、另一邊還是舊的。
 */
export const STRATEGY_PARAMETER_KIND_LABELS: Readonly<Record<StrategyScriptParameterKind, LocalizedTextVo>> = {
  lookbackCount: new LocalizedTextVo('回看根數', 'Lookback count'),
  number: new LocalizedTextVo('數值', 'Number'),
  boolean: new LocalizedTextVo('是非', 'True/false'),
  orderFlowPriceStep: new LocalizedTextVo('訂單流價位寬度', 'Order flow price step'),
}
