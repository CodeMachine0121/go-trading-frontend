import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ExitDistanceDomain } from '~/domain/models/domains/exit-distance-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const STOP_LOSS_DISTANCE = new LocalizedTextVo('停損距離', 'Stop-loss distance')
const TAKE_PROFIT_DISTANCE = new LocalizedTextVo('停利距離', 'Take-profit distance')

describe('ExitDistanceDomain', () => {
  it.each([
    ['一個尋常的距離', '3'],
    ['不設這個出場', '0'],
    ['整個價格那麼遠——荒謬但算得出來', '100'],
  ])('%s 講得通', (_name, distance) => {
    expect(new ExitDistanceDomain(new Decimal(distance), STOP_LOSS_DISTANCE)
      .validationMessage()).toBeNull()
  })

  it.each([
    // 負的會把止損放到價格的另一邊，而那個部位會在下一棒就出場。
    ['負的', '-3', '停損距離不得為負'],
    ['超過整個價格', '120', '停損距離不得超過 100%'],
    ['不是一個數字', 'NaN', '停損距離請填一個數字'],
  ])('%s 講不通', (_name, distance, expectedWords) => {
    expect(new ExitDistanceDomain(new Decimal(distance), STOP_LOSS_DISTANCE)
      .validationMessage()?.in('zh-TW')).toContain(expectedWords)
  })

  it('說的是它自己的名字', () => {
    // 名字與數字一起進建構子，所以同一個距離不可能在兩次呼叫裡拿到兩個名字。
    expect(new ExitDistanceDomain(new Decimal('-3'), TAKE_PROFIT_DISTANCE)
      .validationMessage()?.in('zh-TW')).toContain('停利距離不得為負')
  })

  it.each([
    ['-3', 'Stop-loss distance cannot be negative'],
    ['120', 'Stop-loss distance cannot exceed 100%'],
    ['NaN', 'Stop-loss distance must be a number'],
  ])('英文畫面上 %s 也講得出理由', (distance, expectedWords) => {
    expect(new ExitDistanceDomain(new Decimal(distance), STOP_LOSS_DISTANCE)
      .validationMessage()?.in('en')).toContain(expectedWords)
  })

  it.each([
    ['一個距離', '3', true],
    ['零就是沒有這個出場', '0', false],
    ['整個價格也算設了', '100', true],
  ])('%s', (_name, distance, expectedIsSet) => {
    // 零那一列是這整個 getter 存在的理由：decimal.js 把零當成正的
    // （`new Decimal(0).isPositive() === true`），而後端的精確小數不是。
    // 各自在呼叫端寫一次的那一天，其中一個會寫成 isPositive()。
    expect(new ExitDistanceDomain(new Decimal(distance), STOP_LOSS_DISTANCE).isSet)
      .toBe(expectedIsSet)
  })
})
