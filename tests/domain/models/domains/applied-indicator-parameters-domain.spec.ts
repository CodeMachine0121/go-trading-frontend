import { describe, expect, it, vi } from 'vitest'
import { AppliedIndicatorParametersDomain } from '~/domain/models/domains/applied-indicator-parameters-domain'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'

const STRATEGY_ID = 7

function lookbackCount(name: string, value: number): StrategyParameterDto {
  return new StrategyParameterDto(name, 'lookbackCount', value)
}

/** 「記住一個旋鈕被調成什麼」是一種能力，替身照介面給——不手刻假實作。 */
function preferenceOf(remembered: Record<string, number> = {}): IStrategyParameterValuePreferenceProxy {
  return {
    readValue: vi.fn((_strategyId: number, name: string) => remembered[name] ?? null),
    writeValue: vi.fn(),
  }
}

function domainOf(
  declared: StrategyParameterDto[], remembered: Record<string, number> = {},
  preference = preferenceOf(remembered),
) {
  return {
    domain: new AppliedIndicatorParametersDomain(STRATEGY_ID, declared, preference),
    preference,
  }
}

describe('AppliedIndicatorParametersDomain：宣告是唯一的真相', () => {
  it('沒調過時用策略記著的預設值', () => {
    const { domain } = domainOf([lookbackCount('期數', 20)])

    expect(domain.toDtos().map(one => one.value)).toEqual([20])
  })

  it('調過時用記住的那個值', () => {
    const { domain } = domainOf([lookbackCount('期數', 20)], { 期數: 60 })

    expect(domain.toDtos().map(one => one.value)).toEqual([60])
  })

  it('策略多宣告了一個時，新的那一格用它自己的預設值', () => {
    const { domain } = domainOf(
      [lookbackCount('期數', 20), new StrategyParameterDto('倍數', 'number', 2)],
      { 期數: 60 })

    expect(domain.toDtos().map(one => [one.name, one.value])).toEqual([['期數', 60], ['倍數', 2]])
  })

  it('策略不再宣告某個旋鈕時，記住的值整個消失', () => {
    // 留著它只會讓一個畫面上找不到、使用者也改不動的旋鈕繼續影響計算。
    const { domain } = domainOf([new StrategyParameterDto('倍數', 'number', 2)], { 期數: 60 })

    expect(domain.toDtos().map(one => one.name)).toEqual(['倍數'])
  })

  it('旋鈕被改名時，舊值丟掉、新名字用預設值', () => {
    // 改名不需要第三條規則：它就是「少了一個舊的、多了一個新的」。
    const { domain } = domainOf([lookbackCount('週期', 20)], { 期數: 60 })

    expect(domain.toDtos().map(one => [one.name, one.value])).toEqual([['週期', 20]])
  })

  it('種類一律照宣告——它決定畫面長什麼樣，也決定要不要多拿 K 線', () => {
    const { domain } = domainOf(
      [lookbackCount('期數', 20), new StrategyParameterDto('倍數', 'number', 2)],
      { 期數: 60, 倍數: 3 })

    expect(domain.toDtos().map(one => one.kind)).toEqual(['lookbackCount', 'number'])
  })

  it('讀不到記憶時全部用預設值——瀏覽器不讓存東西不是失敗', () => {
    const unreadable: IStrategyParameterValuePreferenceProxy = {
      readValue: vi.fn().mockReturnValue(null),
      writeValue: vi.fn(),
    }
    const { domain } = domainOf([lookbackCount('期數', 20)], {}, unreadable)

    expect(domain.toDtos().map(one => one.value)).toEqual([20])
  })

  it('一個旋鈕都沒宣告時交出空的一份', () => {
    expect(domainOf([]).domain.toDtos()).toEqual([])
  })
})

describe('AppliedIndicatorParametersDomain：記下這一次調成什麼', () => {
  it('逐個名稱記下來', () => {
    const { domain, preference } = domainOf([lookbackCount('期數', 20)])

    domain.remember([lookbackCount('期數', 60), new StrategyParameterDto('倍數', 'number', 2)])

    expect(preference.writeValue).toHaveBeenCalledWith(STRATEGY_ID, '期數', 60)
    expect(preference.writeValue).toHaveBeenCalledWith(STRATEGY_ID, '倍數', 2)
  })

  it('後記的蓋前記的——記住的是最後設定的那一個值', () => {
    const { domain, preference } = domainOf([lookbackCount('期數', 20)])

    domain.remember([lookbackCount('期數', 20)])
    domain.remember([lookbackCount('期數', 60)])

    expect(preference.writeValue).toHaveBeenLastCalledWith(STRATEGY_ID, '期數', 60)
  })
})
