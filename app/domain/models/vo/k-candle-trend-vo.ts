/**
 * VO：一根 K 線的漲跌語氣。不可變、無行為。
 *
 * 漲跌是業務判斷，因此標籤與語氣都在 domain 決定好；
 * 畫面只負責把 tone 接到元件的 variant，不得自己寫 `close > open ? ... : ...`。
 */
export class KCandleTrendVo {
  constructor(
    public readonly value: 'up' | 'down' | 'flat',
    public readonly label: string,
    public readonly tone: 'success' | 'danger' | 'neutral',
  ) {}
}
