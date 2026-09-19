import { describe, expect, it } from 'vitest'
import { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'

const WHOLE_SCRIPT = [
  'package main',
  '',
  'import "indicator"',
  '',
  'func Calculate(data []indicator.KCandle) map[string][]float64 {',
  '\treturn nil',
  '}',
].join('\n')

function contentOf(script = WHOLE_SCRIPT): StrategyScriptContentDto {
  return new StrategyScriptContentDto(script, 'floatList')
}

describe('StrategyScriptWriteDomain', () => {
  it('存下去的就是畫面上那一份，一字不改', () => {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('二十根均線', contentOf()))

    expect(strategyScriptWriteDomain.name).toBe('二十根均線')
    expect(strategyScriptWriteDomain.script).toBe(WHOLE_SCRIPT)
    expect(strategyScriptWriteDomain.resultType).toBe('floatList')
  })

  it.each([
    { name: '前後有空白行', script: `\n\n${WHOLE_SCRIPT}\n\n` },
    { name: '開頭被使用者刪掉了', script: 'func Calculate() {}' },
    { name: '完全不是一段程式碼', script: '這根本不是一段程式碼' },
  ])('載入後原封不動再存一次，內容逐字相同：$name', ({ script }) => {
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('原封不動', new StrategyScriptContentDto(script, 'floatList')))

    expect(strategyScriptWriteDomain.script).toBe(script)
  })

  it.each([
    { name: '完全沒填', script: '' },
    { name: '只有空白字元', script: '  \n\t ' },
  ])('算式$name時不送出——與送出計算同一條規則、同一句話', ({ script }) => {
    const buildStrategyScript = () => new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('二十根均線', new StrategyScriptContentDto(script, 'floatList')))

    expect(buildStrategyScript).toThrow(StrategyScriptFieldError)
    expect(buildStrategyScript).toThrow('請填寫算式內容')
  })

  it('算式空白的拒絕指著算式，不是指著名稱', () => {
    try {
      void new StrategyScriptWriteDomain(
        new StrategyScriptWriteDto('二十根均線', new StrategyScriptContentDto('', 'floatList')))
      expect.unreachable('算式空白必須被拒絕')
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(StrategyScriptFieldError)
      expect((error as StrategyScriptFieldError).field).toBe('script')
    }
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

  it('進入點的形狀是使用者自己寫的，指標值種類不會回頭改它', () => {
    const script = 'package main\n\nfunc Calculate(data []indicator.KCandle) map[string]bool {\n\treturn nil\n}'
    const strategyScriptWriteDomain = new StrategyScriptWriteDomain(
      new StrategyScriptWriteDto('是非題', new StrategyScriptContentDto(script, 'bool')))

    expect(strategyScriptWriteDomain.script).toBe(script)
  })
})
