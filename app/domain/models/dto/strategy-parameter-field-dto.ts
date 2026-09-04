import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * DTO：一個旋鈕，連同它在畫面上該長什麼樣子。
 *
 * 它存在的理由是**不讓畫面判斷種類**：「回看根數要整數鍵盤」是業務規則，
 * 不是版面問題。畫面拿到答案就接上去，不寫任何 `if (kind === ...)`。
 *
 * 旋鈕本身也在裡面，而不是讓畫面拿兩份平行的清單去對位。對位這件事一旦交給畫面，
 * 它就得回答「第 n 列的描述不存在時怎麼辦」——那是一個永遠不會發生、
 * 卻必須寫在畫面上的分支，而寫下去之後沒有人能再證明它不會發生。
 */
export class StrategyParameterFieldDto {
  constructor(
    public readonly parameter: StrategyParameterDto,
    public readonly inputMode: 'numeric' | 'decimal',
    public readonly step: number,
    public readonly isInvalid: boolean,
  ) {}
}
