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
    /** 買入／賣出／持有／衝突。 */
    public readonly resultLabel: string,
    /** 那個結果該用什麼語氣。**它是規則不是樣式**。 */
    public readonly resultTone: 'success' | 'danger' | 'neutral' | 'warning',
    /**
     * 這一輪要不要主人去處理。
     *
     * 只有衝突是真的：那台機器人還在跑、也還健康，但它的兩個條件同時成立，
     * 所以在有人去改掉其中一個之前，它**一句話都不會說**。
     * 持有是在等市場，衝突是在等人——一排紀錄裡只有這一種需要被找出來。
     */
    public readonly needsAttention: boolean,
    /**
     * 那一輪建議的開倉金額、止損價與止盈價，**已經算成畫面直接畫得出來的字**。
     *
     * 三個各自可以是 `null`，而 `null` 就是那一格不畫。
     * 沒有建議的那幾輪是常態——一排寫著「—」的欄位會讓那張表讀起來像壞掉的。
     */
    public readonly suggestedStakeText: string | null,
    public readonly suggestedStopLossText: string | null,
    public readonly suggestedTakeProfitText: string | null,
  ) {}
}
