import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { BacktestLeverageDomain } from '~/domain/models/domains/backtest-leverage-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'

function leverage(
  multiplier: string, maintenanceMarginRate: string,
  tradingMode: TradingMode | null = 'longShort',
) {
  return new BacktestLeverageDomain(
    new Decimal(multiplier), new Decimal(maintenanceMarginRate), tradingMode)
}

describe('BacktestLeverageDomain', () => {
  it.each([
    ['整組留白——這一刀之前的每一次重演', '0', '0'],
    ['留白的倍數配一個填了的維持保證金率——沒借錢就沒有它可以是的東西', '0', '25'],
    ['一倍也是不借錢', '1', '0'],
    ['五倍，維持保證金率留白', '5', '0'],
    ['五倍，維持保證金率說了', '5', '0.5'],
    ['很緊但開得成', '5', '19'],
    ['一百二十五倍', '125', '0.5'],
  ])('%s 送得出去', (_name, multiplier, maintenanceMarginRate) => {
    expect(() => leverage(multiplier, maintenanceMarginRate).validate()).not.toThrow()
  })

  it.each([
    ['半個部位不是槓桿', '0.5', '0', '槓桿倍數不得小於 1 倍'],
    ['維持保證金率是負的', '5', '-1', '維持保證金率不得為負'],
    ['維持保證金率大到開倉那一棒就撐不住', '5', '20', '維持保證金率必須小於 20%'],
    ['再大一點也是同一句話', '5', '25', '維持保證金率必須小於 20%'],
    ['倍數越高，能填的越少', '20', '5', '維持保證金率必須小於 5%'],
  ])('%s 就送不出去', (_name, multiplier, maintenanceMarginRate, expectedWords) => {
    expect(() => leverage(multiplier, maintenanceMarginRate).validate())
      .toThrow(expect.objectContaining({ message: expect.stringContaining(expectedWords) }))
  })

  it('拒絕指向槓桿那一組，而不是兩格各一個', () => {
    // 兩格併排填成一組，而句子本身已經說出是哪一格——與出場價位、交易成本同一個做法。
    expect(() => leverage('0.5', '0').validate())
      .toThrow(expect.objectContaining({ field: 'leverage' }))
    expect(() => leverage('5', '-1').validate())
      .toThrow(expect.objectContaining({ field: 'leverage' }))
  })

  it('沒有借錢的那一次，維持保證金率怎麼填都不擋', () => {
    // 下面每一條規則問的都是「借了這麼多錢之後怎樣」，而這裡一毛都沒借。
    expect(() => leverage('0', '-999').validate()).not.toThrow()
    expect(() => leverage('1', '999').validate()).not.toThrow()
  })

  it('現貨開不了槓桿，而那句話落在槓桿那一組', () => {
    // 他挑現貨是有意思的，會讓步的是槓桿——所以要改的是這一組。
    expect(() => leverage('3', '0', 'spot').validate()).toThrow(BacktestFieldError)
    expect(() => leverage('3', '0', 'spot').validate()).toThrow(
      expect.objectContaining({
        field: 'leverage',
        message: expect.stringContaining('現貨'),
      }))
  })

  it('現貨不借錢就照常', () => {
    expect(() => leverage('0', '0', 'spot').validate()).not.toThrow()
    expect(() => leverage('1', '0', 'spot').validate()).not.toThrow()
  })

  it('問不到交易模式的那條路不檢查現貨，交給後端回答', () => {
    // 重演一份交易策略時模式是那一份自己記著的，這張表單看不到它。
    // 寫成 null 而不是選填參數，是為了讓「問不到」是一個說出口的決定。
    expect(() => leverage('3', '0', null).validate()).not.toThrow()
  })
})
