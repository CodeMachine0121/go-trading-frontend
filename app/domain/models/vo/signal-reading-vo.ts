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
 * 回測怎麼讀那個叫 `signal` 的數字——**看正負號**，而不是只認 1、-1、0。
 *
 * 看正負號的好處是每一個數字都有明確意義：算式想用強弱表達信心（0.5 也是買入）不必特別處理，
 * 而「合法但無解」的值不存在。
 *
 * 後兩列是最容易被忽略、也最重要的兩列：**沒放這個名字等同持平**，
 * 所以既有的算式拿去回測是「零交易」而不是報錯；而算壞掉的數字也讀作持平——
 * 一個算術意外不是下注的指示。
 *
 * 順序照「會發生什麼」由強到弱排：先講兩種會動作的，再講三種不動作的。
 */
export const SIGNAL_READINGS: SignalReadingVo[] = [
  new SignalReadingVo('大於 0（例如 1、0.5、42）', '買入'),
  new SignalReadingVo('小於 0（例如 -1、-2）', '賣出'),
  new SignalReadingVo('等於 0', '持平，不動作'),
  new SignalReadingVo('結果裡沒有這個名字', '持平——所以既有的算式不必改一個字'),
  new SignalReadingVo('算不出有限數字（0/0、除以零）', '持平，重演不中斷'),
]
