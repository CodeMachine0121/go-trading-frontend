/**
 * 每次開倉押多少：三選一。
 * 有限的字面量聯合——它描述的是一組固定取值，不是一份資料的形狀。
 * 行為（旁邊那格要不要出現、給人看的名字、值合不合法）住在 PositionSizingDomain。
 */
export type PositionSizingMode = 'allIn' | 'percentage' | 'fixedAmount'

/** 呈現給使用者挑選時的固定順序：由粗到細，不必填數字的排第一。 */
export const POSITION_SIZING_MODES: readonly PositionSizingMode[] = [
  'allIn',
  'percentage',
  'fixedAmount',
]
