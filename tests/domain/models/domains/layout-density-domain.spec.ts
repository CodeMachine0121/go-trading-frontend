import { describe, expect, it } from 'vitest'
import { LayoutDensityDomain } from '~/domain/models/domains/layout-density-domain'

/** 一支手拿著的螢幕：手機直立，也是這個操作台支援的最窄寬度。 */
const PHONE = 390
/** 一台坐著用的機器。 */
const DESKTOP = 1600

function at(viewportWidth: number) {
  return new LayoutDensityDomain(viewportWidth).toDto()
}

describe('LayoutDensityDomain 疏密', () => {
  it.each([
    { name: '手機直立是寬鬆的那一套', width: PHONE, expected: 'roomy' },
    { name: '差一個像素就到分界，仍然是寬鬆', width: 767, expected: 'roomy' },
    { name: '剛好到分界就是密集', width: 768, expected: 'compact' },
    { name: '桌機是密集', width: DESKTOP, expected: 'compact' },
  ])('$name', ({ width, expected }) => {
    expect(at(width).density).toBe(expected)
  })
})

describe('LayoutDensityDomain 導覽的形狀', () => {
  it.each([
    { name: '手機上是抽屜', width: PHONE, expected: true },
    { name: '差一個像素就到分界，仍然是抽屜', width: 1023, expected: true },
    { name: '剛好到分界就是固定側欄', width: 1024, expected: false },
    { name: '桌機是固定側欄', width: DESKTOP, expected: false },
  ])('$name', ({ width, expected }) => {
    expect(at(width).usesNavigationDrawer).toBe(expected)
  })

  it('導覽的分界比疏密的分界寬——平板放得下寬鬆的表單，放不下九個並排的去處', () => {
    expect(at(800).density).toBe('compact')
    expect(at(800).usesNavigationDrawer).toBe(true)
  })
})

describe('LayoutDensityDomain 積木工作檯編不編得動', () => {
  it.each([
    { name: '手機上編不動', width: PHONE, expected: false },
    { name: '差一個像素就到分界，仍然編不動', width: 767, expected: false },
    { name: '剛好到分界就編得動', width: 768, expected: true },
  ])('$name', ({ width, expected }) => {
    expect(at(width).allowsBlockEditing).toBe(expected)
  })
})

describe('LayoutDensityDomain K 線控制項的起始狀態', () => {
  it.each([
    { name: '手機上一開始就收起來，高度先讓給圖', width: PHONE, expected: true },
    { name: '差一個像素就到分界，仍然收起來', width: 767, expected: true },
    { name: '剛好到分界就維持展開', width: 768, expected: false },
  ])('$name', ({ width, expected }) => {
    expect(at(width).startsChartControlsCollapsed).toBe(expected)
  })
})

describe('LayoutDensityDomain 助手蓋不蓋滿畫面', () => {
  it.each([
    { name: '手機上蓋滿整個畫面', width: PHONE, expected: true },
    { name: '差一個像素就到分界，仍然蓋滿', width: 767, expected: true },
    { name: '剛好到分界就回到側邊抽屜', width: 768, expected: false },
  ])('$name', ({ width, expected }) => {
    expect(at(width).assistantCoversScreen).toBe(expected)
  })
})

describe('LayoutDensityDomain 極端的寬度', () => {
  it('寬度是零時，每一個答案都是窄螢幕那一邊', () => {
    // 量不到寬度也得給一組答案，而窄的那一組在任何寬度下都還能用——
    // 反過來則會在手機上給出一張改不動的工作檯與一條擠不下的側欄。
    expect(at(0)).toEqual({
      density: 'roomy',
      usesNavigationDrawer: true,
      allowsBlockEditing: false,
      startsChartControlsCollapsed: true,
      assistantCoversScreen: true,
    })
  })
})
