import { describe, expect, it } from 'vitest'
import { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { aggregationIntervalNamed as intervalOf } from '../../../fixtures/aggregation-interval'

describe('使用者挑的那一種粗細', () => {
  it.each(['1m', '5m', '15m', '1h', '4h', '1d'])('挑 %s 時，取行情要說出那一種', (value) => {
    expect(new AggregationIntervalChoiceDto(intervalOf(value)).declaredInterval).toBe(value)
  })

  it('它的身分就是那個刻度的代號', () => {
    expect(new AggregationIntervalChoiceDto(intervalOf('5m')).value).toBe('5m')
  })

  it('按鈕上的說法就是那個刻度的名字', () => {
    expect(new AggregationIntervalChoiceDto(intervalOf('4h')).label).toEqual(intervalOf('4h').label)
  })

  it('兩個各自建出來的同一個選擇是同一個身分——它可能從別處還原回來', () => {
    expect(new AggregationIntervalChoiceDto(intervalOf('5m')).value)
      .toBe(new AggregationIntervalChoiceDto(intervalOf('5m')).value)
  })
})
