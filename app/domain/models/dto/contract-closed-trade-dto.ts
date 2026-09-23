/** DTO：交易明細裡一筆合約交易多出的幾格，已經可以直接畫。 */
export class ContractClosedTradeDto {
  constructor(
    /** 例如 `'5 倍'`。 */
    public readonly leverageLabel: string,
    public readonly quantity: string,
    /** 押下去的保證金。 */
    public readonly margin: string,
    /** 付出的資金費用淨額；負的是收到的。 */
    public readonly fundingFee: string,
  ) {}
}
