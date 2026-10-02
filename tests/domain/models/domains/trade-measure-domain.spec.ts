import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { TradeMeasure } from '~/domain/models/entities/trade-measure'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const R_MULTIPLE_LABEL = new LocalizedTextVo('R 倍數', 'R multiple')

describe('TradeMeasureDomain', () => {
  it('沒有值也沒有原因時說暫時算不出', () => {
    const measure = new TradeMeasureDomain(new TradeMeasure(null, null))

    expect(measure.unavailableReason).toBe('temporarilyUnavailable')
    expect(measure.toFigure('rMultiple', R_MULTIPLE_LABEL, value => new UntranslatedTextVo(value.toString()), () => 'neutral').text.in('zh-TW'))
      .toBe('暫時算不出，請稍後再看')
  })

  it.each([
    ['noStopLoss', 'No stop loss, cannot be calculated'],
    ['noMarketData', 'No market data, cannot be calculated'],
    ['notClosed', 'Not applicable while open'],
  ] as const)('英文畫面上說出算不出的原因：%s', (reason, expected) => {
    const figure = new TradeMeasureDomain(new TradeMeasure(null, reason))
      .toFigure('rMultiple', R_MULTIPLE_LABEL, value => new UntranslatedTextVo(value.toString()), () => 'neutral')

    expect([figure.label.in('en'), figure.text.in('en'), figure.tone]).toEqual(['R multiple', expected, 'muted'])
  })

  it('有值時沒有原因', () => {
    expect(new TradeMeasureDomain(new TradeMeasure(new Decimal(1), null)).unavailableReason).toBeNull()
  })
})
