export class ContractTradeFailureDto {
  constructor(
    public readonly message: string,
    public readonly unreachable: boolean,
  ) {}
}
