/**
 * VO：後端對一台機器人設下的那幾個上限，在這一側的副本。
 *
 * 它們**確實是第二份副本**，而副本會走樣。之所以還是留一份，是因為畫面能用它們做到
 * 後端做不到的事：讓第 11 個來源的新增鍵**消失**，而不是讓使用者填完才被拒。
 *
 * 代價是兩邊不同步時，畫面可能擋掉後端其實接受的東西。真正的防線在後端，
 * 這裡只是一道讓人少走一趟的門——所以它們集中在這一個檔案，不散落在各個元件的 v-if 裡。
 */
export const STRATEGY_BOT_LIMITS = {
  /** 一台機器人最多幾個信號來源。 */
  signalSourceCount: 10,
  /** 一棵條件樹最多幾層巢狀，最外層算第一層。 */
  conditionDepth: 5,
  /** 一棵條件樹最多幾個節點。 */
  conditionNodeCount: 32,
  /** 一個條件群組至少要幾句。 */
  conditionGroupMinimumSize: 2,
  /** 觸發間隔的下限：最細的 K 線就是一分鐘，更密只會拿到同一根。 */
  triggerIntervalMinimumMinutes: 1,
  /** 觸發間隔的上限：一天。 */
  triggerIntervalMaximumMinutes: 1440,
  /** 機器人名稱的字數上限。 */
  nameMaximumLength: 128,
} as const
