import type { KCandleWriteField } from '~/domain/errors/k-candle-field-error'

/**
 * DTO：一份還沒送出的 K 線草稿，此刻違反的那一條規則落在哪一格、怎麼說。
 *
 * 規則照 K 線寫入的順序檢查，所以一次只說第一條——與按下儲存時被擋下的那一句是同一句。
 */
export class KCandleDraftIssueDto {
  constructor(
    public readonly field: KCandleWriteField,
    public readonly message: string,
  ) {}
}
