/** DTO：畫面用來指名一根 K 線的形狀（交易標的 + 起始時間）。 */
export class KCandleIdentityDto {
  constructor(
    public readonly symbol: string,
    public readonly openTime: Date,
  ) {}
}
