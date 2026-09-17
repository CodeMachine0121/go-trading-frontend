/**
 * VO：一份交易策略的兩邊判斷之一——什麼算買入，什麼算賣出。
 *
 * 兩個，而且會一直是兩個：一份規則說得出的話就是「該買了」與「該賣了」，
 * 其餘的（加碼、減碼、停損）是機器人怎麼執行的問題，不是規則本身在說的事。
 */
export const CONDITION_SIDES = ['buy', 'sell'] as const

export type ConditionSideVo = typeof CONDITION_SIDES[number]
