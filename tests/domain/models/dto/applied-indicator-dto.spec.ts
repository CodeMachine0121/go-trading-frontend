import { describe, expect, it } from 'vitest'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

const STRATEGY = new StrategyDto(
  7, '二十根均線', new StrategyContentDto('sum := 0.0', 'floatList'), true, true)

function appliedWith(parameters: StrategyParameterDto[], id = 1): AppliedIndicatorDto {
  return new AppliedIndicatorDto(id, STRATEGY, parameters)
}

describe('AppliedIndicatorDto：要不要先停下來調', () => {
  it('一個旋鈕都沒有時，挑了就該直接上圖', () => {
    // 多數策略沒有旋鈕。為了少數有旋鈕的讓所有策略都多一次確認，
    // 是拿多數人的每一次操作去補貼少數情況。
    expect(appliedWith([]).readyToApply).toBe(true)
  })

  it('有旋鈕時要先停下來', () => {
    expect(appliedWith([new StrategyParameterDto('期數', 'lookbackCount', 20)]).readyToApply)
      .toBe(false)
  })
})

describe('AppliedIndicatorDto：清單上怎麼分辨同一支的好幾筆', () => {
  it('把這一次的值攤成一句話', () => {
    const applied = appliedWith([new StrategyParameterDto('期數', 'lookbackCount', 60)])

    expect(applied.parameterSummary).toBe('期數 60')
  })

  it('好幾個旋鈕就都攤出來', () => {
    const applied = appliedWith([
      new StrategyParameterDto('期數', 'lookbackCount', 20),
      new StrategyParameterDto('倍數', 'number', 2),
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
      new StrategyParameterDto('期數', 'lookbackCount', 20),
      new StrategyParameterDto('倍數', 'number', 2),
    ])

    const changed = applied.withParameterValue('期數', 60)

    expect(changed.parameters.map(parameter => parameter.value)).toEqual([60, 2])
  })

  it('身分與策略跟著留下——改值不會讓它變成另一筆', () => {
    // 身分若跟著值變，計算飛在半空中時回來的結果就認不得自己。
    const changed = appliedWith(
      [new StrategyParameterDto('期數', 'lookbackCount', 20)], 3)
      .withParameterValue('期數', 60)

    expect(changed.id).toBe(3)
    expect(changed.strategy.id).toBe(7)
  })

  it('沒有這個名字時什麼都不變', () => {
    const applied = appliedWith([new StrategyParameterDto('期數', 'lookbackCount', 20)])

    expect(applied.withParameterValue('週期', 60).parameters.map(one => one.value)).toEqual([20])
  })
})
