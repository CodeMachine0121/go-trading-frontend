/**
 * DTO：沙箱裡那個 K 線型別的其中一個欄位——算式寫得出 `candle.{name}` 的那些。
 *
 * 它描述的是**算式看得到的形狀**，不是資料庫那張表的形狀。兩者刻意不同（見
 * `k-candle-field-vo.ts`），所以這裡的型別名寫的是沙箱裡真正的型別，
 * 讓畫面照抄就好，不必自己翻譯。
 */
export class KCandleFieldDto {
  constructor(
    /** 算式裡寫的欄位名，例如 `Close`。 */
    public readonly name: string,
    /** 那個欄位在沙箱裡的 Go 型別，例如 `float64`。 */
    public readonly type: string,
    /** 給人看的名字，與 K 線瀏覽的欄位標題同一套說法。 */
    public readonly label: string,
  ) {}
}
