import { describe, expect, it } from 'vitest'
import { AssistantDrawerWidthDomain } from '~/domain/models/domains/assistant-drawer-width-domain'

/** 一個寬敞的視窗：最寬能到 720（上限），不受視窗限制。 */
const WIDE_VIEWPORT = 1600

describe('AssistantDrawerWidthDomain.clampedInto', () => {
  it.each([
    { name: '常用的寬度原樣留著', width: 420, expected: 420 },
    { name: '剛好在最窄', width: 320, expected: 320 },
    { name: '剛好在最寬', width: 720, expected: 720 },
    { name: '拉得比最窄還窄', width: 100, expected: 320 },
    { name: '拉得比最寬還寬', width: 2000, expected: 720 },
    { name: '負的寬度', width: -50, expected: 320 },
  ])('$name', ({ width, expected }) => {
    expect(new AssistantDrawerWidthDomain(width).clampedInto(WIDE_VIEWPORT)).toBe(expected)
  })

  it('最窄有下限，因為再窄它就不能用了', () => {
    // 帶小標與條列的回答會變成一行一兩個字，輸入框與送出鍵也擠成一團。
    expect(new AssistantDrawerWidthDomain(1).clampedInto(WIDE_VIEWPORT)).toBe(320)
  })

  it('最寬有上限，因為它是疊上來的東西不是第二個頁面', () => {
    // 寬到蓋掉大半個視窗，使用者就看不到自己正在問的那張圖——
    // 而「看著圖順手問一句」是它存在的理由。
    expect(new AssistantDrawerWidthDomain(5000).clampedInto(WIDE_VIEWPORT)).toBe(720)
  })

  it('視窗放不下時跟著視窗收，並在邊緣留一點', () => {
    // 上次在寬螢幕拉到 700，這次開一個 600 的視窗——照著用就是一塊比視窗還寬的面板。
    expect(new AssistantDrawerWidthDomain(700).clampedInto(600)).toBe(600 - 48)
  })

  it('視窗比最窄還窄時回最窄，不夾出一個更小的數字', () => {
    // 那時抽屜會與視窗一樣寬，而那是樣式那一層早就備好的退路。
    expect(new AssistantDrawerWidthDomain(420).clampedInto(200)).toBe(320)
  })
})
