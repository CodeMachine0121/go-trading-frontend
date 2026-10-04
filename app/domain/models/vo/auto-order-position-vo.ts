import type Decimal from 'decimal.js'

/**
 * VO：一台合約機器人用自動下單自己開出來、還沒平掉的那一份，照交易服務的原樣。
 *
 * 方向照後端的拼法（`long`／`short`），空手時是空字串；不含使用者在幣安上自己開的倉位。
 */
export class AutoOrderPositionVo {
  constructor(
    public readonly direction: string,
    public readonly quantity: Decimal,
  ) {}
}
