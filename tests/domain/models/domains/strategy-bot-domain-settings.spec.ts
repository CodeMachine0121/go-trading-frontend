import { describe, expect, it } from 'vitest'
import Decimal from 'decimal.js'
import { StrategyBot } from '~/domain/models/entities/strategy-bot'
import { StrategyBotWatchedSymbol } from '~/domain/models/entities/strategy-bot-watched-symbol'
import { StrategyBotNotificationsDto } from '~/domain/models/dto/strategy-bot-notifications-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { TradingDirection } from '~/domain/models/vo/trading-direction-vo'

function aBot(
  marketDataKind: MarketDataKind, tradingDirections: TradingDirection[], notifications: StrategyBotNotificationsDto,
) {
  return new StrategyBot(
    7, '費率反轉', [new StrategyBotWatchedSymbol('BTCUSDT', '', false, null, null, new Decimal(100))],
    5, 11, '費率反轉', 'stopped', null, null, marketDataKind, false, new Decimal('0.1'),
    tradingDirections, notifications)
}

describe('StrategyBotDomain 交出的設定', () => {
  it('合約機器人：詳細區寫「做多＋做空（多空反手）」與「買入、賣出」，表單拿得到勾選', () => {
    const dto = aBot('contractKCandle', ['long', 'short'], new StrategyBotNotificationsDto(true, true, false))
      .toDomain().toDto()

    expect(dto.tradingDirectionsLabel?.in('zh-TW')).toBe('做多＋做空（多空反手）')
    expect(dto.notificationsLabel?.in('zh-TW')).toBe('買入、賣出')
    expect(dto.tradingDirections).toEqual(['long', 'short'])
    expect(dto.notifications).toEqual(new StrategyBotNotificationsDto(true, true, false))
  })

  it('合約機器人只做空：清單上的簡稱是「只做空」', () => {
    const dto = aBot('contractKCandle', ['short'], new StrategyBotNotificationsDto()).toDomain().toDto()

    expect(dto.tradingDirectionsShortLabel?.in('zh-TW')).toBe('只做空')
  })

  it('現貨機器人通知全關：沒有交易方向，通知寫「全部關閉」', () => {
    const dto = aBot('kCandle', [], new StrategyBotNotificationsDto(false, false, false)).toDomain().toDto()

    expect(dto.tradingDirectionsLabel).toBeNull()
    expect(dto.tradingDirectionsShortLabel).toBeNull()
    expect(dto.tradingDirections).toEqual([])
    expect(dto.notificationsLabel?.in('zh-TW')).toBe('全部關閉')
  })

  it('現貨機器人就算帶著方向，也不說它有交易方向', () => {
    const dto = aBot('kCandle', ['long'], new StrategyBotNotificationsDto()).toDomain().toDto()

    expect(dto.tradingDirections).toEqual([])
    expect(dto.tradingDirectionsLabel).toBeNull()
  })
})
