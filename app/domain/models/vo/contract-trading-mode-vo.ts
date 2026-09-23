/**
 * 合約帳戶上「買入、賣出」各是什麼意思。與後端同名同值。
 *
 * - `longShort`：多空反手——買入開多或反手，賣出開空或反手。
 * - `longOnly`：只做多——賣出只平掉多倉。
 * - `shortOnly`：只做空——買入只平掉空倉。
 *
 * **沒有現貨這一種**：現貨是拿現金換東西，那是現貨重演的事。
 */
export type ContractTradingMode = 'longShort' | 'longOnly' | 'shortOnly'

export const CONTRACT_TRADING_MODES: readonly ContractTradingMode[] = ['longShort', 'longOnly', 'shortOnly']
