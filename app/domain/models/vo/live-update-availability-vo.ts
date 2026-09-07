/**
 * VO：這一檔有沒有即時更新，連同該怎麼說它。不可變、無行為。
 *
 * 語氣與說法和值一起決定好，畫面只負責把它接到元件上——與漲跌語氣、
 * 與圖表上那一句話的做法一致。兩個畫面各寫一次三元運算的下場已經看得到了：
 * 一個寫「（無即時更新）」，一個寫「無即時更新」。
 */
export class LiveUpdateAvailabilityVo {
  constructor(
    public readonly label: string,
    public readonly tone: 'success' | 'neutral',
  ) {}
}

/** 有即時更新的說法。 */
export const LIVE_UPDATES_AVAILABLE = new LiveUpdateAvailabilityVo('即時更新中', 'success')
/** 沒有即時更新的說法。 */
export const LIVE_UPDATES_UNAVAILABLE = new LiveUpdateAvailabilityVo('無即時更新', 'neutral')
