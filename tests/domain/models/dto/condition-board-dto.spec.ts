import { describe, expect, it } from 'vitest'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'

function piece(sourceLabel: string, ...acceptedSignals: string[]) {
  return new ConditionBoardPieceDto(sourceLabel, acceptedSignals)
}

describe('ConditionBoardPieceDto 讀成一句話', () => {
  it.each([
    { name: '收一個信號', accepted: ['buy'], sentence: '突破 等於 買入', plainWords: '' },
    { name: '收兩個信號時照「其中之一」讀，並翻成人話', accepted: ['buy', 'hold'], sentence: '突破 等於 買入或持有', plainWords: '也就是「不是賣出」' },
    { name: '三個都收', accepted: ['buy', 'sell', 'hold'], sentence: '突破 等於 買入或賣出或持有', plainWords: '也就是「不管它說什麼都算」' },
    { name: '一個都沒收時照實說還沒決定', accepted: [], sentence: '突破 等於 （還沒選信號）', plainWords: '' },
  ])('$name', ({ accepted, sentence, plainWords }) => {
    const readOut = piece('突破', ...accepted)

    expect(readOut.sentence).toBe(sentence)
    expect(readOut.plainWords).toBe(plainWords)
  })
})

describe('ConditionBoardDto 讀成一句話', () => {
  it.each([
    {
      name: '把兩條扣成一組並選「或」',
      board: new ConditionBoardDto('and', [
        new ConditionBoardItemDto('or', [piece('突破', 'buy'), piece('動能', 'buy')]),
      ], true),
      expected: '突破 等於 買入 或 動能 等於 買入',
    },
    {
      name: '一組旁邊還有別的格時加上括號',
      board: new ConditionBoardDto('and', [
        new ConditionBoardItemDto(null, [piece('均線', 'buy')]),
        new ConditionBoardItemDto('or', [piece('突破', 'buy'), piece('動能', 'hold')]),
      ], true),
      expected: '均線 等於 買入 且 （突破 等於 買入 或 動能 等於 持有）',
    },
    {
      name: '空的一張不是一句話',
      board: new ConditionBoardDto('and', [], true),
      expected: '',
    },
  ])('$name', ({ board, expected }) => {
    expect(board.sentence).toBe(expected)
  })
})
