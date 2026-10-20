export class StrategyBotRunRecordQueryDto {
  constructor(
    public readonly strategyBotId: number,
    /** `null` lists every symbol, including ones the bot no longer watches. */
    public readonly symbol: string | null = null,
  ) {}
}
