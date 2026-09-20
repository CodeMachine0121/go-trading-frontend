import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { BacktestExitLevelsDomain } from '~/domain/models/domains/backtest-exit-levels-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

function exitLevels(stopLoss: string, takeProfit: string) {
  return new BacktestExitLevelsDomain(new Decimal(stopLoss), new Decimal(takeProfit))
}

describe('BacktestExitLevelsDomain', () => {
  it.each([
    ['兩個都填', '2', '5'],
    ['兩個都留白——這一次不模擬任何出場', '0', '0'],
    ['只填止損', '2', '0'],
    ['只填止盈', '0', '5'],
    ['整個價格那麼遠的止損', '100', '0'],
  ])('%s 送得出去', (_name, stopLoss, takeProfit) => {
    expect(() => exitLevels(stopLoss, takeProfit).validate()).not.toThrow()
  })

  it.each([
    ['止損是負的', '-2', '5', '止損距離不得為負'],
    ['止損超過一百', '120', '5', '止損距離不得超過 100%'],
    ['止盈是負的', '2', '-5', '止盈距離不得為負'],
    ['止盈超過一百', '2', '120', '止盈距離不得超過 100%'],
  ])('%s 就送不出去', (_name, stopLoss, takeProfit, expectedWords) => {
    expect(() => exitLevels(stopLoss, takeProfit).validate())
      .toThrow(expect.objectContaining({ message: expect.stringContaining(expectedWords) }))
  })

  it('拒絕指著出場價位那一組，而不是其中一格', () => {
    // 兩格併排填成一組，而句子已經說出是止損還是止盈。後端也是這樣回的。
    try {
      exitLevels('-2', '5').validate()
      expect.unreachable('這一組不該送得出去')
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(BacktestFieldError)
      expect((error as BacktestFieldError).field).toBe('exitLevels')
    }
  })

  it('說的是「止損」而不是「停損」——回測的距離從進場價量起', () => {
    // 後端把這兩組詞分成兩件事：回測的距離從**進場價**量起（止損／止盈），
    // 機器人建議的部位從**最新價**量起（停損／停利）。同一個模型替兩邊驗證，
    // 但它帶著的名字必須是呼叫它的那一邊的名字——混用等於把兩件事說成一件。
    try {
      exitLevels('-2', '0').validate()
      expect.unreachable('這一組不該送得出去')
    }
    catch (error: unknown) {
      expect((error as BacktestFieldError).message).not.toContain('停損')
    }
  })

  it('一次只說一個理由', () => {
    // 使用者一次只改得動一格，而兩個紅字讓人不知道要從哪裡開始。
    try {
      exitLevels('-2', '-5').validate()
      expect.unreachable('這一組不該送得出去')
    }
    catch (error: unknown) {
      expect((error as BacktestFieldError).message).toContain('止損距離')
      expect((error as BacktestFieldError).message).not.toContain('止盈距離')
    }
  })
})
