import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import { IndicatorScriptBodyVo } from '~/domain/models/vo/indicator-script-body-vo'

/**
 * 每個種類一段可直接執行的範例內容——只有內容，沒有外框，因為使用者要寫的就只有內容。
 * 一併示範了那個種類該怎麼把值放進結果。
 */
const EXAMPLE_SCRIPT_BODIES: Readonly<Record<IndicatorResultType, string>> = {
  float: [
    'sum := 0.0',
    'for _, candle := range data {',
    '\tsum += candle.Close',
    '}',
    '',
    'return map[string]float64{"均價": sum / float64(len(data))}',
  ].join('\n'),
  floatList: [
    'closePrices := []float64{}',
    'for _, candle := range data {',
    '\tclosePrices = append(closePrices, candle.Close)',
    '}',
    '',
    'return map[string][]float64{"收盤價": closePrices}',
  ].join('\n'),
  bool: [
    'first := data[0].Close',
    'last := data[len(data)-1].Close',
    '',
    'return map[string]bool{"上漲": last > first}',
  ].join('\n'),
  boolList: [
    'answers := []bool{}',
    'for _, candle := range data {',
    '\tanswers = append(answers, candle.Close > candle.Open)',
    '}',
    '',
    'return map[string][]bool{"收紅": answers}',
  ].join('\n'),
}

/** 算式內容在外框裡的縮排——它整段住在進入點內。 */
const BODY_INDENT = '\t'

/** 外框上那個進入點的名字。拆解時以它為錨，不逐字比對整個外框。 */
const ENTRY_POINT_ANCHOR = 'func Calculate'

/**
 * Domain Model：一段指標算式長什麼樣。
 *
 * **這是全前端唯一產生算式文字的地方，也是唯一拆解它的地方。** 外框的頭、外框的尾、
 * 每個種類的範例內容、內容如何變成一整段算式、以及一整段算式如何拆回內容，
 * 都只寫在這裡；後端哪天改了進入點的形式，要改的就只有這個檔案，
 * 也不可能有第二個地方組出、或認出不一樣的外框。
 */
export class IndicatorScriptDomain {
  constructor(private readonly resultType: IndicatorResultTypeDomain) {}

  /**
   * 外框的開頭。三個匯入一律備妥，使用者在內容裡直接用得到常見的數學與排序運算，
   * 不必自己張羅——執行算式的直譯器不介意沒用到的匯入。
   */
  frameHeader(): string {
    const elementShape = this.resultType.holdsNumbers() ? 'float64' : 'bool'
    const valueShape = this.resultType.isList() ? `[]${elementShape}` : elementShape

    return [
      'package main',
      '',
      'import (',
      '\t"indicator"',
      '\t"math"',
      '\t"sort"',
      ')',
      '',
      `func Calculate(data []indicator.KCandle) map[string]${valueShape} {`,
    ].join('\n')
  }

  frameFooter(): string {
    return '}'
  }

  exampleBody(): string {
    return EXAMPLE_SCRIPT_BODIES[this.resultType.value]
  }

  toTemplateDto(): IndicatorScriptTemplateDto {
    return new IndicatorScriptTemplateDto(this.frameHeader(), this.frameFooter(), this.exampleBody())
  }

  /**
   * 把使用者寫的內容放進外框，成為一段可以送出的算式。
   * 內容整段縮排一層但**不動它的行數**——後端回報第幾行出錯時，
   * 使用者對著畫面上的外框數得出來是哪一行。
   */
  assemble(scriptBody: string): string {
    const indentedBody = scriptBody
      .split('\n')
      .map(line => (line.trim() === '' ? '' : `${BODY_INDENT}${line}`))
      .join('\n')

    return `${this.frameHeader()}\n${indentedBody}\n${this.frameFooter()}\n`
  }

  /**
   * `assemble` 的逆運算：從一整段算式取回使用者當初寫的內容。
   *
   * 它**錨定結構而不比對外框的文字**——從進入點那一行的下一行起，到最後一個收尾行為止，
   * 整段退一層縮排。逐字比對外框的話，日後外框只要多一個匯入，
   * 所有既有的算式就會一起認不出來。
   *
   * **認不出來時整段原樣交還**，並說明沒認出來。硬拆的代價太高：
   * 使用者可能過很久才發現程式碼被剪壞，而那時原稿已經沒了。
   */
  disassemble(script: string): IndicatorScriptBodyVo {
    const lines = script.split('\n')
    const entryPointIndex = lines.findIndex(line => line.trimStart().startsWith(ENTRY_POINT_ANCHOR))
    const footerIndex = lines.findLastIndex(line => line.trim() === this.frameFooter())

    if (entryPointIndex === -1 || footerIndex <= entryPointIndex) {
      return new IndicatorScriptBodyVo(script, false)
    }

    const body = lines
      .slice(entryPointIndex + 1, footerIndex)
      .map(line => (line.startsWith(BODY_INDENT) ? line.slice(BODY_INDENT.length) : line))
      .join('\n')

    return new IndicatorScriptBodyVo(body, true)
  }
}
