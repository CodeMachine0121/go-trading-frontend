/**
 * 一次回測照哪一套規矩操作：三選一。
 * 有限的字面量聯合——它描述的是一組固定取值，不是一份資料的形狀。
 * 行為（給人看的名字、那一句話說它做什麼、借不借得到錢）住在 TradingModeDomain。
 *
 * 三個而不是四個，是因為它答的兩個問題（做不做得了空、借不借得到錢）只有三種
 * 組合成立：做得了空卻借不到錢不存在，放空本來就要先借到東西才賣得出去。
 */
export type TradingMode = 'longShort' | 'spot' | 'leveragedLong'

/**
 * 呈現給使用者挑選時的固定順序：既有的那一種排第一，因為它是預設；
 * 新的接在最後，所以既有兩個在畫面上一格都沒有移位。
 */
export const TRADING_MODES: readonly TradingMode[] = ['longShort', 'spot', 'leveragedLong']

/**
 * 沒有挑過時就是這一個。
 *
 * 是既有行為而不是「比較常見的那一個」：預設值的職責是讓舊的東西繼續成立。
 * 現貨雖然更貼近多數人的帳戶，但讓某個人的成績單在他沒動手的情況下變樣，
 * 比讓他自己挑一次難交代得多。
 */
export const DEFAULT_TRADING_MODE: TradingMode = 'longShort'
