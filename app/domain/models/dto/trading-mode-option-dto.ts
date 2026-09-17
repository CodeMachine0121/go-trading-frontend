import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'

/**
 * DTO：「交易模式」那一列上可以挑的一個。
 *
 * 它連**那一句說明**都一起帶著，因為「多空反手」與「現貨」對沒聽過的人來說
 * 是兩個名詞，不是兩個行為。使用者要決定的其實是一句話：
 * 賣出的時候，你要幫我放空，還是把錢還我？
 *
 * 名字與說明永遠一起出現，所以它們一起被交出來——分開拿就是給了兩次寫錯的機會。
 */
export class TradingModeOptionDto {
  constructor(
    public readonly value: TradingMode,
    public readonly label: string,
    public readonly description: string,
  ) {}
}
