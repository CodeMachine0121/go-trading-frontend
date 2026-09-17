import { describe, expect, it } from 'vitest'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'

const STRATEGY = new ChartApplicableStrategyScriptDto(7, '二十根均線', 'floatList', [], true, false)

function appliedWith(parameters: StrategyScriptParameterDto[], id = 1): AppliedIndicatorDto {
  return new AppliedIndicatorDto(id, STRATEGY, parameters)
}

describe('AppliedIndicatorDto：要不要先停下來調', () => {
  it('一個旋鈕都沒有時，挑了就該直接上圖', () => {
    // 多數策略腳本沒有旋鈕。為了少數有旋鈕的讓所有策略腳本都多一次確認，
    // 是拿多數人的每一次操作去補貼少數情況。
    expect(appliedWith([]).readyToApply).toBe(true)
  })

  it('有旋鈕時要先停下來', () => {
    expect(appliedWith([new StrategyScriptParameterDto('期數', 'lookbackCount', 20)]).readyToApply)
      .toBe(false)
  })
})

describe('AppliedIndicatorDto：清單上怎麼分辨同一支的好幾筆', () => {
  it('把這一次的值攤成一句話', () => {
    const applied = appliedWith([new StrategyScriptParameterDto('期數', 'lookbackCount', 60)])

    expect(applied.parameterSummary).toBe('期數 60')
  })

  it('好幾個旋鈕就都攤出來', () => {
    const applied = appliedWith([
      new StrategyScriptParameterDto('期數', 'lookbackCount', 20),
      new StrategyScriptParameterDto('倍數', 'number', 2),
    ])

    expect(applied.parameterSummary).toBe('期數 20、倍數 2')
  })

  it('沒有旋鈕的就沒有東西可標——它們靠名稱本身分辨', () => {
    expect(appliedWith([]).parameterSummary).toBe('')
  })
})

describe('AppliedIndicatorDto：改一格的值', () => {
  it('只換那一格，其餘原樣留著', () => {
    const applied = appliedWith([
      new StrategyScriptParameterDto('期數', 'lookbackCount', 20),
      new StrategyScriptParameterDto('倍數', 'number', 2),
    ])

    const changed = applied.withParameterValue('期數', 60)

    expect(changed.parameters.map(parameter => parameter.value)).toEqual([60, 2])
  })

  it('身分與策略腳本跟著留下——改值不會讓它變成另一筆', () => {
    // 身分若跟著值變，計算飛在半空中時回來的結果就認不得自己。
    const changed = appliedWith(
      [new StrategyScriptParameterDto('期數', 'lookbackCount', 20)], 3)
      .withParameterValue('期數', 60)

    expect(changed.id).toBe(3)
    expect(changed.strategyScript.id).toBe(7)
  })

  it('沒有這個名字時什麼都不變', () => {
    const applied = appliedWith([new StrategyScriptParameterDto('期數', 'lookbackCount', 20)])

    expect(applied.withParameterValue('週期', 60).parameters.map(one => one.value)).toEqual([20])
  })
})

describe('AppliedIndicatorDto：留存下來的形狀', () => {
  it('帶走的是哪一支策略腳本與那幾格調成什麼', () => {
    const applied = appliedWith([
      new StrategyScriptParameterDto('期數', 'lookbackCount', 60),
      new StrategyScriptParameterDto('倍數', 'number', 1.5),
    ])

    const remembered = applied.toRememberedVo()

    expect(remembered.strategyScriptId).toBe(7)
    expect(Object.fromEntries(remembered.parameterValues)).toEqual({ 期數: 60, 倍數: 1.5 })
  })

  it('種類不帶走——種類是宣告說的，留存它只會讓過期的種類贏過宣告', () => {
    const remembered = appliedWith([
      new StrategyScriptParameterDto('期數', 'lookbackCount', 60)]).toRememberedVo()

    expect(JSON.stringify(Object.fromEntries(remembered.parameterValues)))
      .not.toContain('lookbackCount')
  })

  it('序號不帶走——它只在這個畫面活著', () => {
    // 同一支策略腳本的兩筆留存下來只差在值，序號下次打開會重新給。
    const first = appliedWith([new StrategyScriptParameterDto('期數', 'lookbackCount', 20)], 1)
    const second = appliedWith([new StrategyScriptParameterDto('期數', 'lookbackCount', 20)], 2)

    expect(first.toRememberedVo()).toEqual(second.toRememberedVo())
  })

  it('一個旋鈕都沒有時帶走的是空的那幾格', () => {
    const remembered = appliedWith([]).toRememberedVo()

    expect(remembered.strategyScriptId).toBe(7)
    expect(Object.fromEntries(remembered.parameterValues)).toEqual({})
  })
})
