import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { LeverageMultiplierDomain } from '~/domain/models/domains/leverage-multiplier-domain'

function multiplier(value: string | number) {
  return new LeverageMultiplierDomain(new Decimal(value), '槓桿倍數')
}

describe('LeverageMultiplierDomain', () => {
  it.each([
    ['一倍——用自己的錢付清', '1'],
    ['五倍', '5'],
    ['帶小數的倍數', '2.5'],
    ['大得不像話但算得出來', '125'],
  ])('%s 講得通', (_name, value) => {
    expect(multiplier(value).validationMessage()).toBeNull()
  })

  it.each([
    ['半個部位不是槓桿', '0.5'],
    ['負的更不是', '-2'],
    // 零在這裡也是一個錯誤。哪一張表單把空白讀成零，是那張表單的事——
    // 機器人那張把空白讀成一倍，而它靠的正是這一條不放過零。
    ['零也是', '0'],
  ])('%s，說出同一句話', (_name, value) => {
    expect(multiplier(value).validationMessage()).toBe('槓桿倍數不得小於 1 倍')
  })

  it('根本不是一個數字時說得出來', () => {
    expect(multiplier(Number.NaN).validationMessage()).toBe('槓桿倍數請填一個數字')
  })

  it.each([
    ['一倍沒有在借錢——沒有債主就沒有人會來平倉', '1', false],
    ['零更沒有', '0', false],
    ['大於一才是借錢', '1.01', true],
    ['五倍當然是', '5', true],
  ])('%s', (_name, value, expected) => {
    // 門檻是一，不是零——這是它與出場距離、成本費率那兩個共用模型唯一的差別。
    expect(multiplier(value).isSet).toBe(expected)
  })
})
