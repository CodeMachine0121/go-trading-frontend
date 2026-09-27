import type Decimal from 'decimal.js'
import type { ContractTradeMeasure } from '~/domain/models/entities/contract-trade-measure'
import type { ContractTradeUnavailableReason } from '~/domain/models/vo/contract-trade-unavailable-reason-vo'
import { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import type { ContractTradeFigureTone } from '~/domain/models/vo/contract-trade-figure-vo'

const UNAVAILABLE_SENTENCES: Readonly<Record<ContractTradeUnavailableReason, string>> = {
  noStopLoss: '未設止損，算不出',
  noFundingSettlements: '沒有結算資料，無法計算',
  noMarketData: '沒有行情資料，無法計算',
  noLatestPrice: '沒有最新價，無法估算',
  noTradingSpecification: '還沒有交易規格，估不出',
  notApplicable: '不適用',
  temporarilyUnavailable: '暫時算不出，請稍後再看',
}

export class ContractTradeMeasureDomain {
  constructor(private readonly measure: ContractTradeMeasure) {}

  get unavailableReason(): ContractTradeUnavailableReason | null {
    return this.measure.value === null
      ? this.measure.unavailableReason ?? 'temporarilyUnavailable'
      : null
  }

  toFigure(
    label: string,
    describe: (value: Decimal) => string,
    toneOf: (value: Decimal) => ContractTradeFigureTone,
    note: string | null = null,
  ): ContractTradeFigureVo {
    const value = this.measure.value
    if (value === null) {
      return new ContractTradeFigureVo(
        label, UNAVAILABLE_SENTENCES[this.measure.unavailableReason ?? 'temporarilyUnavailable'], 'muted')
    }

    return new ContractTradeFigureVo(label, describe(value), toneOf(value), note)
  }
}
