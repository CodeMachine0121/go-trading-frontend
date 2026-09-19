import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { BacktestTransactionCostsDomain } from '~/domain/models/domains/backtest-transaction-costs-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

function transactionCosts(entryCost: string, exitCost: string) {
  return new BacktestTransactionCostsDomain(new Decimal(entryCost), new Decimal(exitCost))
}

describe('BacktestTransactionCostsDomain', () => {
  it.each([
    ['兩個都填', '0.0855', '0.3855'],
    ['兩個都留白——這一次交易免費', '0', '0'],
    ['只填進場，出場由後端沿用它', '0.1', '0'],
    ['只填出場', '0', '0.1'],
    ['整筆成交金額都拿去付成本', '100', '0'],
  ])('%s 送得出去', (_name, entryCost, exitCost) => {
    expect(() => transactionCosts(entryCost, exitCost).validate()).not.toThrow()
  })

  it.each([
    ['進場是負的', '-1', '0', '進場成本率不得為負'],
    ['進場超過一百', '101', '0', '進場成本率不得超過 100%'],
    ['出場是負的', '0', '-1', '出場成本率不得為負'],
    ['出場超過一百', '0', '101', '出場成本率不得超過 100%'],
  ])('%s 就送不出去', (_name, entryCost, exitCost, expectedWords) => {
    expect(() => transactionCosts(entryCost, exitCost).validate())
      .toThrow(expect.objectContaining({ message: expect.stringContaining(expectedWords) }))
  })

  it('根本不是一個數字時說得出來', () => {
    // 那一格是數字輸入框，所以這條在畫面上到不了——它守的是下一個呼叫者，
    // 與出場距離那一側的同一條守門一字不差。
    expect(() => new BacktestTransactionCostsDomain(
      new Decimal(Number.NaN), new Decimal(0)).validate())
      .toThrow(expect.objectContaining({
        message: expect.stringContaining('進場成本率請填一個數字'),
      }))
  })

  it('拒絕指向那一組，不是指向其中一格', () => {
    // 兩格在畫面上併排填成一組，而句子本身已經說出是哪一個費率——
    // 第二個欄位名只會重複一個句子已經說過的詞。
    expect(() => transactionCosts('-1', '0').validate()).toThrow(BacktestFieldError)
    expect(() => transactionCosts('-1', '0').validate())
      .toThrow(expect.objectContaining({ field: 'transactionCosts' }))
  })

  it('說不通的理由一次只講一個', () => {
    // 使用者一次只改得動一格，而兩句話並排會讓他不知道要先動哪一個。
    expect(() => transactionCosts('-1', '-1').validate())
      .toThrow(expect.objectContaining({
        message: expect.not.stringContaining('出場成本率'),
      }))
  })

  it('超過一百的理由講的是成本，不是價格', () => {
    // 與隔壁那兩個出場距離刻意不同：一個超過一百的距離會讓**價格**變成負數，
    // 一個超過一百的費率是收得比**成交金額**還多。拿到錯句子的人會去看錯的地方。
    expect(() => transactionCosts('101', '0').validate())
      .toThrow(expect.objectContaining({
        message: expect.stringContaining('成本不會超過成交金額本身'),
      }))
  })
})
