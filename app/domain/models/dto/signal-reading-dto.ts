/**
 * DTO：信號的一種讀法——算式放了什麼，回測就當它說了什麼。
 *
 * 它與 `BacktestRuleDto` 分開，因為讀的方式不同：這一份是拿來排成對照表的
 * （左邊一欄值、右邊一欄意思），規則那一份是一條一條讀的。
 */
export class SignalReadingDto {
  constructor(
    /** 算式放進 `signal` 的值，例如「大於 0」。 */
    public readonly value: string,
    /** 回測把它讀成什麼，例如「買入」。 */
    public readonly meaning: string,
  ) {}
}
