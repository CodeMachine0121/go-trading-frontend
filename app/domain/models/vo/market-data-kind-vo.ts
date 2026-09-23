/**
 * 一支策略腳本吃的是哪一種行情。與後端同名同值。
 *
 * - `kCandle`：現貨 K 線，也是舊版後端沒說時的那一種。
 * - `contractKCandle`：合約行情格——一根合約 K 線，旁邊對齊著資金費率與持倉統計。
 */
export type MarketDataKind = 'kCandle' | 'contractKCandle'

export const MARKET_DATA_KINDS: readonly MarketDataKind[] = ['kCandle', 'contractKCandle']
