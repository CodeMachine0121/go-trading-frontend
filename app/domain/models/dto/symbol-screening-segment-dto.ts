export class SymbolScreeningSegmentDto {
  constructor(
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly returnText: string,
    public readonly maximumDrawdownText: string,
    public readonly closedTradeCount: number,
    public readonly liquidationCount: number,
  ) {}
}
