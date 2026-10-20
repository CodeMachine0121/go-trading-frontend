import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import { StrategyBotWatchedSymbol } from '~/domain/models/entities/strategy-bot-watched-symbol'
import { AutoOrderPositionVo } from '~/domain/models/vo/auto-order-position-vo'
import type { StrategyBotHaltReasonVo } from '~/domain/models/vo/strategy-bot-halt-reason-vo'

function aWatchedSymbol(overrides: Partial<{
  lastSentSignal: string
  conflicting: boolean
  haltReason: StrategyBotHaltReasonVo | null
  autoOrderPosition: AutoOrderPositionVo | null
  marketDataKind: string
}> = {}) {
  return new StrategyBotWatchedSymbol(
    'ETHUSDT',
    overrides.lastSentSignal ?? '',
    overrides.conflicting ?? false,
    overrides.haltReason ?? null,
    overrides.autoOrderPosition ?? null,
  ).toDomain(new MarketDataKindDomain(overrides.marketDataKind ?? 'kCandle')).toDto()
}

describe('StrategyBotWatchedSymbolDomain', () => {
  it.each([
    { name: '上次送出買入', overrides: { lastSentSignal: 'buy' }, state: '買入', english: 'Buy', tone: 'neutral' },
    { name: '上次送出賣出', overrides: { lastSentSignal: 'sell' }, state: '賣出', english: 'Sell', tone: 'neutral' },
    { name: '上次送出持有', overrides: { lastSentSignal: 'hold' }, state: '持有', english: 'Hold', tone: 'neutral' },
    { name: '還沒送出過', overrides: {}, state: '還沒送出過', english: 'None sent yet', tone: 'neutral' },
    { name: '規則打架', overrides: { lastSentSignal: 'buy', conflicting: true }, state: '規則打架了', english: 'Rules conflict', tone: 'warning' },
    { name: '標的停擺', overrides: { conflicting: true, haltReason: 'scriptFailed' as const }, state: '停擺', english: 'Halted', tone: 'danger' },
    { name: '認不得的停擺原因當成沒有', overrides: { haltReason: 'somethingNew' as StrategyBotHaltReasonVo }, state: '還沒送出過', english: 'None sent yet', tone: 'neutral' },
  ])('$name 的一眼狀態是「$state」，語氣 $tone', ({ overrides, state, english, tone }) => {
    const watchedSymbol = aWatchedSymbol(overrides)

    expect(watchedSymbol.stateLabel.in('zh-TW')).toBe(state)
    expect(watchedSymbol.stateLabel.in('en')).toBe(english)
    expect(watchedSymbol.stateTone).toBe(tone)
  })

  it.each([
    { haltReason: 'scriptFailed' as const, isHalted: true, label: '有一支策略腳本算不出來' },
    { haltReason: 'orderFlowRefused' as const, isHalted: true, label: '它要的訂單流超過一次能給的範圍（天數或價位數）' },
    { haltReason: null, isHalted: false, label: undefined },
  ])('停擺原因 $haltReason 說得出來', ({ haltReason, isHalted, label }) => {
    const watchedSymbol = aWatchedSymbol({ haltReason })

    expect(watchedSymbol.isHalted).toBe(isHalted)
    expect(watchedSymbol.haltReasonLabel?.in('zh-TW')).toBe(label)
  })

  it.each([
    { name: '合約做多', position: new AutoOrderPositionVo('long', new Decimal('0.01')), expected: '多 0.01' },
    { name: '合約空手', position: new AutoOrderPositionVo('', new Decimal('0')), expected: '空手' },
    { name: '現貨沒有持倉', position: null, expected: undefined },
  ])('$name 的機器人持倉', ({ position, expected }) => {
    expect(aWatchedSymbol({ autoOrderPosition: position }).autoOrderPositionLabel?.in('zh-TW')).toBe(expected)
  })

  it.each([
    { marketDataKind: 'contractKCandle', expected: 'ETHUSDT 永續合約' },
    { marketDataKind: 'kCandle', expected: 'ETHUSDT' },
  ])('$marketDataKind 的標的唸成「$expected」', ({ marketDataKind, expected }) => {
    const watchedSymbol = aWatchedSymbol({ marketDataKind })

    expect(watchedSymbol.symbol).toBe('ETHUSDT')
    expect(watchedSymbol.symbolLabel.in('zh-TW')).toBe(expected)
  })
})
