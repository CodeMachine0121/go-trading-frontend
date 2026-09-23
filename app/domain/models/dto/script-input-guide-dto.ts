import type { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'

/**
 * DTO：「算式裡可以用什麼」那一段——算式收到的每一格長什麼樣。
 *
 * 它是一整份交出去的，因為進入點、標題、欄位與提醒描述的是同一件事：
 * 分開問的話，畫面就得自己知道「合約的進入點配合約的欄位」，而那正是它不該知道的。
 */
export class ScriptInputGuideDto {
  constructor(
    /** 進入點的長相，例如 `func Calculate(data []indicator.KCandle)`。 */
    public readonly entryPoint: string,
    /** 那一段的標題，例如「每一根 K 線有什麼」。 */
    public readonly heading: string,
    public readonly fields: readonly KCandleFieldDto[],
    /** 每一項該用什麼型別去算：現貨一律是 float64，合約另有不是 float64 的項目。 */
    public readonly valueTypeNote: string,
    /** 這一種行情特有、寫算式時最容易忽略的事。沒有就是空的。 */
    public readonly notes: readonly string[],
  ) {}
}
