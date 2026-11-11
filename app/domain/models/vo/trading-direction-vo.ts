/**
 * 合約機器人面對的一個交易方向。與交易服務同名同值。
 *
 * - `long`：做多。
 * - `short`：做空。
 *
 * 一台合約機器人可以兩個都選（多空反手）；**現貨機器人沒有交易方向**——現貨只能做多。
 */
export type TradingDirection = 'long' | 'short'

/** 畫面與送出時的固定順序：做多在前。 */
export const TRADING_DIRECTIONS: readonly TradingDirection[] = ['long', 'short']
