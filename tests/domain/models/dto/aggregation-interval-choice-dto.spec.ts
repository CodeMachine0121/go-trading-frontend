import { describe, expect, it } from 'vitest'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { aggregationIntervalNamed as intervalOf } from '../../../fixtures/aggregation-interval'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

describe('使用者挑的那一種粗細', () => {
  describe('挑了固定的一種', () => {
    it.each(['1m', '5m', '15m', '1h'])('挑 %s 時，取行情要說出那一種', (value) => {
      const choice = new AggregationIntervalChoiceDto(intervalOf(value).label, intervalOf(value))

      expect(choice.declaredInterval).toBe(value)
    })

    it('它的身分就是那個刻度的代號', () => {
      const choice = new AggregationIntervalChoiceDto(new LocalizedTextVo('五分鐘', '5 minutes'), intervalOf('5m'))

      expect(choice.value).toBe('5m')
    })
  })

  describe('沒挑（自動）', () => {
    it('取行情時一個字都不說——粗細仍然由系統挑', () => {
      const choice = new AggregationIntervalChoiceDto(new LocalizedTextVo('自動', 'Auto'), null)

      expect(choice.declaredInterval).toBeNull()
    })

    it('它仍然有自己的身分，才比對得出「使用者換了沒」', () => {
      const choice = new AggregationIntervalChoiceDto(new LocalizedTextVo('自動', 'Auto'), null)

      expect(choice.value).toBe('auto')
    })

    it('與任何一種固定的粗細都不是同一個選擇', () => {
      const automatic = new AggregationIntervalChoiceDto(new LocalizedTextVo('自動', 'Auto'), null)
      const oneMinute = new AggregationIntervalChoiceDto(new LocalizedTextVo('一分鐘', '1 minute'), intervalOf('1m'))

      // 「自動」不是第七種刻度，尤其不等於最細的那一種：
      // 挑一分鐘是「不管多長都給我一分鐘」，自動是「你看著辦」。
      expect(automatic.value).not.toBe(oneMinute.value)
    })
  })

  it('兩個各自建出來的同一個選擇是同一個身分——它可能從別處還原回來', () => {
    const built = new AggregationIntervalChoiceDto(new LocalizedTextVo('五分鐘', '5 minutes'), intervalOf('5m'))
    const restored = new AggregationIntervalChoiceDto(new LocalizedTextVo('五分鐘', '5 minutes'), intervalOf('5m'))

    expect(built.value).toBe(restored.value)
  })
})
