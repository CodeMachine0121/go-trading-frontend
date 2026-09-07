import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptTemplateDto } from '~/domain/models/dto/indicator-script-template-dto'
import { IndicatorScriptBodyVo } from '~/domain/models/vo/indicator-script-body-vo'

/**
 * 每個種類一段可直接執行的範例——`Calculate` 內部那幾行。簽章與收尾由 `exampleBody`
 * 從 `calculateSignature()` 補上，進入點的長相因此只寫在這個檔案的一個地方。
 */
const EXAMPLE_CALCULATE_INNER_LINES: Readonly<Record<IndicatorResultType, readonly string[]>> = {
  float: [
    'sum := 0.0',
    'for _, candle := range data {',
    '\tsum += candle.Close',
    '}',
    '',
    'return map[string]float64{"均價": sum / float64(len(data))}',
  ],
  floatList: [
    'closePrices := []float64{}',
    'for _, candle := range data {',
    '\tclosePrices = append(closePrices, candle.Close)',
    '}',
    '',
    'return map[string][]float64{"收盤價": closePrices}',
  ],
  bool: [
    'first := data[0].Close',
    'last := data[len(data)-1].Close',
    '',
    'return map[string]bool{"上漲": last > first}',
  ],
  boolList: [
    'answers := []bool{}',
    'for _, candle := range data {',
    '\tanswers = append(answers, candle.Close > candle.Open)',
    '}',
    '',
    'return map[string][]bool{"收紅": answers}',
  ],
  signal: [
    'first := data[0].Close',
    'last := data[len(data)-1].Close',
    '',
    'if last > first {',
    '\treturn indicator.Buy',
    '}',
    'return indicator.Hold',
  ],
}

/**
 * 唯讀外框：package 宣告與三個匯入。**就這七行**，不隨指標值種類變。
 * 進入點與收尾都住在可編輯的檔案主體裡。
 */
const FRAME_HEADER = [
  'package main',
  '',
  'import (',
  '\t"indicator"',
  '\t"math"',
  '\t"sort"',
  ')',
].join('\n')

/** 一行縮排——`Calculate` 內部的每一行。 */
const BODY_INDENT = '\t'

/**
 * 檔案主體裡「這一行是進入點」的樣子。改指標值種類時，第一個符合的這一行，
 * 回傳型別會被重打。使用者把簽章拆成多行就認不出——那是刻意接受的取捨。
 */
const CALCULATE_SIGNATURE_PATTERN = /func Calculate\(data \[\]indicator\.KCandle\)[^{\n]*\{/

/**
 * Domain Model：一段指標算式長什麼樣。
 *
 * **這是全前端唯一組出算式文字、也是唯一拆解它的地方。** 唯讀外框、每個種類的範例、
 * 空白 stub、改種類時重打的簽章、主體如何接上外框、以及一整段算式如何拆回主體，
 * 都只寫在這裡；進入點的字面只出現在 `calculateSignature()` 與拆解錨定的 `FRAME_HEADER`。
 */
export class IndicatorScriptDomain {
  constructor(private readonly resultType: IndicatorResultTypeDomain) {}

  /**
   * 唯讀外框——七行固定內容。三個匯入一律備妥，使用者在主體裡直接用得到常見的
   * 數學與排序運算，不必自己張羅（直譯器不介意沒用到的匯入）。
   */
  frameHeader(): string {
    return FRAME_HEADER
  }

  /**
   * 進入點那一行。回傳型別是外框唯一隨種類變的東西：信號回傳一個信號，
   * 其餘四種回傳一組「名稱對應值」，值的形狀跟著「是不是一串、裝的是不是數字」走。
   */
  private calculateSignature(): string {
    const elementShape = this.resultType.holdsNumbers() ? 'float64' : 'bool'
    const mapValueShape = this.resultType.isList() ? `[]${elementShape}` : elementShape
    const returnShape = this.resultType.isSignal()
      ? 'indicator.Signal'
      : `map[string]${mapValueShape}`

    return `func Calculate(data []indicator.KCandle) ${returnShape} {`
  }

  /** 新的空白策略的主體：一個空的 `Calculate`，回傳型別跟著目前的種類。 */
  blankBody(): string {
    return `${this.calculateSignature()}\n${BODY_INDENT}\n}`
  }

  /** 這個種類的範例主體：整個 `Calculate` 函式，簽章頂格、內部縮一層。 */
  exampleBody(): string {
    const innerLines = EXAMPLE_CALCULATE_INNER_LINES[this.resultType.value]
      .map(line => (line === '' ? '' : `${BODY_INDENT}${line}`))

    return [this.calculateSignature(), ...innerLines, '}'].join('\n')
  }

  /**
   * 改指標值種類時：把主體裡**第一個**符合進入點樣子的那一行，回傳型別換成新種類的。
   * 主體裡沒有符合的那一行時原樣回傳——使用者把進入點寫成別的樣子是他的自由。
   */
  retargetReturnType(scriptBody: string): string {
    if (!CALCULATE_SIGNATURE_PATTERN.test(scriptBody)) {
      return scriptBody
    }

    return scriptBody.replace(CALCULATE_SIGNATURE_PATTERN, this.calculateSignature())
  }

  toTemplateDto(): IndicatorScriptTemplateDto {
    return new IndicatorScriptTemplateDto(this.frameHeader(), this.exampleBody(), this.blankBody())
  }

  /**
   * 把使用者寫的主體接在唯讀外框後面，成為一段可以送出的算式。
   * 主體是頂層 Go，**不縮排、不加收尾**——那兩樣現在也是使用者寫的。
   * 中間留一個空行（Go 慣例，也讓行號對得上）。
   */
  assemble(scriptBody: string): string {
    return `${FRAME_HEADER}\n\n${scriptBody.replace(/\s+$/, '')}\n`
  }

  /**
   * `assemble` 的逆運算：從一整段算式取回使用者寫的主體。
   *
   * 錨定的是那七行固定的外框——它不隨種類變，也沒有理由漂移。以它開頭就認得，
   * 主體是其後去掉緊接的空行與尾端多的那一個換行。舊編輯器存的算式因為前七行相同，
   * 一樣認得，主體剛好是「整個 Calculate 函式」——不需要遷移。
   *
   * **認不出來時整段原樣交還**，並說明沒認出來：硬拆的代價太高，使用者可能過很久
   * 才發現程式碼被剪壞，而那時原稿已經沒了。
   */
  disassemble(script: string): IndicatorScriptBodyVo {
    if (!script.startsWith(`${FRAME_HEADER}\n`)) {
      return new IndicatorScriptBodyVo(script, false)
    }

    let body = script.slice(FRAME_HEADER.length).replace(/^\n+/, '')
    if (body.endsWith('\n')) {
      body = body.slice(0, -1)
    }

    return new IndicatorScriptBodyVo(body, true)
  }
}
