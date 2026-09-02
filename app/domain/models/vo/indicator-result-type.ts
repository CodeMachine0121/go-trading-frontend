/**
 * 指標值種類：一次計算宣告「這次算式產出的值長什麼樣子」。
 * 有限的字面量聯合，是規範允許使用 `type` 的唯一情形——它描述的是一組固定取值，
 * 不是一份資料的形狀。行為（是不是一串、中文標籤…）住在 IndicatorResultTypeDomain。
 */
export type IndicatorResultType = 'float' | 'floatList' | 'bool' | 'boolList'

/** 呈現給使用者挑選時的固定順序：由簡到繁，數字在前、是非在後。 */
export const INDICATOR_RESULT_TYPES: readonly IndicatorResultType[] = [
  'float',
  'floatList',
  'bool',
  'boolList',
]
