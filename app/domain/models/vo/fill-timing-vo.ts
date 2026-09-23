/**
 * VO：一次重演裡信號在什麼價格成交。
 *
 * `close` 是說出信號的那一格的收盤價（預設，也是這個選項出現以前唯一的讀法）；
 * `nextOpen` 是下一格的開盤價。
 */
export type FillTiming = 'close' | 'nextOpen'

export const FILL_TIMINGS: readonly FillTiming[] = ['close', 'nextOpen']
