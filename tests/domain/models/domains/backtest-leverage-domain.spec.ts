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

  it('沒有借錢的那一次，上限不擋——它算不出來，也不影響任何結果', () => {
    // 上限那一條問的是「借了這麼多錢之後撐得住多遠」，而這裡一毛都沒借。
    expect(() => leverage('0', '999').validate()).not.toThrow()
    expect(() => leverage('1', '999').validate()).not.toThrow()
  })

  it('負的維持保證金率一律擋，沒有借錢也一樣', () => {
    // 那一格自己的規則與有沒有用到它無關：負的是一個打錯的字。
    // 後端讀的順序也是這樣——兩邊對同一份輸入必須給出同一個答案，
    // 否則使用者會在畫面上通過、在伺服器上被拒絕，而他分不出那兩件事的差別。
    for (const multiplier of ['0', '1', '5']) {
      expect(() => leverage(multiplier, '-1').validate())
        .toThrow(expect.objectContaining({
          field: 'leverage',
          message: expect.stringContaining('維持保證金率不得為負'),
        }))
    }
  })

  it('負零就是零，不是負的', () => {
    // `decimal.js` 把負零當成負的，後端不會——而 `-0` 是數字輸入框上
    // 打到一半完全合法的一個值。擋它等於這一層自己發明了一條上位沒有的規則。
    expect(() => leverage('5', '-0').validate()).not.toThrow()
  })

  it('說出的上限是一個照著填就會過的數字', () => {
    // 三分之一個一百印成二十位小數，那不是一句照得了的指示。
    let rejection = ''
    try {
      leverage('3', '40').validate()
    }
    catch (error: unknown) {
      rejection = (error as Error).message
    }

    expect(rejection).toContain('必須小於 33.33%')
    // 而且照著填真的會過。
    expect(() => leverage('3', '33.33').validate()).not.toThrow()
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
