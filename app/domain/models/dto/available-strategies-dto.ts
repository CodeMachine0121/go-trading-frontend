import type { PublishedStrategyDto } from '~/domain/models/dto/published-strategy-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

/**
 * DTO：日常挑策略時看得到的那一份，分成兩段。
 *
 * 兩段是**兩種型別**而不是一個清單加一個「唯不唯讀」的旗標，因為唯讀有五個後果
 * （載不進編輯器、不能改名、不能刪、不能發佈、不能存回去）。
 * 用旗標的話，那五個地方各自要記得問一次；用型別的話，其中四件事根本寫不出來——
 * 加入來的那一段沒有 `content` 可以交給編輯器。
 */
export class AvailableStrategiesDto {
  constructor(
    /** 自己寫的那些，帶算式，改得動。 */
    public readonly mine: readonly StrategyDto[],
    /** 從市集加入的那些，不帶算式，唯讀。 */
    public readonly adopted: readonly PublishedStrategyDto[],
  ) {}
}
