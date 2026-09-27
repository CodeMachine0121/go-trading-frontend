export class SpotTradeDistributionBucket {
  constructor(
    public readonly label: string,
    public readonly count: number,
    public readonly profitable: boolean,
  ) {}
}
