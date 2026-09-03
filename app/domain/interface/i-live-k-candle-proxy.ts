import type { LiveKCandleUpdate } from '~/domain/models/entities/live-k-candle-update'

/**
 * 「持續跟著一個交易標的」這個能力的契約。以能力命名，不綁供應商。
 *
 * 回傳的是**怎麼停**。不另外定義一個訂閱物件——停止是唯一需要的操作，
 * 一個函式就是完整的契約，呼叫端也不可能拿著它卻不知道怎麼收尾。
 */
export interface ILiveKCandleProxy {
  followKCandles(symbol: string, onUpdate: (update: LiveKCandleUpdate) => void): () => void
}
