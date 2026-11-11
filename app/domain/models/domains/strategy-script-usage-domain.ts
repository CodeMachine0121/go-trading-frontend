import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'
import { STRATEGY_SCRIPT_USAGES } from '~/domain/models/vo/strategy-script-usage-vo'
import { StrategyScriptUsageDto } from '~/domain/models/dto/strategy-script-usage-dto'
import { StrategyScriptUsageOptionDto } from '~/domain/models/dto/strategy-script-usage-option-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** 每一種用途的全部差異。多一種用途是在這張表加一列。 */
const USAGE_DESCRIPTIONS: Readonly<Record<StrategyScriptUsage, {
  label: LocalizedTextVo
  description: LocalizedTextVo
  switchTarget: StrategyScriptUsage
  appliesToChart: boolean
  feedsCalculation: boolean
}>> = {
  calculation: {
    label: new LocalizedTextVo('計算用', 'Calculation'),
    description: new LocalizedTextVo(
      '當交易策略的訊號來源、用於標的篩選；不出現在圖表的指標選單。',
      'Used as a trading strategy signal source or for symbol screening; not listed in the chart indicator menu.'),
    switchTarget: 'chart',
    appliesToChart: false,
    feedsCalculation: true,
  },
  chart: {
    label: new LocalizedTextVo('圖表用', 'Chart'),
    description: new LocalizedTextVo(
      '只出現在 K 線圖表的指標選單；當不了訊號來源，也不能用於篩選。',
      'Listed only in the chart indicator menu; it cannot be a signal source or be used for screening.'),
    switchTarget: 'calculation',
    appliesToChart: true,
    feedsCalculation: false,
  },
}

/** 沒說、或說了不認得的用途：交易服務對留白的讀法。 */
const DEFAULT_STRATEGY_SCRIPT_USAGE: StrategyScriptUsage = 'calculation'

/**
 * Domain Model：一支策略腳本的用途。
 *
 * **用途的每一條規則只住在這裡**：預設、認不得的讀法、名字、切換到哪一種、
 * 出不出現在圖表、當不當得了計算的來源。
 */
export class StrategyScriptUsageDomain {
  readonly value: StrategyScriptUsage

  constructor(declared: string) {
    this.value = STRATEGY_SCRIPT_USAGES.find(usage => usage === declared.trim()) ?? DEFAULT_STRATEGY_SCRIPT_USAGE
  }

  toDto(): StrategyScriptUsageDto {
    const description = USAGE_DESCRIPTIONS[this.value]
    const switchTargetLabel = USAGE_DESCRIPTIONS[description.switchTarget].label

    return new StrategyScriptUsageDto(
      this.value,
      description.label,
      description.switchTarget,
      new LocalizedTextVo(`改成${switchTargetLabel.traditionalChinese}`, `Switch to ${switchTargetLabel.english.toLowerCase()}`),
      description.appliesToChart,
      description.feedsCalculation,
    )
  }

  toOptionDto(): StrategyScriptUsageOptionDto {
    const description = USAGE_DESCRIPTIONS[this.value]

    return new StrategyScriptUsageOptionDto(this.value, description.label, description.description)
  }
}
