import type { IndicatorPointDto } from '~/domain/models/dto/indicator-point-dto'

/**
 * DTO：一條跟著 K 線走的曲線——指標值是**一串數字**時畫成這樣。
 * 顏色與標籤都已經決定好了，畫面只負責畫。
 */
export class IndicatorSeriesDto {
  constructor(
    /** 這條線的身分：同一支策略的同一個指標名稱，重新打開畫面後仍是同一條線。 */
    public readonly lineKey: string,
    public readonly indicatorName: string,
    public readonly colorToken: string,
    public readonly points: readonly IndicatorPointDto[],
  ) {}
}
