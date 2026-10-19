import type { AggregationIntervalValue } from '~/domain/models/vo/aggregation-interval-vo'
import { SYMBOL_SCREENING_AGGREGATION_INTERVALS } from '~/domain/models/vo/symbol-screening-aggregation-interval-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const INTERVAL_LABELS: Readonly<Partial<Record<AggregationIntervalValue, LocalizedTextVo>>> = {
  '4h': new LocalizedTextVo('每 4 小時', 'Every 4 hours'),
  '1d': new LocalizedTextVo('每天', 'Daily'),
}

export class SymbolScreeningAggregationIntervalDomain {
  constructor(private readonly declared: string) {}

  label(): LocalizedTextVo {
    const interval = SYMBOL_SCREENING_AGGREGATION_INTERVALS.find(candidate => candidate === this.declared)

    // A profile saved before the interval rule must still read as what the system stored.
    return (interval === undefined ? undefined : INTERVAL_LABELS[interval]) ?? new UntranslatedTextVo(this.declared)
  }
}
