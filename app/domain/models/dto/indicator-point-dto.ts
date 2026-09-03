/**
 * DTO：一條指標曲線上的一點。
 *
 * 帶的是**那一根 K 線的起始時間**，不是它在陣列裡的位置——
 * 照位置對，只要算式少回一個值，整條線就會整個位移，而且看起來完全正常。
 */
export class IndicatorPointDto {
  constructor(
    public readonly openTime: Date,
    public readonly value: number,
  ) {}
}
