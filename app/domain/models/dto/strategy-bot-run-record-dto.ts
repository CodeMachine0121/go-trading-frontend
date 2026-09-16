/**
 * DTO：一輪跑過的紀錄，已經算成畫面直接畫得出來的樣子。
 *
 * 結果交出的是**那個詞**而不是那個代號，與狀態標籤同一個理由：怎麼講是規則，
 * 不是元件該判斷的事。
 */
export class StrategyBotRunRecordDto {
  constructor(
    public readonly runNumber: number,
    public readonly ranAt: Date,
    /** 買入／賣出／持有。 */
    public readonly resultLabel: string,
    /** 那個結果該用什麼語氣。**它是規則不是樣式**。 */
    public readonly resultTone: 'success' | 'danger' | 'neutral',
  ) {}
}
