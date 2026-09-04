import type { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'

/** 清單上那一列畫著的一條線：身分、名字、顏色。 */
export class AppliedIndicatorLineDto {
  constructor(
    public readonly lineKey: string,
    public readonly indicatorName: string,
    public readonly colorToken: string,
  ) {}
}

/**
 * DTO：已套用清單上的**一列此刻的樣子**。
 *
 * 它存在的理由是**不讓畫面逐列查表**。這幾樣東西原本分散在三份平行資料裡
 * （哪幾筆、哪幾筆在算、哪幾筆失敗）加上一份算出來的線，於是畫面每畫一列
 * 就得拿那一列的身分去查五次——而每一次查表都是一次「外面也要會算同一把鑰匙」的要求。
 *
 * 併成一列之後，畫面只剩一個迴圈：它拿到的每一列都已經知道自己是什麼樣子。
 */
export class AppliedIndicatorRowDto {
  constructor(
    public readonly appliedIndicator: AppliedIndicatorDto,
    /** 這一列可以調的那幾格。一個旋鈕都沒有時是空的。 */
    public readonly parameterFields: readonly StrategyParameterFieldDto[],
    public readonly isCalculating: boolean,
    /** 這一列算不出來的原因，算得出來時是 `null`。 */
    public readonly failureMessage: string | null,
    /**
     * 這一列填的東西哪裡不對，沒有就是 `null`。
     *
     * 與上面那個分開，因為它們講的是不同的事：那個說「算過了、算不出來」，
     * 這個說「還沒算——你填的東西用不了」。混成同一個，使用者會以為算式壞了。
     */
    public readonly parameterMessage: string | null,
    /** 這一列畫出來的線。水平線與曲線攤成同一份——畫面上它們長得一樣。 */
    public readonly lines: readonly AppliedIndicatorLineDto[],
    /** 算完了，但這支算式沒有放進任何指標。**這不是失敗。** */
    public readonly drawsNothing: boolean,
  ) {}
}
