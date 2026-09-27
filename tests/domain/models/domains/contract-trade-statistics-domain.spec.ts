import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractTradeStatisticsDomain } from '~/domain/models/domains/contract-trade-statistics-domain'
import { ContractTradeMistakeCost } from '~/domain/models/entities/contract-trade-mistake-cost'
import { buildStatistics } from '../../../fixtures/contract-trade-journal'

describe('ContractTradeStatisticsDomain', () => {
  it('失誤的 R 合計都是零時橫條不畫長度', () => {
    const statistics = new ContractTradeStatisticsDomain(buildStatistics({
      mistakeCosts: [new ContractTradeMistakeCost('提早出場', 1, new Decimal('0'))],
    })).toDto()

    expect(statistics.mistakeCosts.map(mistakeCost => mistakeCost.widthPercentage)).toEqual([0])
  })

  it('還沒有累積 R 的點時不寫合計', () => {
    expect(new ContractTradeStatisticsDomain(buildStatistics({ cumulativeRMultiples: [] })).toDto().totalRMultiple).toBeNull()
  })
})
