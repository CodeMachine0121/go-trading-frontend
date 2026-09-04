import { describe, expect, it } from 'vitest'
import { RememberedAppliedIndicatorsDomain } from '~/domain/models/domains/remembered-applied-indicators-domain'
import { RememberedAppliedIndicatorVo } from '~/domain/models/vo/remembered-applied-indicator-vo'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

function lookbackCount(name: string, value: number): StrategyParameterDto {
  return new StrategyParameterDto(name, 'lookbackCount', value)
}

function strategyOf(
  id: number, name: string, parameters: StrategyParameterDto[] = [], drawableOnChart = true,
): StrategyDto {
  return new StrategyDto(
    id, name, new StrategyContentDto('sum := 0.0', 'floatList', parameters), true, drawableOnChart)
}

function rememberedOf(
  strategyId: number, parameterValues: Record<string, number> = {},
): RememberedAppliedIndicatorVo {
  return new RememberedAppliedIndicatorVo(strategyId, new Map(Object.entries(parameterValues)))
}

function restore(
  remembered: RememberedAppliedIndicatorVo[], strategies: StrategyDto[],
  lastAppliedIndicatorId = 0,
) {
  return new RememberedAppliedIndicatorsDomain(remembered, strategies)
    .toAppliedIndicatorDtos(lastAppliedIndicatorId)
}

describe('RememberedAppliedIndicatorsDomain：上次那幾支自己回來', () => {
  it('一筆回來，帶著它留存的值', () => {
    const restored = restore(
      [rememberedOf(7, { 期數: 60 })], [strategyOf(7, '均線', [lookbackCount('期數', 20)])])

    expect(restored.map(one => [one.strategy.name, one.parameterSummary]))
      .toEqual([['均線', '期數 60']])
  })

  it('好幾筆依留存的順序回來——順序決定沒挑過顏色時誰先拿到哪個顏色', () => {
    const restored = restore(
      [rememberedOf(9), rememberedOf(7)], [strategyOf(7, '均線'), strategyOf(9, '布林')])

    expect(restored.map(one => one.strategy.name)).toEqual(['布林', '均線'])
  })

  it('同一支的兩筆各自帶著自己的值回來', () => {
    // 「這支上次調成什麼」只有一個答案，因此還原不能靠它——那會得到兩條一樣的線。
    const restored = restore(
      [rememberedOf(7, { 期數: 20 }), rememberedOf(7, { 期數: 60 })],
      [strategyOf(7, '均線', [lookbackCount('期數', 20)])])

    expect(restored.map(one => one.parameterSummary)).toEqual(['期數 20', '期數 60'])
  })

  it('一筆都沒留存時交出空的一份', () => {
    expect(restore([], [strategyOf(7, '均線')])).toEqual([])
  })

  it('一個旋鈕都沒有的那一筆照樣回來', () => {
    const restored = restore([rememberedOf(7)], [strategyOf(7, '均線')])

    expect(restored.map(one => [one.strategy.name, one.parameters.length]))
      .toEqual([['均線', 0]])
  })
})

describe('RememberedAppliedIndicatorsDomain：序號接在既有的後面繼續數', () => {
  it('從交出來的那一號之後開始給', () => {
    // 自己從 1 開始數會讓還原之後手動加入的那一筆撞號，
    // 而撞號的後果是移除一筆時兩筆一起消失。
    const restored = restore(
      [rememberedOf(7), rememberedOf(9)], [strategyOf(7, '均線'), strategyOf(9, '布林')], 5)

    expect(restored.map(one => one.id)).toEqual([6, 7])
  })

  it('跳過的那幾筆不佔號——回來的那幾筆序號連續', () => {
    const restored = restore(
      [rememberedOf(404), rememberedOf(7), rememberedOf(9)],
      [strategyOf(7, '均線'), strategyOf(9, '布林')])

    expect(restored.map(one => one.id)).toEqual([2, 3])
  })
})

