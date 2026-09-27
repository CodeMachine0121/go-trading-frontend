export class TradeFailureDto {
  constructor(
    public readonly message: string,
    public readonly unreachable: boolean,
  ) {}
}
