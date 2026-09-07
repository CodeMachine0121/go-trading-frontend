import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * 一則即時更新在說什麼：那一根還在走、走完了、即時已經停了，
 * 還是這一檔根本沒有即時更新可給。有限的四種，所以是字面量聯合而不是自由字串。
 *
 * 最後兩種必須分開。「停了」的意思是等一下會自己好，「沒有」的意思是等到明天也一樣——
 * 說錯那一句，看的人會一直等一件不會發生的事。
 */
export type LiveKCandleStatus = 'forming' | 'closed' | 'stalled' | 'unavailable'

/**
 * Entity：一則即時更新在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 *
 * `stalled` 與 `unavailable` 都沒有 K 線可談，`kCandle` 為 null——
 * 那兩則要說的都只是「這裡不會有東西動」，差別在於會不會自己恢復。
 */
export class LiveKCandleUpdate {
  constructor(
    public readonly symbol: string,
    public readonly status: LiveKCandleStatus,
    public readonly kCandle: KCandle | null,
  ) {}
}
