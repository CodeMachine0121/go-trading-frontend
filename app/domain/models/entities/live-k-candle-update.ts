import type { KCandle } from '~/domain/models/entities/k-candle'

/**
 * 一則即時更新在說什麼：那一根還在走、走完了、還是即時已經停了。
 * 有限的三種，所以是字面量聯合而不是自由字串。
 */
export type LiveKCandleStatus = 'forming' | 'closed' | 'stalled'

/**
 * Entity：一則即時更新在 domain 內的本體形狀，只有欄位、沒有業務邏輯。
 *
 * `stalled` 時沒有 K 線可談，`kCandle` 為 null——那一則要說的只有「不再是活的」這件事。
 */
export class LiveKCandleUpdate {
  constructor(
    public readonly symbol: string,
    public readonly status: LiveKCandleStatus,
    public readonly kCandle: KCandle | null,
  ) {}
}
