import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * 一則即時更新在說什麼：那一根還在走、走完了、即時已經停了、這一檔根本沒有即時更新可給、
 * 這個市場現在休市，還是**這條通道已經結束、不會自己接回來**。有限的六種，所以是字面量聯合而不是自由字串。
 *
 * 「停了」與「結束了」必須分開：前者是連線掉了、瀏覽器自己會重新接上；後者是通道一開始就被拒絕
 * （例如不在追蹤名單上），瀏覽器就此放棄，說「正在重新連上」等於承諾一件不會發生的事。
 *
 * 後三種必須分開，因為它們要人做的事完全相反：「停了」要人等一下，
 * 「沒有」要人**別再等**（名額是後端決定的，等到明天也一樣），「休市」要人什麼都別做。
 * 說錯那一句，看的人不是白等一件不會發生的事，就是去找一個根本不存在的故障。
 */
export type LiveKCandleStatus
  = 'forming' | 'closed' | 'stalled' | 'unavailable' | 'marketClosed' | 'ended'

/**
 * Entity：一則即時更新在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 *
 * `stalled`、`unavailable`、`marketClosed` 與 `ended` 都沒有 K 線可談，`kCandle` 為 null——
 * 三則要說的都只是「這裡不會有東西動」，差別在於它會不會自己好、以及要等誰。
 */
export class LiveKCandleUpdate {
  constructor(
    public readonly symbol: string,
    public readonly status: LiveKCandleStatus,
    public readonly kCandle: KCandle | null,
  ) {}
}
