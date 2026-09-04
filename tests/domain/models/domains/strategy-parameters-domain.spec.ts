import { describe, expect, it } from 'vitest'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { StrategyParameterDomain } from '~/domain/models/domains/strategy-parameter-domain'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

function lookbackCount(name: string, value: number) {
  return new StrategyParameterDto(name, 'lookbackCount', value)
}

function numberParameter(name: string, value: number) {
  return new StrategyParameterDto(name, 'number', value)
}

describe('新增出來的那一列', () => {
  it('名稱是空的、種類是回看根數、值是 20', () => {
    // 名稱刻意留白：給一個「參數 1」之類的預設名字，人會直接按下去存，
    // 然後算式裡就出現一個叫「參數 1」的東西。
    const parameters = new StrategyParametersDomain([]).addingNew()

    expect(parameters.all).toHaveLength(1)
    expect(parameters.all[0]?.name).toBe('')
    expect(parameters.all[0]?.kind).toBe('lookbackCount')
    expect(parameters.all[0]?.value).toBe(20)
  })

  it('加在最後面，不動既有的那幾列', () => {
    const parameters = new StrategyParametersDomain([lookbackCount('期數', 50)]).addingNew()

    expect(parameters.all.map(parameter => parameter.name)).toEqual(['期數', ''])
  })
})

describe('增刪改都回傳新的一份', () => {
  it('刪掉指定的那一列', () => {
    const parameters = new StrategyParametersDomain(
      [lookbackCount('快線', 20), lookbackCount('慢線', 100)]).removingAt(0)

    expect(parameters.all.map(parameter => parameter.name)).toEqual(['慢線'])
  })

  it('換掉指定的那一列，其餘不動', () => {
    const parameters = new StrategyParametersDomain(
      [lookbackCount('快線', 20), lookbackCount('慢線', 100)])
      .replacingAt(1, lookbackCount('慢線', 200))

    expect(parameters.all[0]?.value).toBe(20)
    expect(parameters.all[1]?.value).toBe(200)
  })

  it('原本那一份一個字都沒被改到', () => {
    const original = new StrategyParametersDomain([lookbackCount('期數', 20)])

    original.addingNew().removingAt(0)

    expect(original.all).toHaveLength(1)
  })
})

describe('這一份哪裡不對', () => {
  it.each([
    { name: '空白的名稱', parameters: [lookbackCount('   ', 20)], expected: '參數名稱不得為空白' },
    { name: '重複的名稱', parameters: [lookbackCount('期數', 20), numberParameter('期數', 2)], expected: '參數名稱 期數 重複了，同一支策略內不得重複' },
    { name: '回看根數是零', parameters: [lookbackCount('期數', 0)], expected: '回看根數必須是大於零的整數' },
    { name: '回看根數是小數', parameters: [lookbackCount('期數', 20.5)], expected: '回看根數必須是大於零的整數' },
  ])('$name', ({ parameters, expected }) => {
    expect(new StrategyParametersDomain(parameters).validationMessage()).toBe(expected)
  })

  it.each([
    { name: '一個都沒有', parameters: [] },
    { name: '正常的一份', parameters: [lookbackCount('期數', 20), numberParameter('倍數', 2)] },
    { name: '數值是負的小數——系統本來就不解讀它', parameters: [numberParameter('偏移', -1.5)] },
  ])('$name 時沒有話說', ({ parameters }) => {
    expect(new StrategyParametersDomain(parameters).validationMessage()).toBeNull()
  })

  it('一次只說一則，讓人一次修一個地方', () => {
    const parameters = new StrategyParametersDomain([lookbackCount('  ', 0), lookbackCount('  ', 0)])

    expect(parameters.validationMessage()).toBe('參數名稱不得為空白')
  })
})

describe('每一列在畫面上該長什麼樣子', () => {
  it.each([
    { kind: 'lookbackCount' as const, inputMode: 'numeric', step: 1 },
    { kind: 'number' as const, inputMode: 'decimal', step: 0.1 },
  ])('$kind 給的是 $inputMode', ({ kind, inputMode, step }) => {
    // 「回看根數要整數鍵盤」是業務規則，不是版面問題——畫面問這個，不自己判斷。
    const parameter = new StrategyParameterDomain(new StrategyParameterDto('期數', kind, 20))

    expect(parameter.inputMode()).toBe(inputMode)
    expect(parameter.step()).toBe(step)
  })

  it('只有回看根數那一種會讓系統多拿 K 線', () => {
    expect(new StrategyParameterDomain(lookbackCount('期數', 20)).lookbackCount()).toBe(20)
    expect(new StrategyParameterDomain(numberParameter('倍數', 999)).lookbackCount()).toBe(0)
  })
})

describe('是非：仍然是一個數字，只是換一種讀法', () => {
  function booleanParameter(name: string, value: number) {
    return new StrategyParameterDto(name, 'boolean', value)
  }

  it('用挑的，不是用打的', () => {
    // 一個「填 0 或 1」的數字框等於要使用者記住一個系統內部的約定。
    expect(new StrategyParameterDomain(booleanParameter('只看多方', 1)).control())
      .toBe('options')
  })

  it('挑得到的是算式裡真正會寫的那兩個字', () => {
    // 這一格填的是要餵給 Go bool 的東西，而寫算式的人在編輯區裡打的就是 true / false。
    // 挑得到哪幾個、每一個叫什麼，是領域的答案——畫面把它接上選單就好。
    expect(new StrategyParameterDomain(booleanParameter('只看多方', 1)).valueOptions()
      .map(option => [option.label, option.value]))
      .toEqual([['True', 1], ['False', 0]])
  })

  it.each([
    { kind: 'lookbackCount' as const },
    { kind: 'number' as const },
  ])('$kind 用打的，沒有東西可挑', ({ kind }) => {
    const parameter = new StrategyParameterDomain(new StrategyParameterDto('期數', kind, 20))

    expect(parameter.control()).toBe('number')
    expect(parameter.valueOptions()).toEqual([])
  })

  it.each([
    { name: '零', value: 0 },
    { name: '負數', value: -1 },
    { name: '小數', value: 0.5 },
  ])('$name 對是非都合法——它沒有大於零這回事', ({ value }) => {
    // 「大於零的整數」是回看根數的規則。套到是非上，零就再也選不了「否」。
    expect(new StrategyParametersDomain([booleanParameter('只看多方', value)])
      .validationMessage()).toBeNull()
  })

  it('它不是回看根數，所以不影響要拿幾根', () => {
    expect(new StrategyParameterDomain(booleanParameter('只看多方', 1)).lookbackCount()).toBe(0)
  })
})
