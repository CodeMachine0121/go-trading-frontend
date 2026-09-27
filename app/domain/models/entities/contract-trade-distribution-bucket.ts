export class ContractTradeDistributionBucket {
  constructor(
    public readonly label: string,
    public readonly count: number,
    public readonly profitable: boolean,
  ) {}
}
