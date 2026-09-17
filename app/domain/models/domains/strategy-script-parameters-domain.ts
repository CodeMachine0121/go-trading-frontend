import { StrategyScriptParameterDto, type StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptParameterDomain } from '~/domain/models/domains/strategy-script-parameter-domain'

/**
 * 新增出來的那一列。
 *
 * **名稱刻意留白**：給一個「參數 1」之類的預設名字，人會直接按下去存，
 * 然後算式裡就出現一個叫「參數 1」的東西。空白會逼他當場想清楚這個旋鈕叫什麼——
 * 而那個名字正是算式要用來取用它的。
 *
 * 種類預設回看根數，因為那是這個功能存在的理由；20 是一個真的會被用到的期數。
 */
const BLANK_NAME = ''
const DEFAULT_KIND: StrategyScriptParameterKind = 'lookbackCount'
const DEFAULT_LOOKBACK_COUNT = 20

/**
 * Domain Model：一整份策略腳本參數，以及只有整份才答得出來的那些問題。
 *
 * 「名稱不得重複」與「這份會讓系統多拿幾根」都是**整份**的性質——
 * 單獨一個參數答不出來，而讓呼叫端自己蒐集再比對，就是把規則搬到了它不該在的地方。
 *
 * 它不可變：每一個改動都回傳新的一份。
 */
export class StrategyScriptParametersDomain {
  constructor(private readonly parameters: readonly StrategyScriptParameterDto[]) {}

  get all(): readonly StrategyScriptParameterDto[] {
    return this.parameters
  }

  /** 加一列空白的到最後面。 */
  addingNew(): StrategyScriptParametersDomain {
    return new StrategyScriptParametersDomain([
      ...this.parameters,
      new StrategyScriptParameterDto(BLANK_NAME, DEFAULT_KIND, DEFAULT_LOOKBACK_COUNT),
    ])
  }

  removingAt(index: number): StrategyScriptParametersDomain {
    return new StrategyScriptParametersDomain(
      this.parameters.filter((_, position) => position !== index))
  }

  replacingAt(index: number, parameter: StrategyScriptParameterDto): StrategyScriptParametersDomain {
    return new StrategyScriptParametersDomain(
      this.parameters.map((existing, position) => position === index ? parameter : existing))
  }

  /** 第幾列那一個，包好了它自己的規則。 */
  at(index: number): StrategyScriptParameterDomain | null {
    const parameter = this.parameters[index]

    return parameter === undefined ? null : new StrategyScriptParameterDomain(parameter)
  }

  /**
   * 這一份哪裡不對——沒有就是 `null`。
   *
   * 先問每一個自己的規則，再問只有整份才知道的那一條（名稱不得重複）。
   * 一次只回一則：使用者一次修一個地方，五則一起出現只會讓他不知道從哪開始。
   */
  /**
   * 跟另一份旋鈕比，是不是同一份。
   *
   * 順序算數：那是使用者在畫面上排出來的順序，換了位置就是改過了。
   */
  isSameAs(other: StrategyScriptParametersDomain): boolean {
    if (this.parameters.length !== other.parameters.length) {
      return false
    }

    return this.parameters.every((parameter, index) => {
      const counterpart = other.parameters[index]!
      return parameter.name === counterpart.name
        && parameter.kind === counterpart.kind
        && parameter.value === counterpart.value
    })
  }

  validationMessage(): string | null {
    for (const parameter of this.parameters) {
      const message = new StrategyScriptParameterDomain(parameter).validationMessage()
      if (message !== null) {
        return message
      }
    }

    return this.duplicateNameMessage()
  }

  private duplicateNameMessage(): string | null {
    const seenNames = new Set<string>()
    for (const parameter of this.parameters) {
      const name = parameter.name.trim()
      if (seenNames.has(name)) {
        return `參數名稱 ${name} 重複了，同一支策略腳本內不得重複`
      }
      seenNames.add(name)
    }

    return null
  }
}
