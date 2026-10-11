import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { buildBacktestRun } from '../../../fixtures/backtest-run'

describe('BacktestRunDomain 狀態', () => {
  it.each([
    { status: 'queued', label: '排隊中', tone: 'neutral', isActive: true, canCancel: true, showsProgress: false },
    { status: 'running', label: '進行中', tone: 'info', isActive: true, canCancel: true, showsProgress: true },
    { status: 'succeeded', label: '完成', tone: 'success', isActive: false, canCancel: false, showsProgress: false },
    { status: 'failed', label: '失敗', tone: 'danger', isActive: false, canCancel: false, showsProgress: false },
    { status: 'cancelled', label: '已取消', tone: 'neutral', isActive: false, canCancel: false, showsProgress: false },
    // 認不得的狀態讀成失敗：把一筆不明的輪次說成還在跑，會讓人等一件不會發生的事。
    { status: 'weird', label: '失敗', tone: 'danger', isActive: false, canCancel: false, showsProgress: false },
  ])('$status → $label／$tone', ({ status, label, tone, isActive, canCancel, showsProgress }) => {
    const dto = buildBacktestRun({ status }).toDomain().toDto()

    expect(dto.statusLabel.in('zh-TW')).toBe(label)
    expect(dto.statusTone).toBe(tone)
    expect(dto.isActive).toBe(isActive)
    expect(dto.canCancel).toBe(canCancel)
    expect(dto.showsProgress).toBe(showsProgress)
  })

  it.each([
    { declared: 140, expected: 100 },
    { declared: -5, expected: 0 },
    { declared: 40.6, expected: 41 },
  ])('進度 $declared 收成 $expected', ({ declared, expected }) => {
    expect(buildBacktestRun({ progressPercent: declared }).toDomain().toDto().progressPercent).toBe(expected)
  })
})

describe('BacktestRunDomain 要跑什麼', () => {
  it('合約的寫出槓桿與交易模式', () => {
    const dto = buildBacktestRun({
      kind: 'contractScript', leverage: new Decimal(2), tradingMode: 'longOnly',
    }).toDomain().toDto()

    expect(dto.description.in('zh-TW')).toBe('BTCUSDT · 一小時 · 2x · 只做多')
    expect(dto.description.in('en')).toBe('BTCUSDT · 1 hour · 2x · Long only')
  })

  it('現貨的只有標的與刻度', () => {
    expect(buildBacktestRun().toDomain().toDto().description.in('zh-TW')).toBe('BTCUSDT · 一小時')
  })
})

describe('BacktestRunDomain 結束之後那一句', () => {
  it('完成：報酬率、最大回撤、筆數', () => {
    const dto = buildBacktestRun({
      status: 'succeeded', totalReturnRate: 0.255, maximumDrawdown: 0.101, tradeCount: 4,
    }).toDomain().toDto()

    expect(dto.outcome?.in('zh-TW')).toBe('+25.5% · 最大回撤 10.1% · 4 筆')
    expect(dto.outcome?.in('en')).toBe('+25.5% · max drawdown 10.1% · 4 trades')
  })

  it('賠錢的報酬率帶負號', () => {
    const dto = buildBacktestRun({
      status: 'succeeded', totalReturnRate: -0.08, maximumDrawdown: 0.2, tradeCount: 1,
    }).toDomain().toDto()

    expect(dto.outcome?.in('zh-TW')).toBe('-8.0% · 最大回撤 20.0% · 1 筆')
  })

  it('失敗：原因照後端的話', () => {
    const dto = buildBacktestRun({ status: 'failed', failureReason: '超過時間上限' }).toDomain().toDto()

    expect(dto.outcome?.in('zh-TW')).toBe('失敗：超過時間上限')
    expect(dto.outcome?.in('en')).toBe('Failed: 超過時間上限')
  })

  it.each([
    { failureReason: '' },
    { failureReason: '   ' },
  ])('失敗卻沒說原因（$failureReason）就只說失敗', ({ failureReason }) => {
    const dto = buildBacktestRun({ status: 'failed', failureReason }).toDomain().toDto()

    expect(dto.outcome?.in('zh-TW')).toBe('失敗')
    expect(dto.outcome?.in('en')).toBe('Failed')
  })

  it('已取消就說已取消', () => {
    expect(buildBacktestRun({ status: 'cancelled' }).toDomain().toDto().outcome?.in('zh-TW')).toBe('已取消')
  })

  it.each([
    { status: 'queued' },
    { status: 'running' },
    // 完成卻沒有摘要數字的（不該發生）也不硬湊一句。
    { status: 'succeeded' },
  ])('$status 沒有那一句', ({ status }) => {
    expect(buildBacktestRun({ status }).toDomain().toDto().outcome).toBeNull()
  })
})

describe('BacktestRunDomain 明細', () => {
  it('沒有成績單時 result 是 null', () => {
    expect(buildBacktestRun({ status: 'failed' }).toDomain().toDetailDto().result).toBeNull()
  })
})
