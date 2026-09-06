import { SignalReadingDto } from '~/domain/models/dto/signal-reading-dto'

/** VO：信號的一種讀法。不可變、無行為。 */
export class SignalReadingVo {
  constructor(
    public readonly value: string,
    public readonly meaning: string,
  ) {}

  toDto(): SignalReadingDto {
    return new SignalReadingDto(this.value, this.meaning)
  }
}

/**
 * 「一個信號」種類的算式能回傳什麼——三個值，沒有第四種。
 *
 * 由系統提供的方式選出（`indicator.Buy` / `indicator.Sell` / `indicator.Hold`），
 * 算式不必、也不能自己組一個信號出來。
 *
 * 順序照「會發生什麼」由強到弱排：先講兩種會動作的，再講不動作的那一種。
 */
export const SIGNAL_READINGS: SignalReadingVo[] = [
  new SignalReadingVo('return indicator.Buy', '買入'),
  new SignalReadingVo('return indicator.Sell', '賣出'),
  new SignalReadingVo('return indicator.Hold', '持有，倉位不動'),
]
