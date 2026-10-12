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
  referencePrice: string
  entrySlippageTolerancePercentage: string
  requestedQuantity: string
  entryLimitPrice: string
  entryStatus: string
  entryExecutedQuantity: string
  entrySlippagePercentage: string
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
    figure(overrides.referencePrice),
    figure(overrides.entrySlippageTolerancePercentage),
    figure(overrides.requestedQuantity),
    figure(overrides.entryLimitPrice),
    overrides.entryStatus ?? '',
    figure(overrides.entryExecutedQuantity),
    figure(overrides.entrySlippagePercentage),
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

  describe('限價進場單', () => {
    const entry = {
      referencePrice: '84154', entrySlippageTolerancePercentage: '0.1', requestedQuantity: '0.002', entryLimitPrice: '84238.1',
    }

    it('全部成交：下單結果照舊，下一行寫進場單狀態、參考價、限價、成交與帶正號的滑價', () => {
      const dto = result({
        ...entry, status: 'filled', action: '做多', openedQuantity: '0.002', openAveragePrice: '84180',
        entryStatus: 'filled', entryExecutedQuantity: '0.002', entrySlippagePercentage: '0.031',
      })

      expect(dto.text.in('zh-TW')).toBe('成交 · 做多 · 開倉 0.002 @ 84180')
      expect(dto.entryText?.in('zh-TW')).toBe('全部成交 · 參考價 84154 · 限價 84238.1 · 成交 0.002／0.002 · 滑價 +0.031%')
      expect(dto.entryText?.in('en')).toBe('Fully filled · Reference 84154 · Limit 84238.1 · Filled 0.002/0.002 · Slippage +0.031%')
    })

    it('還在等成交：狀態說等待成交，進場行寫已成交 0', () => {
      const dto = result({ ...entry, status: 'pending', action: '做多', entryStatus: 'working', entryExecutedQuantity: '0' })

      expect(dto.text.in('zh-TW')).toBe('等待成交 · 做多')
      expect(dto.text.in('en')).toBe('Waiting for fill · Long')
      expect(dto.tone).toBe('neutral')
      expect(dto.entryText?.in('zh-TW')).toBe('等待成交 · 參考價 84154 · 限價 84238.1 · 成交 0／0.002')
    })

    it('部分成交：寫其餘已撤單與成交 0.001／0.002', () => {
      const dto = result({ ...entry, status: 'filled', entryStatus: 'partiallyFilled', entryExecutedQuantity: '0.001' })

      expect(dto.entryText?.in('zh-TW')).toBe('部分成交，其餘已撤單 · 參考價 84154 · 限價 84238.1 · 成交 0.001／0.002')
      expect(dto.entryText?.in('en')).toBe('Partially filled, rest cancelled · Reference 84154 · Limit 84238.1 · Filled 0.001/0.002')
    })

    it('沒有成交：狀態說沒有成交、提醒語氣；進場行寫沒有成交已撤單', () => {
      const dto = result({ ...entry, status: 'unfilled', action: '做多', entryStatus: 'unfilled', entryExecutedQuantity: '0' })

      expect(dto.text.in('zh-TW')).toBe('沒有成交 · 做多')
      expect(dto.text.in('en')).toBe('Not filled · Long')
      expect(dto.tone).toBe('warning')
      expect(dto.entryText?.in('zh-TW')).toBe('沒有成交，已撤單 · 參考價 84154 · 限價 84238.1 · 成交 0／0.002')
      expect(dto.entryText?.in('en')).toBe('Not filled, cancelled · Reference 84154 · Limit 84238.1 · Filled 0/0.002')
    })

    it('沒有成交量但有要求數量時讀作一點都還沒成交', () => {
      expect(result({ ...entry, status: 'unfilled', entryStatus: 'unfilled' }).entryText?.in('zh-TW'))
        .toBe('沒有成交，已撤單 · 參考價 84154 · 限價 84238.1 · 成交 0／0.002')
    })

    it.each([
      { slippage: '-0.012', expected: '滑價 -0.012%' },
      { slippage: '0', expected: '滑價 0%' },
    ])('滑價 $slippage 寫成「$expected」，不加正號', ({ slippage, expected }) => {
      expect(result({ status: 'filled', entrySlippagePercentage: slippage }).entryText?.in('zh-TW')).toBe(expected)
    })

    it('沒有任何進場資訊的那一輪不多畫一行', () => {
      expect(result({ status: 'filled', action: '平多', closedQuantity: '0.002', closeAveragePrice: '84000' }).entryText)
        .toBeNull()
    })

    it.each(['teleported', 'constructor'])('認不得的進場單狀態（%s）不寫那一段，其餘照寫', (entryStatus) => {
      expect(result({ status: 'filled', referencePrice: '84154', entryStatus }).entryText?.in('zh-TW')).toBe('參考價 84154')
    })

    it('等待中但進場單已不在等成交時，狀態仍是等待下單', () => {
      expect(result({ status: 'pending', entryStatus: 'filled' }).text.in('zh-TW')).toBe('等待下單')
    })
  })
})
