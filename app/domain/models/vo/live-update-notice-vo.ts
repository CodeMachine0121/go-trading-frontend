/** 圖表上那一句話的身分。至多一種，所以是封閉的值域而不是自由字串。 */
export type LiveUpdateNoticeValue = 'marketClosed' | 'noLivePlace' | 'stalled'

/**
 * VO：圖表上那一句話。不可變、無行為。
 *
 * 語氣與身分一起決定好，畫面只負責把 tone 接到元件的 variant——
 * 與漲跌語氣的做法一致（見 KCandleTrendVo）。
 */
export class LiveUpdateNoticeVo {
  constructor(
    public readonly value: LiveUpdateNoticeValue,
    public readonly tone: 'info' | 'warning',
  ) {}
}

/**
 * 三種說法，**由高優先到低**。順序就是規則：一次只說一句，從頭走過這條清單、
 * 取第一個成立的。
 *
 * 為什麼收盤排在最前面：收盤時即時本來就會停，兩句都說出來會讓人以為出了兩件事。
 * 為什麼沒有名額與斷了必須分開：一句的意思是「等到明天也一樣」，
 * 一句的意思是「等一下會自己好」——給錯那一句，使用者會一直等一件不會發生的事。
 *
 * 多一種說法就是在這裡插一列，而不是在別人的分支之間找位置。
 */
export const LIVE_UPDATE_NOTICES: LiveUpdateNoticeVo[] = [
  new LiveUpdateNoticeVo('marketClosed', 'info'),
  new LiveUpdateNoticeVo('noLivePlace', 'info'),
  new LiveUpdateNoticeVo('stalled', 'warning'),
]
