/**
 * DTO：一支策略記著的四樣東西——算式內容、指標值種類、彙總刻度、計算根數。
 *
 * **這四樣只有這一種形狀。** 它同時是「載入時帶進畫面的東西」、「儲存時送出去的東西」、
 * 以及「拿來比對有沒有被改過的東西」。四處各自定義一份就有四份會漂移的複本，
 * 而「有沒有改過」一旦漏比一個欄位，使用者寫的東西就會被靜靜蓋掉。
 *
 * **不含交易標的**——同一支策略要能套用在不同市場上，市場是計算當下才指定的。
 *
 * 種類與刻度收的是字串而不是那兩組窄型別，因為這個形狀是雙向的：
 * 畫面上的選單天生交出字串，硬要窄型別就得在畫面上加一個編譯器檢查不了的斷言，
 * 那等於用一句「相信我」換來型別看起來很嚴謹。真正的把關在 domain——
 * 存進去時由 StrategyWriteDomain 正規化，交出來時 StrategyDomain 保證已經正規化過。
 */
export class StrategyContentDto {
  constructor(
    public readonly scriptBody: string,
    public readonly resultType: string,
    public readonly aggregationInterval: string,
    public readonly candleCount: number,
  ) {}
}
