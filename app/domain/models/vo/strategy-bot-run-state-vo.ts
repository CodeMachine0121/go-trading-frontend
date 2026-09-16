/**
 * VO：一台機器人在不在跑。
 *
 * 畫面上這兩個值決定的不只是一個標籤：**播放與停止是同一個位置的兩種樣子**，
 * 因為一台機器人只有兩種狀態，同時看到兩顆互斥的鍵沒有任何一種讀法是對的。
 */
export const STRATEGY_BOT_RUN_STATES = ['running', 'stopped'] as const

export type StrategyBotRunStateVo = typeof STRATEGY_BOT_RUN_STATES[number]
