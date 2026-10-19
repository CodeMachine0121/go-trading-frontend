export class SymbolScreeningSegmentFindingVo {
  constructor(
    public readonly startTime: Date,
    public readonly endTime: Date,
    public readonly returnRate: number,
    public readonly maximumDrawdown: number,
    public readonly closedTradeCount: number,
    public readonly liquidationCount: number,
  ) {}
}
