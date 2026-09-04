import { describe, expect, it } from 'vitest'
import { readNumberInput } from '~/utilities/number-input-reading'

describe('readNumberInput', () => {
  it.each([
    { name: '框已經幫忙讀成數字了', raw: 20, expected: 20 },
    { name: '小數也照樣收', raw: 1.5, expected: 1.5 },
    { name: '零是一個合法的數字', raw: 0, expected: 0 },
    { name: '還沒讀成數字的那一段文字', raw: '20', expected: 20 },
    { name: '前後有空白', raw: ' 20 ', expected: 20 },
  ])('$name', ({ raw, expected }) => {
    expect(readNumberInput(raw)).toBe(expected)
  })

  it.each([
    { name: '整格被清空', raw: '' },
    { name: '只剩空白字元', raw: '   ' },
    { name: '只打了一個負號', raw: '-' },
    { name: '根本不是數字', raw: 'abc' },
    { name: '讀出來不是一個有限的數', raw: Number.NaN },
    { name: '讀出來是無限大', raw: Number.POSITIVE_INFINITY },
  ])('$name 時讀不成——不是零', ({ raw }) => {
    // 讀成 0 會讓使用者在打完之前就先看到一則錯誤，而他什麼都還沒做錯。
    expect(readNumberInput(raw)).toBeNull()
  })
})
