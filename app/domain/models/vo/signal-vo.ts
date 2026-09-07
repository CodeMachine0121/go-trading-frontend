/**
 * 信號的三個合法值——「一個信號」種類唯一能產出的東西。
 *
 * 有限的字面量聯合，是規範允許使用 `type` 的唯一情形：它描述一組固定取值，
 * 不是一份資料的形狀。中文結論與上色語氣（行為）住在 SignalDomain。
 * 沿用後端：`buy` / `sell` / `hold`。
 */
export type SignalVo = 'buy' | 'sell' | 'hold'

/** 判斷後端回報的字串認不認得時比對用。 */
export const SIGNAL_VALUES: readonly SignalVo[] = ['buy', 'sell', 'hold']
