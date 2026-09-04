import { StrategyParameterDto, type StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * Domain Model：一個策略參數，以及畫面要問它的每一個問題。
 *
 * 畫面不判斷種類——`if (kind === 'lookbackCount')` 是業務判斷，寫進 template 就是
 * 把規則搬到了它不該在的地方。它問這個物件，這個物件回答。
 */
export class StrategyParameterDomain {
  constructor(private readonly parameter: StrategyParameterDto) {}

  /**
   * 這一格要用哪一種控制項。
   *
   * 是非用勾的，不是打字的——一個「填 0 或 1」的數字框等於要使用者記住一個約定，
   * 而那個約定是系統內部的事，不該漏到畫面上。
   */
  control(): 'number' | 'toggle' {
    return this.parameter.kind === 'boolean' ? 'toggle' : 'number'
  }

  /** 回看根數要整數鍵盤，數值要能打小數點。 */
  inputMode(): 'numeric' | 'decimal' {
    return this.parameter.kind === 'lookbackCount' ? 'numeric' : 'decimal'
  }

  /** 上下箭頭一次跳多少。回看根數跳整數，數值不限。 */
  step(): number {
    return this.parameter.kind === 'lookbackCount' ? 1 : 0.1
  }

  /**
   * 這個參數哪裡不對——沒有就是 `null`。
   *
   * 「它是整數」只由種類保證、不由型別保證，所以這裡**真的檢查**而不是假設：
   * 一個 20.5 的回看根數在型別上完全合法，拿去數 K 線卻不是一件東西。
   */
  validationMessage(): string | null {
    if (this.parameter.name.trim() === '') {
      return '參數名稱不得為空白'
    }

    if (this.parameter.kind !== 'lookbackCount') {
      return null
    }

    if (this.parameter.value < 1 || !Number.isInteger(this.parameter.value)) {
      return '回看根數必須是大於零的整數'
    }

    return null
  }

  /** 這個參數會讓系統多拿幾根。其餘種類不影響，所以是零。 */
  lookbackCount(): number {
    return this.parameter.kind === 'lookbackCount' ? this.parameter.value : 0
  }

  /** 這個是非現在是不是「是」。零是否，非零是是。 */
  isTrue(): boolean {
    return this.parameter.value !== 0
  }

  /** 改掉其中一樣，其餘照舊——參數是不可變的，換一個值就是換一個。 */
  renamedTo(name: string): StrategyParameterDto {
    return new StrategyParameterDto(name, this.parameter.kind, this.parameter.value)
  }

  withKind(kind: StrategyParameterKind): StrategyParameterDto {
    return new StrategyParameterDto(this.parameter.name, kind, this.parameter.value)
  }

  withValue(value: number): StrategyParameterDto {
    return new StrategyParameterDto(this.parameter.name, this.parameter.kind, value)
  }
}
