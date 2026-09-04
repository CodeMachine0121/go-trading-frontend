import { describe, expect, it } from 'vitest'
import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'

describe('AssistantAnswerNoteDto.label', () => {
  it('查過就說出查了幾次與份量', () => {
    expect(new AssistantAnswerNoteDto(3, 3184, false).label).toBe('查了 3 次 · 份量 3184')
  })

  it('一次都沒查時只講份量', () => {
    // 「查了 0 次」是一句沒有資訊的話，而且會讓人以為查詢失敗了。
    expect(new AssistantAnswerNoteDto(0, 512, false).label).toBe('份量 512')
  })

  it('查一次也照樣說出來', () => {
    expect(new AssistantAnswerNoteDto(1, 900, false).label).toBe('查了 1 次 · 份量 900')
  })
})

describe('AssistantAnswerNoteDto.stoppedAtQueryLimitLabel', () => {
  it('提早收尾時說出這是就目前所得的回答', () => {
    // 半個誠實的答案比沒有答案有用，但使用者得知道它是半個，
    // 否則會把它當成完整的結論拿去用。
    const note = new AssistantAnswerNoteDto(8, 9000, true)

    expect(note.stoppedAtQueryLimitLabel).toContain('已達查詢次數上限')
  })

  it('正常講完時沒有那一句', () => {
    expect(new AssistantAnswerNoteDto(3, 3184, false).stoppedAtQueryLimitLabel).toBeNull()
  })
})
