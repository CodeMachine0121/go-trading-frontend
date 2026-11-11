import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/** DTO：新增對話框上的一個用途選項，連同它會出現在哪裡。 */
export class StrategyScriptUsageOptionDto {
  constructor(
    public readonly value: StrategyScriptUsage,
    public readonly label: LocalizedTextVo,
    public readonly description: LocalizedTextVo,
  ) {}
}
