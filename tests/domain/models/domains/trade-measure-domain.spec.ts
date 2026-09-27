import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { TradeMeasure } from '~/domain/models/entities/trade-measure'

describe('TradeMeasureDomain', () => {
  it('沒有值也沒有原因時說暫時算不出', () => {
    const measure = new TradeMeasureDomain(new TradeMeasure(null, null))

    expect(measure.unavailableReason).toBe('temporarilyUnavailable')
    expect(measure.toFigure('R 倍數', value => value.toString(), () => 'neutral').text).toBe('暫時算不出，請稍後再看')
  })

  it('有值時沒有原因', () => {
    expect(new TradeMeasureDomain(new TradeMeasure(new Decimal(1), null)).unavailableReason).toBeNull()
  })
})
