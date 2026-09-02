import type { IndicatorResultType } from '~/domain/models/vo/indicator-result-type'
import { INDICATOR_RESULT_TYPES } from '~/domain/models/vo/indicator-result-type'
import { IndicatorResultTypeOptionDto } from '~/domain/models/dto/indicator-result-type-option-dto'

/**
 * 每一種指標值種類的全部差異，就這三欄。多一種種類是在這張表加一列，
 * 不是在任何地方多一個 if。
 */
const INDICATOR_RESULT_TYPE_DESCRIPTIONS: Readonly<
  Record<IndicatorResultType, { label: string, isList: boolean, holdsNumbers: boolean }>
> = {
  float: { label: '一個數字', isList: false, holdsNumbers: true },
  floatList: { label: '一串數字', isList: true, holdsNumbers: true },
  bool: { label: '一個是非', isList: false, holdsNumbers: false },
  boolList: { label: '一串是非', isList: true, holdsNumbers: false },
}

/** 沒有宣告、或宣告了不認得的種類時的歸屬。與後端的預設一致。 */
const DEFAULT_INDICATOR_RESULT_TYPE: IndicatorResultType = 'float'

/**
 * Domain Model：一個指標值種類，以及其他人需要知道的關於它的一切。
 *
 * 解讀刻意寬容：使用者從清單挑，挑不出非法值；真正會給出陌生字串的是後端，
 * 而讓整個結果畫面因為一個沒見過的種類而壞掉，遠比當成「一個數字」呈現更糟。
 */
export class IndicatorResultTypeDomain {
  readonly value: IndicatorResultType

  constructor(declared: string) {
    const normalizedDeclaration = declared.trim()
    const recognized = INDICATOR_RESULT_TYPES.find(
      candidate => candidate.toLowerCase() === normalizedDeclaration.toLowerCase())

    this.value = recognized ?? DEFAULT_INDICATOR_RESULT_TYPE
  }

  /** 這個種類的值是一串，而不是單獨一個。 */
  isList(): boolean {
    return INDICATOR_RESULT_TYPE_DESCRIPTIONS[this.value].isList
  }

  /** 這個種類裝的是數字，而不是是非。 */
  holdsNumbers(): boolean {
    return INDICATOR_RESULT_TYPE_DESCRIPTIONS[this.value].holdsNumbers
  }

  /** 給使用者看的名字。畫面不自己翻譯種類。 */
  label(): string {
    return INDICATOR_RESULT_TYPE_DESCRIPTIONS[this.value].label
  }

  toOptionDto(): IndicatorResultTypeOptionDto {
    return new IndicatorResultTypeOptionDto(this.value, this.label())
  }
}
