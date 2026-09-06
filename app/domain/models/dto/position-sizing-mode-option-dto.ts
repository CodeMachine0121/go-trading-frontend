import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'

/**
 * DTO：「每次開倉押多少」下拉選單上可以挑的一個。
 *
 * 它連「選了之後旁邊要不要出現一格」都一起帶著：那是規則，不是畫面的判斷。
 * 畫面若自己記著「只有全押不用填」，哪天多一種不必填的模式，它會安靜地要求填數字。
 */
export class PositionSizingModeOptionDto {
  constructor(
    public readonly value: PositionSizingMode,
    public readonly label: string,
    public readonly requiresValue: boolean,
    /** 旁邊那一格的標籤；不需要那一格時是空字串。 */
    public readonly valueLabel: string,
  ) {}
}
