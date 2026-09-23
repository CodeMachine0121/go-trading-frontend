import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'
import { FILL_TIMINGS } from '~/domain/models/vo/fill-timing-vo'
import { FillTimingOptionDto } from '~/domain/models/dto/fill-timing-option-dto'

const FILL_TIMING_DESCRIPTIONS: Readonly<Record<FillTiming, { label: string, description: string }>> = {
  close: {
    label: '收盤成交',
    description: '信號在說出它的那一格的收盤價成交。',
  },
  nextOpen: {
    label: '下一格開盤成交',
    description: '信號在下一格的開盤價成交；最後一格的信號不成交。短線策略用它比較貼近真的能拿到的價格。',
  },
}

const DEFAULT_FILL_TIMING: FillTiming = 'close'

/**
 * Domain Model：成交時點，以及它在畫面上怎麼說。
 *
 * 認不得的值讀成收盤成交——那是這個選項出現以前唯一的讀法，也是交易服務沒被告知時的讀法。
 */
export class FillTimingDomain {
  readonly value: FillTiming

  constructor(declared: string) {
    this.value = FILL_TIMINGS.find(candidate => candidate === declared.trim()) ?? DEFAULT_FILL_TIMING
  }

  /** 沒動過的那一種：它不必上線，交易服務本來就這樣讀。 */
  get isDefault(): boolean {
    return this.value === DEFAULT_FILL_TIMING
  }

  label(): string {
    return FILL_TIMING_DESCRIPTIONS[this.value].label
  }

  toOptionDto(): FillTimingOptionDto {
    const description = FILL_TIMING_DESCRIPTIONS[this.value]

    return new FillTimingOptionDto(this.value, description.label, description.description)
  }
}
