export class TradeNoteDto {
  constructor(
    public readonly id: number,
    public readonly content: string,
    public readonly createdAt: Date,
  ) {}
}
