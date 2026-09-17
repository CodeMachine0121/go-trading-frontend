/**
 * VO：系統自己把一台機器人停下來的原因。
 *
 * 四種，而且四種要做的事完全不同：換掉一個信號來源、修那支算式、重填金鑰、重填聊天室代號。
 * 合成同一句話，就沒有人知道該去改哪一格。
 *
 * **這份清單是使用者唯一會發現機器人出事的地方**——四種裡有兩種正好是
 * 「通知他的那條路壞了」，所以沒有任何一條主動通知的路走得通。
 */
export const STRATEGY_BOT_HALT_REASONS = [
  'strategyScriptUnavailable',
  'scriptFailed',
  'credentialRejected',
  'destinationNotFound',
] as const

export type StrategyBotHaltReasonVo = typeof STRATEGY_BOT_HALT_REASONS[number]

/** 畫面上要說的那一句。說的是「發生了什麼」，因為要做什麼由使用者自己決定。 */
export const STRATEGY_BOT_HALT_REASON_LABELS: Readonly<Record<StrategyBotHaltReasonVo, string>> = {
  strategyScriptUnavailable: '有一支策略腳本找不到了',
  scriptFailed: '有一支策略腳本算不出來',
  credentialRejected: '機器人金鑰不被接受',
  destinationNotFound: '找不到這個聊天室',
}
