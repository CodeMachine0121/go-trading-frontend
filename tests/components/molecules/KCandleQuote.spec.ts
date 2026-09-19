import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleQuote from '~/components/molecules/KCandleQuote.vue'
import { KCandleDomain } from '~/domain/models/domains/k-candle-domain'
import { KCandle } from '~/domain/models/entities/k-candle'
import { buildTimeZone } from '../../fixtures/time-zone'

const OPEN_TIME = new Date('2026-09-19T08:00:00.000Z')

/**
 * 一根真的 K 線，漲跌由 domain 算——手捏一份漲跌，這幾條就會在
 * 「紅綠由哪一邊決定」改變的那一天繼續說著舊的話，而測試不會紅。
 */
function candle(open: string, close: string) {
  return new KCandleDomain(new KCandle(
    'BTCUSDT', OPEN_TIME,
    new Decimal(open), new Decimal(close), new Decimal(open), new Decimal(close),
    new Decimal('1'), null, null, null,
  )).toDto()
}

function mountQuote(latest: ReturnType<typeof candle>) {
  return mount(KCandleQuote, {
    props: { latest, symbol: 'BTCUSDT', timeZone: buildTimeZone() },
  })
}

describe('KCandleQuote', () => {
  it('把最新的收盤價放在最前面', () => {
    const wrapper = mountQuote(candle('100', '110'))

    expect(wrapper.get('.k-candle-quote__price').text()).toBe('110')
    expect(wrapper.text()).toContain('BTCUSDT')
  })

  it.each([
    ['漲的時候帶正號、走綠的', '100', '110', '+10', '+10.00%', 'success'],
    ['跌的時候本來就帶負號、走紅的', '100', '90', '-10', '-10.00%', 'danger'],
    ['不漲不跌是中性的，不是綠的', '100', '100', '+0', '+0.00%', 'neutral'],
  ])('%s', (_name, open, close, change, percent, tone) => {
    const wrapper = mountQuote(candle(open, close))
    const changeLine = wrapper.get('[data-testid="k-candle-quote-change"]')

    expect(changeLine.text()).toContain(change)
    expect(changeLine.text()).toContain(percent)
    expect(changeLine.classes()).toContain(`k-candle-quote__change--${tone}`)
  })

  it('開盤價是零時不說百分比——除不出來與「沒有漲跌」是兩件事', () => {
    const wrapper = mountQuote(candle('0', '5'))

    expect(wrapper.get('[data-testid="k-candle-quote-change"]').text()).toContain('+5')
    expect(wrapper.get('[data-testid="k-candle-quote-change"]').text()).not.toContain('%')
  })

  it('說得出這個數字有多新', () => {
    const wrapper = mountQuote(candle('100', '110'))

    expect(wrapper.get('[data-testid="k-candle-quote-change"]').text())
      .toContain(buildTimeZone().formatDateTime(OPEN_TIME))
  })
})
