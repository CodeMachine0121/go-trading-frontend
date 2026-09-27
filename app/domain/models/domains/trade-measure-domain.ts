import type Decimal from 'decimal.js'
import type { TradeMeasure } from '~/domain/models/entities/trade-measure'
import type { TradeUnavailableReason } from '~/domain/models/vo/trade-unavailable-reason-vo'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { ContractTradeFigureTone } from '~/domain/models/vo/trade-figure-vo'

const UNAVAILABLE_SENTENCES: Readonly<Record<TradeUnavailableReason, string>> = {
  noStopLoss: '未設止損，算不出',
  noFundingSettlements: '沒有結算資料，無法計算',
  noMarketData: '沒有行情資料，無法計算',
  noLatestPrice: '沒有最新價，無法估算',
  noTradingSpecification: '還沒有交易規格，估不出',
  notApplicable: '不適用',
  temporarilyUnavailable: '暫時算不出，請稍後再看',
}

export class TradeMeasureDomain {
  constructor(private readonly measure: TradeMeasure) {}

  get unavailableReason(): TradeUnavailableReason | null {
    return this.measure.value === null
      ? this.measure.unavailableReason ?? 'temporarilyUnavailable'
      : null
  }

  toFigure(
    label: string,
    describe: (value: Decimal) => string,
    toneOf: (value: Decimal) => ContractTradeFigureTone,
    note: string | null = null,
  ): TradeFigureVo {
    const value = this.measure.value
    if (value === null) {
      return new TradeFigureVo(
        label, UNAVAILABLE_SENTENCES[this.measure.unavailableReason ?? 'temporarilyUnavailable'], 'muted')
    }

    return new TradeFigureVo(label, describe(value), toneOf(value), note)
  }
}
