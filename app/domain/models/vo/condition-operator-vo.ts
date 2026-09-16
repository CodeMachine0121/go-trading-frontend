/**
 * VO：一個條件群組怎麼合併它裡面的那幾句。
 *
 * 兩個，而且會一直是兩個。第三個——「至少 N 句成立」——是另一個問題，
 * 它需要一個數字跟在旁邊；在有人開口之前先替那個數字留位置，
 * 會讓每一個群組都多帶一個沒人用的欄位。
 */
export const CONDITION_OPERATORS = ['and', 'or'] as const

export type ConditionOperatorVo = typeof CONDITION_OPERATORS[number]

/** 畫面上那個下拉選單要顯示的字。運算子管的是它裡面那幾句，所以說法要像連接詞。 */
export const CONDITION_OPERATOR_LABELS: Readonly<Record<ConditionOperatorVo, string>> = {
  and: '全部成立（且）',
  or: '任一成立（或）',
}
