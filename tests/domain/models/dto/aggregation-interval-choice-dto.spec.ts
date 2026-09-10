import { describe, expect, it } from 'vitest'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { AGGREGATION_INTERVALS } from '~/domain/models/vo/aggregation-interval-vo'

function intervalOf(value: string) {
  const aggregationInterval = AGGREGATION_INTERVALS.find(candidate => candidate.value === value)
  if (aggregationInterval === undefined) {
    throw new Error(`測試用了一個不存在的彙總刻度：${value}`)
  }

  return aggregationInterval
}

describe('使用者挑的那一種粗細', () => {
  describe('挑了固定的一種', () => {
    it.each([
      ['1m', '一分鐘'],
      ['5m', '五分鐘'],
      ['15m', '十五分鐘'],
      ['1h', '一小時'],
    ])('挑 %s 時，取行情要說出那一種', (value, label) => {
      const choice = new AggregationIntervalChoiceDto(label, intervalOf(value))

      expect(choice.declaredInterval).toBe(value)
    })

    it('它的身分就是那個刻度的代號', () => {
      const choice = new AggregationIntervalChoiceDto('五分鐘', intervalOf('5m'))

      expect(choice.value).toBe('5m')
    })
  })

  describe('沒挑（自動）', () => {
    it('取行情時一個字都不說——粗細仍然由系統挑', () => {
      const choice = new AggregationIntervalChoiceDto('自動', null)

      expect(choice.declaredInterval).toBeNull()
    })

    it('它仍然有自己的身分，才比對得出「使用者換了沒」', () => {
      const choice = new AggregationIntervalChoiceDto('自動', null)

      expect(choice.value).toBe('auto')
    })

    it('與任何一種固定的粗細都不是同一個選擇', () => {
      const automatic = new AggregationIntervalChoiceDto('自動', null)
      const oneMinute = new AggregationIntervalChoiceDto('一分鐘', intervalOf('1m'))

      // 「自動」不是第七種刻度，尤其不等於最細的那一種：
      // 挑一分鐘是「不管多長都給我一分鐘」，自動是「你看著辦」。
      expect(automatic.value).not.toBe(oneMinute.value)
    })
  })

  it('兩個各自建出來的同一個選擇是同一個身分——它可能從別處還原回來', () => {
    const built = new AggregationIntervalChoiceDto('五分鐘', intervalOf('5m'))
    const restored = new AggregationIntervalChoiceDto('五分鐘', intervalOf('5m'))

    expect(built.value).toBe(restored.value)
  })
})