describe('RememberedAppliedIndicatorsDomain：對不上現在的策略清單就不回來', () => {
  it('策略已經被刪掉的那一筆不回來，其餘照常', () => {
    const restored = restore([rememberedOf(404), rememberedOf(7)], [strategyOf(7, '均線')])

    expect(restored.map(one => one.strategy.name)).toEqual(['均線'])
  })

  it('現在畫不成線的那一筆不回來', () => {
    // 它在可挑清單裡本來就列得出來但挑不到，讓它自己回到圖上等於繞過那道擋。
    const restored = restore(
      [rememberedOf(7), rememberedOf(9)],
      [strategyOf(7, '是非策略', [], false), strategyOf(9, '布林')])

    expect(restored.map(one => one.strategy.name)).toEqual(['布林'])
  })

  it('一支策略都取不到時交出空的一份', () => {
    // 取不到策略清單只代表這一次沒有東西可對照，圖表本身照畫。
    expect(restore([rememberedOf(7)], [])).toEqual([])
  })

  it('策略改過名字時用現在的名字——留存的是它是哪一支，不是它叫什麼', () => {
    const restored = restore([rememberedOf(7)], [strategyOf(7, '二十根均線')])

    expect(restored.map(one => one.strategy.name)).toEqual(['二十根均線'])
  })
})

describe('RememberedAppliedIndicatorsDomain：宣告是唯一的真相', () => {
  it('策略多宣告了一個旋鈕時，新的那一格用它自己的預設值', () => {
    const restored = restore(
      [rememberedOf(7, { 期數: 60 })],
      [strategyOf(7, '均線', [
        lookbackCount('期數', 20), new StrategyParameterDto('倍數', 'number', 2)])])

    expect(restored[0]?.parameters.map(one => [one.name, one.value]))
      .toEqual([['期數', 60], ['倍數', 2]])
  })

  it('策略不再宣告某個旋鈕時，留存的值整個消失', () => {
    // 留著它只會讓一個畫面上找不到、使用者也改不動的旋鈕繼續影響計算。
    const restored = restore(
      [rememberedOf(7, { 期數: 60 })],
      [strategyOf(7, '均線', [new StrategyParameterDto('倍數', 'number', 2)])])

    expect(restored[0]?.parameters.map(one => [one.name, one.value])).toEqual([['倍數', 2]])
  })

  it('旋鈕被改名時，舊值丟掉、新名字用預設值', () => {
    // 改名不需要第三條規則：它就是「少了一個舊的、多了一個新的」。
    const restored = restore(
      [rememberedOf(7, { 期數: 60 })], [strategyOf(7, '均線', [lookbackCount('週期', 20)])])

    expect(restored[0]?.parameters.map(one => [one.name, one.value])).toEqual([['週期', 20]])
  })

  it('種類一律照宣告——它決定畫面長什麼樣，也決定要不要多拿 K 線', () => {
    const restored = restore(
      [rememberedOf(7, { 期數: 60, 倍數: 3 })],
      [strategyOf(7, '均線', [
        lookbackCount('期數', 20), new StrategyParameterDto('倍數', 'number', 2)])])

    expect(restored[0]?.parameters.map(one => one.kind)).toEqual(['lookbackCount', 'number'])
  })
})

describe('RememberedAppliedIndicatorsDomain：留存的值用不了時退回預設值', () => {
  it.each([
    { name: '零', rememberedValue: 0 },
    { name: '負數', rememberedValue: -5 },
    { name: '不是整數', rememberedValue: 20.5 },
  ])('回看根數是$name 時用策略的預設值，那一筆照樣回來', ({ rememberedValue }) => {
    // 用不了的值本來寫不進去，它出現在留存裡只有一種可能：那份留存被別的東西動過。
    const restored = restore(
      [rememberedOf(7, { 期數: rememberedValue })],
      [strategyOf(7, '均線', [lookbackCount('期數', 20)])])

    expect(restored.map(one => one.parameterSummary)).toEqual(['期數 20'])
  })

  it('數值那一種不受整數限制——1.5 照樣採用', () => {
    const restored = restore(
      [rememberedOf(7, { 倍數: 1.5 })],
      [strategyOf(7, '布林', [new StrategyParameterDto('倍數', 'number', 2)])])

    expect(restored.map(one => one.parameterSummary)).toEqual(['倍數 1.5'])
  })

  it('用不了的那一格退回預設值，同一筆其他格照樣採用留存的值', () => {
    const restored = restore(
      [rememberedOf(7, { 期數: 0, 倍數: 1.5 })],
      [strategyOf(7, '布林', [
        lookbackCount('期數', 20), new StrategyParameterDto('倍數', 'number', 2)])])

    expect(restored[0]?.parameters.map(one => [one.name, one.value]))
      .toEqual([['期數', 20], ['倍數', 1.5]])
  })
})
