import {
  LIVE_UPDATE_NOTICES,
  type LiveUpdateNoticeValue,
  type LiveUpdateNoticeVo,
} from '~/domain/models/vo/live-update-notice-vo'

/**
 * Domain Model：圖表上該說哪一句話。
 *
 * 它收下三件事實——市場在不在交易時段內、這一檔有沒有即時名額、即時是不是斷了——
 * 交出**至多一句**。
 *
 * 為什麼這是一個 domain model 而不是模板裡的一串 `v-if`：它有優先序、有理由，
 * 而且會再長（第四種說法、第三個市場）。三個布林值寫成條件鏈，就是八種排列，
 * 每加一種說法都得回頭重讀所有排列才敢動；寫成一條有序清單，加一種是插一列。
 */
export class LiveUpdateNoticeDomain {
  constructor(
    private readonly isWithinTradingSession: boolean,
    private readonly hasLiveUpdates: boolean,
    private readonly isStalled: boolean,
  ) {}

  /**
   * 該說的那一句，沒什麼好說時是 null。
   *
   * 走的是那份由高優先到低的清單，取第一個成立的——所以「收盤時不再多說一次即時停止」
   * 不是一條額外的規則，而是清單順序的結果。
   */
  notice(): LiveUpdateNoticeVo | null {
    const holds: Record<LiveUpdateNoticeValue, boolean> = {
      marketClosed: !this.isWithinTradingSession,
      noLivePlace: !this.hasLiveUpdates,
      stalled: this.isStalled,
    }

    return LIVE_UPDATE_NOTICES.find(notice => holds[notice.value]) ?? null
  }
}
