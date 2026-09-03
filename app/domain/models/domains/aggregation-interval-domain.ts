import type { AggregationIntervalValue, AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import { AGGREGATION_INTERVALS, FINEST_AGGREGATION_INTERVAL } from '~/domain/models/vo/aggregation-interval-vo'
import { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'

/**
 * Domain Model：一種彙總刻度，以及其他人需要知道的關於它的一切。
 *
 * 解讀刻意寬容：使用者從清單挑，挑不出非法值；真正會給出陌生代號的是後端，
 * 而讓整個結果畫面因為一個沒見過的刻度而壞掉，遠比當成「五分鐘」呈現更糟。
 * 認不得就退回最細的那一種——它剛好等於一根 K 線本來的長度，
 * 所以以它彙總等於不彙總，是「沒特別指定」最誠實的意思。
 *
 * 它與 `AggregationIntervalVo` 只差一個後綴，分工也就在那個後綴上：
 * 那個是**值**（代號、名字、幾分鐘），這個是**行為**（怎麼讀一個宣告、怎麼說出它的名字）。
 */
export class AggregationIntervalDomain {
  private readonly interval: AggregationIntervalVo

  constructor(declared: string) {
    const normalizedDeclaration = declared.trim().toLowerCase()

    this.interval = AGGREGATION_INTERVALS.find(
      candidate => candidate.value.toLowerCase() === normalizedDeclaration)
    ?? FINEST_AGGREGATION_INTERVAL
  }

  get value(): AggregationIntervalValue {
    return this.interval.value
  }

  /** 給使用者看的名字。畫面不自己翻譯刻度。 */
  label(): string {
    return this.interval.label
  }

  toOptionDto(): AggregationIntervalOptionDto {
    return new AggregationIntervalOptionDto(this.value, this.label())
  }
}
