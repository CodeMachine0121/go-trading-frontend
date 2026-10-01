import type Decimal from 'decimal.js'
import type { TradeMeasure } from '~/domain/models/entities/trade-measure'
import type { TradeUnavailableReason } from '~/domain/models/vo/trade-unavailable-reason-vo'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { TradeFigureKind, TradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

const UNAVAILABLE_SENTENCES: Readonly<Record<TradeUnavailableReason, LocalizedTextVo>> = {
  noStopLoss: new LocalizedTextVo('未設止損，算不出', 'No stop loss, cannot be calculated'),
  noFundingSettlements: new LocalizedTextVo('沒有結算資料，無法計算', 'No settlement data, cannot be calculated'),
  noMarketData: new LocalizedTextVo('沒有行情資料，無法計算', 'No market data, cannot be calculated'),
  noLatestPrice: new LocalizedTextVo('沒有最新價，無法估算', 'No latest price, cannot be estimated'),
  noTradingSpecification: new LocalizedTextVo('還沒有交易規格，估不出', 'No trading specification yet, cannot be estimated'),
  notApplicable: new LocalizedTextVo('不適用', 'Not applicable'),
  notClosed: new LocalizedTextVo('持倉中不適用', 'Not applicable while open'),
  temporarilyUnavailable: new LocalizedTextVo('暫時算不出，請稍後再看', 'Temporarily unavailable, please check back later'),
}

export class TradeMeasureDomain {
  constructor(private readonly measure: TradeMeasure) {}

  get unavailableReason(): TradeUnavailableReason | null {
    return this.measure.value === null
      ? this.measure.unavailableReason ?? 'temporarilyUnavailable'
      : null
  }

  toFigure(
    kind: TradeFigureKind,
    label: LocalizedTextVo,
    describe: (value: Decimal) => LocalizedTextVo,
    toneOf: (value: Decimal) => TradeFigureTone,
    note: LocalizedTextVo | null = null,
  ): TradeFigureVo {
    const value = this.measure.value
    if (value === null) {
      return new TradeFigureVo(
        kind, label, UNAVAILABLE_SENTENCES[this.measure.unavailableReason ?? 'temporarilyUnavailable'], 'muted')
    }

    return new TradeFigureVo(kind, label, describe(value), toneOf(value), note)
  }
}
