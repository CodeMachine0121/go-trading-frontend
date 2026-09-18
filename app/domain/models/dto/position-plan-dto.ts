import type Decimal from 'decimal.js'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/**
 * DTO：一台機器人每一輪要建議押多少、停在哪裡的那五個數字。
 *
 * 一個形狀同時服務三段路——後端讀回來的、交出去要存的、表單填出來的——
 * 因為三段講的是同一組數字。三個形狀之後一定會漂移，而漂移的那一個
 * 會是表單送出去的那一個。
 *
 * **「有沒有部位規劃」不在這裡**：那是這整個物件是不是 `null`。
 * 往裡面塞一個「要不要算」的旗標，就是讓兩個欄位可以互相矛盾，
 * 而矛盾的那一種沒有人說得出該聽誰的。
 *
 * 金額一律 `decimal.js`。槓桿與那兩個距離也是——它們都會乘進金額，
 * 而用 `number` 會讓一個要拿去掛單的價格在小數第十位上飄掉。
 */
export class PositionPlanDto {
  constructor(
    /** 這台機器人算建議部位時拿來算的那一筆錢。 */
    public readonly capital: Decimal,
    /** 每次開倉押多少，沿用回測那三種，不另立第四種。 */
    public readonly sizingMode: PositionSizingMode,
    /** 配合押多少的數字。全押時填什麼都不影響。 */
    public readonly sizingValue: Decimal,
    /** 名目部位是保證金的幾倍。1 就是不上槓桿。 */
    public readonly leverage: Decimal,
    /** 止損價離參考價幾個百分點。零就是不設止損。 */
    public readonly stopLossPercentage: Decimal,
    /** 止盈價離參考價幾個百分點。零就是不設止盈。 */
    public readonly takeProfitPercentage: Decimal,
  ) {}
}
