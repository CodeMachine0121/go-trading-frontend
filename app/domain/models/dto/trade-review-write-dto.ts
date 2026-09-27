export class TradeReviewWriteDto {
  constructor(
    public readonly wentWell: string,
    public readonly wentWrong: string,
    public readonly nextTime: string,
    public readonly executionScore: number,
    public readonly mistakeTagIds: readonly number[],
  ) {}
}
