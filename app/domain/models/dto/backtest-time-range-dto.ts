/**
 * DTO：回測要重演的那一段，兩端都算在內。
 *
 * 它是雙向的：畫面把使用者選的交出來，也拿它回填一打開就有的那組預設值。
 */
export class BacktestTimeRangeDto {
  constructor(
    public readonly startTime: Date,
    public readonly endTime: Date,
  ) {}
}
