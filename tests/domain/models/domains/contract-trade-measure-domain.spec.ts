import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractTradeMeasureDomain } from '~/domain/models/domains/contract-trade-measure-domain'
import { ContractTradeMeasure } from '~/domain/models/entities/contract-trade-measure'

describe('ContractTradeMeasureDomain', () => {
  it('沒有值也沒有原因時說暫時算不出', () => {
    const measure = new ContractTradeMeasureDomain(new ContractTradeMeasure(null, null))

    expect(measure.unavailableReason).toBe('temporarilyUnavailable')
    expect(measure.toFigure('R 倍數', value => value.toString(), () => 'neutral').text).toBe('暫時算不出，請稍後再看')
  })

  it('有值時沒有原因', () => {
    expect(new ContractTradeMeasureDomain(new ContractTradeMeasure(new Decimal(1), null)).unavailableReason).toBeNull()
  })
})
