import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { StrategyBotWriteDomain } from '~/domain/models/domains/strategy-bot-write-domain'
import { StrategyBotWriteDto } from '~/domain/models/dto/strategy-bot-write-dto'
import { PositionPlanDto } from '~/domain/models/dto/position-plan-dto'

/** 一台每一條規則都過得了的機器人，好讓每個案例只改它要講的那一格。 */
function aBotWrite(overrides: Partial<{
  name: string
  symbol: string
  tradingStrategyId: number
  triggerIntervalMinutes: number
  positionPlan: PositionPlanDto | null
}> = {}) {
  return new StrategyBotWriteDomain(new StrategyBotWriteDto(
    undefined,
    overrides.name ?? '早盤突破',
    overrides.symbol ?? 'BTCUSDT',
    overrides.tradingStrategyId ?? 9,
    overrides.triggerIntervalMinutes ?? 5,
    'positionPlan' in overrides ? overrides.positionPlan! : null,
  ))
}

describe('StrategyBotWriteDomain', () => {
  it('四格都填對就送得出去', () => {
    expect(aBotWrite().isSendable).toBe(true)
    expect(aBotWrite().rejection).toBeNull()
  })

  it.each([
    ['名稱只有空白', { name: '   ' }, '取一個名稱'],
    ['名稱超過上限', { name: '名'.repeat(129) }, '長度上限為 128 個字'],
    ['沒挑交易策略', { tradingStrategyId: 0 }, '必須挑一份交易策略'],
    ['沒說要盯哪一檔', { symbol: '  ' }, '要盯哪一個交易標的'],
    ['觸發間隔是零', { triggerIntervalMinutes: 0 }, '必須大於零'],
    ['觸發間隔超過一天', { triggerIntervalMinutes: 1441 }, '上限是 1440 分鐘'],
  ])('%s就送不出去，並說出是哪一件事', (_situation, overrides, expectedMessage) => {
    const writeDomain = aBotWrite(overrides)

    expect(writeDomain.isSendable).toBe(false)
    expect(writeDomain.rejection).toContain(expectedMessage)
  })

  it('一次只說一個理由', () => {
    // 使用者一次只改得動一格；一張同時亮起四個紅字的表單，
    // 第一個反應是不知道要從哪裡開始。
    const writeDomain = aBotWrite({ name: '', symbol: '', triggerIntervalMinutes: 0 })

    expect(writeDomain.rejection).toBe('必須給機器人取一個名稱')
  })

  // 一台機器人不會有自己的一份規則複本——它指名一份，而那正是好幾台共用一份的前提。
  it('送出去的那一份只有機器的事，沒有規則', () => {
    const sendable = aBotWrite({ name: '  早盤突破  ', symbol: '  BTCUSDT  ' }).sendable

    expect(sendable.name).toBe('早盤突破')
    expect(sendable.symbol).toBe('BTCUSDT')
    expect(sendable.tradingStrategyId).toBe(9)
    expect(Object.keys(sendable)).not.toContain('buyCondition')
    expect(Object.keys(sendable)).not.toContain('signalSources')
  })
})

// 「區塊收著的時候一格都不看」在這裡落地：沒有部位規劃就一句都不問。
// 那一台不建議部位，那五格填什麼都不影響它。
describe('StrategyBotWriteDomain 的部位規劃', () => {
  it('沒有部位規劃時一句都不問', () => {
    expect(aBotWrite({ positionPlan: null }).rejection).toBeNull()
  })

  it('有部位規劃就問它，而它說不出去的理由原樣交出來', () => {
    const botWrite = aBotWrite({
      positionPlan: new PositionPlanDto(
        new Decimal(50000), 'percentage', new Decimal(150),
        new Decimal(3), new Decimal(3), new Decimal(5)),
    })

    // 押多少那一條由回測那一列已經在用的模型答，所以兩張表單對同一個 150
    // 講的是同一句話。
    expect(botWrite.rejection).toContain('百分比要大於零且不超過一百')
  })

  it('四格的理由先講完，才輪到部位規劃', () => {
    // 一台連名字都沒有的機器人，先講它的槓桿沒有意義。
    const botWrite = aBotWrite({
      name: '   ',
      positionPlan: new PositionPlanDto(
        new Decimal(50000), 'allIn', new Decimal(0),
        new Decimal('0.5'), new Decimal(3), new Decimal(5)),
    })

    expect(botWrite.rejection).toContain('名稱')
    expect(botWrite.rejection).not.toContain('槓桿')
  })

  it('交出去的那一份原樣帶著那一組', () => {
    const positionPlan = new PositionPlanDto(
      new Decimal(50000), 'allIn', new Decimal(0),
      new Decimal(1), new Decimal(3), new Decimal(0))

    expect(aBotWrite({ positionPlan }).sendable.positionPlan).toBe(positionPlan)
  })
})
