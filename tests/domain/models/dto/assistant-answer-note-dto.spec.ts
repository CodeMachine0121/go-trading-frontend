import { describe, expect, it } from 'vitest'
import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'

describe('AssistantAnswerNoteDto.label', () => {
  // 「查了 0 次」是一句沒有資訊的話，而且會讓人以為查詢失敗了，所以一次都沒查時只講份量。
  it.each([
    { queryCount: 3, usage: 3184, expectedLabel: '查了 3 次 · 份量 3184', expectedEnglishLabel: '3 lookups · Usage 3184' },
    { queryCount: 0, usage: 512, expectedLabel: '份量 512', expectedEnglishLabel: 'Usage 512' },
    { queryCount: 1, usage: 900, expectedLabel: '查了 1 次 · 份量 900', expectedEnglishLabel: '1 lookup · Usage 900' },
  ])('查了 $queryCount 次 → $expectedLabel', ({ queryCount, usage, expectedLabel, expectedEnglishLabel }) => {
    const label = new AssistantAnswerNoteDto(queryCount, usage, false).label

    expect(label.in('zh-TW')).toBe(expectedLabel)
    expect(label.in('en')).toBe(expectedEnglishLabel)
  })
})

describe('AssistantAnswerNoteDto.stoppedAtQueryLimitLabel', () => {
  it('提早收尾時說出這是就目前所得的回答', () => {
    // 半個誠實的答案比沒有答案有用，但使用者得知道它是半個，
    // 否則會把它當成完整的結論拿去用。
    const note = new AssistantAnswerNoteDto(8, 9000, true)

    expect(note.stoppedAtQueryLimitLabel?.in('zh-TW')).toContain('已達查詢次數上限')
    expect(note.stoppedAtQueryLimitLabel?.in('en')).toContain('lookup limit was reached')
  })

  it('正常講完時沒有那一句', () => {
    expect(new AssistantAnswerNoteDto(3, 3184, false).stoppedAtQueryLimitLabel).toBeNull()
  })
})
