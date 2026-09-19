import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import type { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'

/**
 * 每個種類一段可直接執行的範例——`Calculate` 內部那幾行。開頭、簽章與收尾由
 * `exampleScript` 補上，進入點的長相因此只寫在這個檔案的一個地方。
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
 * 一份新算式最上面那幾行：package 宣告與三個匯入。
 *
 * **它是預填的內容，不是唯讀的外框。** 補上之後它與底下的每一行一樣是使用者的，
 * 改得動、刪得掉；改動這個常數也只影響**下一份新開的空白算式**，既有的策略腳本
 * 存著自己的開頭，一律不受影響。
 *
 * 三個匯入一律備妥，使用者直接用得到常見的數學與排序運算，不必自己張羅
 * （直譯器不介意沒用到的匯入；用不到的那一個刪掉也行）。
 */
const SCRIPT_PREAMBLE = [
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
 * 一份算式裡「這一行是進入點」的樣子。改指標值種類時，第一個符合的這一行，
 * 回傳型別會被重打。使用者把簽章拆成多行就認不出——那是刻意接受的取捨。
 */
const CALCULATE_SIGNATURE_PATTERN = /func Calculate\(data \[\]indicator\.KCandle\)[^{\n]*\{/

/**
 * Domain Model：一份新的指標算式該長什麼樣。
 *
 * **這是全前端唯一寫得出算式文字的地方**：開頭那幾行、每個種類的範例、開新空白策略腳本
 * 時預填的那一份，以及改種類時重打的簽章，都只寫在這裡。
 *
 * 它**不碰使用者已經寫下的算式**——不接合、不拆解、不修剪。畫面上那一份從第一行到
 * 最後一行都是使用者的，送出去與存下去的就是它本身。唯一的例外是改種類時重打進入點
 * 那一行，而那是使用者親手按下選單換來的。
 */
export class IndicatorScriptDomain {
  constructor(private readonly resultType: IndicatorResultTypeDomain) {}

  /**
   * 進入點那一行。回傳型別是算式裡唯一隨種類變的東西：信號回傳一個信號，
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

  /** 開新的空白策略腳本時預填的那一整份：開頭那幾行，加一個空的 `Calculate`。 */
  blankScript(): string {
    return `${SCRIPT_PREAMBLE}\n\n${this.calculateSignature()}\n${BODY_INDENT}\n}`
  }

  /**
   * 這個種類一整份可以直接執行的範例：開頭那幾行，加整個 `Calculate` 函式
   * （簽章頂格、內部縮一層）。
   *
   * 它與 `blankScript()` 是一對相互對照的東西——「什麼都還沒寫」與「寫好了長這樣」。
   */
  exampleScript(): string {
    const innerLines = EXAMPLE_CALCULATE_INNER_LINES[this.resultType.value]
      .map(line => (line === '' ? '' : `${BODY_INDENT}${line}`))

    return [SCRIPT_PREAMBLE, '', this.calculateSignature(), ...innerLines, '}'].join('\n')
  }

  /**
   * 改指標值種類時：把算式裡**第一個**符合進入點樣子的那一行，回傳型別換成新種類的。
   * 找不到符合的那一行時整份原樣回傳——使用者把進入點寫成別的樣子是他的自由。
   */
  retargetReturnType(script: string): string {
    if (!CALCULATE_SIGNATURE_PATTERN.test(script)) {
      return script
    }

    return script.replace(CALCULATE_SIGNATURE_PATTERN, this.calculateSignature())
  }
}
