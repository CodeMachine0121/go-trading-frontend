import { describe, expect, it } from 'vitest'
import { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyFieldError } from '~/domain/errors/strategy-field-error'

function contentOf(scriptBody = 'sum := 0.0'): StrategyContentDto {
  return new StrategyContentDto(scriptBody, 'floatList')
}

describe('StrategyWriteDomain', () => {
  it('把使用者寫的內容包回外框，成為一整段能跑的算式', () => {
    const strategyWriteDomain = new StrategyWriteDomain(
      new StrategyWriteDto('二十根均線', contentOf('sum := 0.0')))

    expect(strategyWriteDomain.name).toBe('二十根均線')
    expect(strategyWriteDomain.script).toContain('package main')
    expect(strategyWriteDomain.script).toContain('func Calculate(data []indicator.KCandle) map[string][]float64 {')
    expect(strategyWriteDomain.script).toContain('\tsum := 0.0')
    expect(strategyWriteDomain.resultType).toBe('floatList')
  })

  it('名稱前後的空白不予保留', () => {
    const strategyWriteDomain = new StrategyWriteDomain(
      new StrategyWriteDto('　二十根均線　', contentOf()))

    expect(strategyWriteDomain.name).toBe('二十根均線')
  })

  it.each([
    { name: '完全沒填', declaredName: '' },
    { name: '只有空白字元', declaredName: '  　 ' },
  ])('名稱$name時不送出', ({ declaredName }) => {
    const buildStrategy = () => new StrategyWriteDomain(
      new StrategyWriteDto(declaredName, contentOf()))

    expect(buildStrategy).toThrow(StrategyFieldError)
    expect(buildStrategy).toThrow('請填寫策略名稱')
  })

  it('名稱標在哪一欄旁邊說得出來', () => {
    try {
      void new StrategyWriteDomain(new StrategyWriteDto('', contentOf()))
      expect.unreachable('名稱沒填必須被拒絕')
    }
    catch (error: unknown) {
      expect(error).toBeInstanceOf(StrategyFieldError)
      expect((error as StrategyFieldError).field).toBe('name')
    }
  })

  it('名稱長度不在畫面上檢查——那是後端的規則', () => {
    // 抄一份長度上限下來，等後端改了、這邊沒跟著改，就會擋掉其實存得下的名字。
    const veryLongName = '均'.repeat(200)

    const strategyWriteDomain = new StrategyWriteDomain(
      new StrategyWriteDto(veryLongName, contentOf()))

    expect(strategyWriteDomain.name).toBe(veryLongName)
  })

  it.each([
    { name: '帶識別碼代表要更新那一支', id: 7, expectedId: 7 },
    { name: '不帶識別碼代表要新增一支', id: undefined, expectedId: undefined },
  ])('$name', ({ id, expectedId }) => {
    const strategyWriteDomain = new StrategyWriteDomain(
      new StrategyWriteDto('二十根均線', contentOf(), id))

    expect(strategyWriteDomain.id).toBe(expectedId)
  })

  it('外框的產出形狀跟著指標值種類走', () => {
    const strategyWriteDomain = new StrategyWriteDomain(
      new StrategyWriteDto('是非題', new StrategyContentDto('return nil', 'bool')))

    expect(strategyWriteDomain.script).toContain('map[string]bool {')
  })
})
