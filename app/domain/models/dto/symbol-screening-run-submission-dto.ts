export class SymbolScreeningRunSubmissionDto {
  constructor(
    public readonly profileId: number,
    public readonly symbols: string,
  ) {}
}
