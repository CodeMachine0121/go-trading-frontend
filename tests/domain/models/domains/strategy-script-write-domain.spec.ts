import { describe, expect, it } from 'vitest'
import { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'

const CALCULATE = [
  'func Calculate(data []indicator.KCandle) map[string][]float64 {',
  '\treturn nil',
  '}',
].join('\n')

function contentOf(scriptBody = CALCULATE): StrategyScriptContentDto {
  return new StrategyScriptContentDto(scriptBody, 'floatList')
}

describe('StrategyScriptWriteDomain', () => {
  it('把使用者寫的檔案主體接上固定外框，成為一整段能跑的算式', () => {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('二十根均線', contentOf()))

    expect(strategyScriptWriteDomain.name).toBe('二十根均線')
    expect(strategyScriptWriteDomain.script).toContain('package main')
    expect(strategyScriptWriteDomain.script).toContain(`)\n\n${CALCULATE}`)
    expect(strategyScriptWriteDomain.resultType).toBe('floatList')
  })

  it('名稱前後的空白不予保留', () => {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('　二十根均線　', contentOf()))

    expect(strategyScriptWriteDomain.name).toBe('二十根均線')
  })

  it.each([
    { name: '完全沒填', declaredName: '' },
    { name: '只有空白字元', declaredName: '  　 ' },
  ])('名稱$name時不送出', ({ declaredName }) => {
    const buildStrategyScript = () => new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto(declaredName, contentOf()))

    expect(buildStrategyScript).toThrow(StrategyScriptFieldError)
    expect(buildStrategyScript).toThrow('請填寫策略腳本名稱')
  })

  it('名稱標在哪一欄旁邊說得出來', () => {
    try {
      void new StrategyScriptWriteDomain(new StrategyScriptWriteDto('', contentOf()))
      expect.unreachable('名稱沒填必須被拒絕')
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(StrategyScriptFieldError)
      expect((error as StrategyScriptFieldError).field).toBe('name')
    }
  })

  it('名稱長度不在畫面上檢查——那是後端的規則', () => {
    // 抄一份長度上限下來，等後端改了、這邊沒跟著改，就會擋掉其實存得下的名字。
    const veryLongName = '均'.repeat(200)

    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto(veryLongName, contentOf()))

    expect(strategyScriptWriteDomain.name).toBe(veryLongName)
  })

  it.each([
    { name: '帶識別碼代表要更新那一支', id: 7, expectedId: 7 },
    { name: '不帶識別碼代表要新增一支', id: undefined, expectedId: undefined },
  ])('$name', ({ id, expectedId }) => {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('二十根均線', contentOf(), id))

    expect(strategyScriptWriteDomain.id).toBe(expectedId)
  })

  it('主體原樣接上外框——進入點的形狀是使用者自己寫在主體裡的', () => {
    const calculate = 'func Calculate(data []indicator.KCandle) map[string]bool {\n\treturn nil\n}'
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('是非題', new StrategyScriptContentDto(calculate, 'bool')))

    expect(strategyScriptWriteDomain.script).toContain(`)\n\n${calculate}`)
  })
})
