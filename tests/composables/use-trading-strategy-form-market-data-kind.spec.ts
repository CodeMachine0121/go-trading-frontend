// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const STRATEGY_OPTIONS = [{ value: 9, label: '均線' }]

function formUnderTest(editing: TradingStrategyDto | null = null) {
  return useTradingStrategyForm(() => editing, () => STRATEGY_OPTIONS)
}

function aStoredContractStrategy() {
  return new TradingStrategyDto(
    3, '費率反轉',
    [new TradingStrategySignalSourceDto('費率', 21, '1h', [])],
    new TradingStrategyConditionDto('b', null, [], '費率', 'buy'),
    new TradingStrategyConditionDto('s', null, [], '費率', 'sell'),
    'contractKCandle', new LocalizedTextVo('合約行情', 'Contract market data'), true)
}

describe('useTradingStrategyForm 的行情種類', () => {
  it('新拼一份時是 K 線，送出去的也是 K 線', () => {
    const form = formUnderTest()
    form.reset()

    expect(form.marketDataKind.value).toBe('kCandle')
    expect(form.marketDataKindLocked.value).toBe(false)
    form.name.value = '均線交叉'
    form.addSignalSource()
    form.conditionSides[0]!.placeAt('均線', 0)
    form.conditionSides[1]!.placeAt('均線', 0)
    form.conditionSides[1]!.toggleSignal('均線', 'buy')
    form.conditionSides[1]!.toggleSignal('均線', 'sell')

    const writeDto = form.toWriteDto()
    expect(writeDto?.marketDataKind).toBe('kCandle')
  })

  it('換成合約行情時，已加的信號來源全部拿掉並說明為什麼', () => {
    const form = formUnderTest()
    form.reset()
    form.addSignalSource()
    form.addSignalSource()

    form.changeMarketDataKind('contractKCandle')

    expect(form.marketDataKind.value).toBe('contractKCandle')
    expect(form.signalSources.value).toHaveLength(0)
    expect(form.marketDataKindNotice.value?.in('zh-TW')).toContain('原本的信號來源吃的是另一種行情，已經拿掉')
    expect(form.marketDataKindNotice.value?.in('en')).toContain('the previous signal sources read the other kind')
  })

  it('還沒加任何來源就換，不必說任何話', () => {
    const form = formUnderTest()
    form.reset()

    form.changeMarketDataKind('contractKCandle')

    expect(form.marketDataKindNotice.value).toBeNull()
  })

  it('合約交易策略送出去的只有行情種類，沒有交易模式', () => {
    const form = formUnderTest()
    form.reset()
    form.changeMarketDataKind('contractKCandle')

    form.name.value = '費率反轉'
    form.addSignalSource()
    form.conditionSides[0]!.placeAt('均線', 0)
    form.conditionSides[1]!.placeAt('均線', 0)
    form.conditionSides[1]!.toggleSignal('均線', 'buy')
    form.conditionSides[1]!.toggleSignal('均線', 'sell')

    const writeDto = form.toWriteDto()
    expect(writeDto?.marketDataKind).toBe('contractKCandle')
    expect(writeDto).not.toHaveProperty('tradingMode')
  })

  it('已存的那一份換不了行情種類', () => {
    const form = formUnderTest(aStoredContractStrategy())
    form.reset()

    expect(form.marketDataKindLocked.value).toBe(true)

    form.changeMarketDataKind('kCandle')

    expect(form.marketDataKind.value).toBe('contractKCandle')
    expect(form.signalSources.value).toHaveLength(1)
  })
})
