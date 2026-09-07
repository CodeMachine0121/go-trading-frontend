import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * 一則即時更新在說什麼：那一根還在走、走完了、即時已經停了、這一檔根本沒有即時更新可給，
 * 還是這個市場現在休市。有限的五種，所以是字面量聯合而不是自由字串。
 *
 * 後三種必須分開，因為它們要人做的事完全相反：「停了」要人等一下，
 * 「沒有」要人去改觀察清單，「休市」要人什麼都別做。
 * 說錯那一句，看的人不是白等一件不會發生的事，就是去找一個根本不存在的故障。
 */
export type LiveKCandleStatus
  = 'forming' | 'closed' | 'stalled' | 'unavailable' | 'marketClosed'

/**
 * Entity：一則即時更新在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 *
 * `stalled`、`unavailable` 與 `marketClosed` 都沒有 K 線可談，`kCandle` 為 null——
 * 三則要說的都只是「這裡不會有東西動」，差別在於它會不會自己好、以及要等誰。
 */
export class LiveKCandleUpdate {
  constructor(
    public readonly symbol: string,
    public readonly status: LiveKCandleStatus,
    public readonly kCandle: KCandle | null,
  ) {}
}
