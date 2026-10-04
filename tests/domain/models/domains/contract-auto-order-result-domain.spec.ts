import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractAutoOrderResult } from '~/domain/models/entities/contract-auto-order-result'

function result(overrides: Partial<{
  status: string
  action: string
  closedQuantity: string
  closeAveragePrice: string
  openedQuantity: string
  openAveragePrice: string
  stopLossPrice: string
  takeProfitPrice: string
  protectionMissing: boolean
  reason: string
}> = {}) {
  const figure = (value: string | undefined) => value === undefined ? null : new Decimal(value)
  return new ContractAutoOrderResult(
    overrides.status ?? 'pending',
    overrides.action ?? '',
    figure(overrides.closedQuantity),
    figure(overrides.closeAveragePrice),
    figure(overrides.openedQuantity),
    figure(overrides.openAveragePrice),
    figure(overrides.stopLossPrice),
    figure(overrides.takeProfitPrice),
    overrides.protectionMissing ?? false,
    overrides.reason ?? '',
  ).toDomain().toDto()
}

describe('ContractAutoOrderResultDomain', () => {
  it('成交的那一輪照順序說出動作、開倉、止損、止盈', () => {
    const dto = result({
      status: 'filled', action: '做多', openedQuantity: '0.002', openAveragePrice: '85000',
      stopLossPrice: '83725', takeProfitPrice: '87550',
    })

    expect(dto.text.in('zh-TW')).toBe('成交 · 做多 · 開倉 0.002 @ 85000 · 止損 83725 · 止盈 87550')
    expect(dto.text.in('en')).toBe('Filled · Long · Opened 0.002 @ 85000 · Stop loss 83725 · Take profit 87550')
    expect(dto.tone).toBe('success')
    expect(dto.protectionWarning).toBeNull()
  })

  it('反手那一輪先說平倉再說開倉', () => {
    const dto = result({
      status: 'filled', action: '反手做空', closedQuantity: '0.002', closeAveragePrice: '85100',
      openedQuantity: '0.002', openAveragePrice: '85090',
    })

    expect(dto.text.in('zh-TW')).toBe('成交 · 反手做空 · 平倉 0.002 @ 85100 · 開倉 0.002 @ 85090')
    expect(dto.text.in('en')).toBe('Filled · Reverse to short · Closed 0.002 @ 85100 · Opened 0.002 @ 85090')
  })

  it.each([
    { status: 'pending', zh: '等待下單', en: 'Pending', tone: 'neutral' },
    { status: 'partiallyDone', zh: '平倉了但新方向沒開成', en: 'Closed, new side not opened', tone: 'warning' },
    { status: 'notPlaced', zh: '沒有下單', en: 'Not placed', tone: 'warning' },
    { status: 'abandoned', zh: '放棄', en: 'Given up', tone: 'warning' },
    // 認不得的不說成成交：那是在說一筆不知道有沒有的單已經成了。
    { status: 'teleported', zh: '等待下單', en: 'Pending', tone: 'neutral' },
    { status: 'constructor', zh: '等待下單', en: 'Pending', tone: 'neutral' },
  ])('$status 說成「$zh」／$en、語氣 $tone', ({ status, zh, en, tone }) => {
    const dto = result({ status })

    expect(dto.text.in('zh-TW')).toBe(zh)
    expect(dto.text.in('en')).toBe(en)
    expect(dto.tone).toBe(tone)
  })

  it.each([
    {
      example: '例 8',
      given: { status: 'notPlaced', action: '做多', reason: '餘額不足' },
      expected: '沒有下單 · 做多 · 餘額不足',
    },
    {
      example: '例 9',
      given: { status: 'abandoned', action: '做多', reason: '訊號已經過時，沒有下單' },
      expected: '放棄 · 做多 · 訊號已經過時，沒有下單',
    },
    {
      example: '例 13',
      given: {
        status: 'partiallyDone', action: '平多', closedQuantity: '0.002', closeAveragePrice: '84000',
        reason: '已平倉，但做空沒開成：餘額不足',
      },
      expected: '平倉了但新方向沒開成 · 平多 · 平倉 0.002 @ 84000 · 已平倉，但做空沒開成：餘額不足',
    },
    {
      example: '原因排在止損止盈之後',
      given: {
        status: 'filled', action: '做多', openedQuantity: '0.002', openAveragePrice: '85000',
        stopLossPrice: '83725', takeProfitPrice: '87550', reason: '幣安上已沒有這筆倉位',
      },
      expected: '成交 · 做多 · 開倉 0.002 @ 85000 · 止損 83725 · 止盈 87550 · 幣安上已沒有這筆倉位',
    },
  ])('$example：寫成「$expected」', ({ given, expected }) => {
    expect(result(given).text.in('zh-TW')).toBe(expected)
  })

  it('很小的數字照實寫成一般數字，不寫成科學記號', () => {
    expect(result({ status: 'filled', openedQuantity: '0.00000001', openAveragePrice: '85000' }).text.in('zh-TW'))
      .toBe('成交 · 開倉 0.00000001 @ 85000')
  })

  it('沒下單的原因照交易服務的原話接在後面，英文也一樣', () => {
    const dto = result({ status: 'notPlaced', action: '做多', reason: '餘額不足' })

    expect(dto.text.in('zh-TW')).toBe('沒有下單 · 做多 · 餘額不足')
    expect(dto.text.in('en')).toBe('Not placed · Long · 餘額不足')
  })

  it('認不得的動作原樣呈現，不猜英文', () => {
    expect(result({ status: 'filled', action: '加碼' }).text.in('en')).toBe('Filled · 加碼')
  })

  it.each(['filled', 'partiallyDone', 'pending'])('止損或止盈沒掛上（%s）：不論狀態都用危險語氣，另給一句要他立刻處理', (status) => {
    const dto = result({
      status, action: '做多', openedQuantity: '0.002', openAveragePrice: '85000', protectionMissing: true,
    })

    expect(dto.tone).toBe('danger')
    expect(dto.protectionWarning?.in('zh-TW')).toBe('止損或止盈沒有掛上，請立刻到幣安自己處理')
    expect(dto.protectionWarning?.in('en'))
      .toBe('A stop-loss or take-profit order was not placed. Go to Binance and handle it yourself now.')
  })

  it('只有數量沒有均價的那一段不寫', () => {
    expect(result({ status: 'filled', openedQuantity: '0.002' }).text.in('zh-TW')).toBe('成交')
  })
})
