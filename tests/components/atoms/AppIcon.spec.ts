import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppIcon from '~/components/atoms/AppIcon.vue'

const EVERY_ICON = [
  'new', 'save', 'save-as', 'library', 'rename', 'load', 'delete', 'close', 'example',
  'connection', 'table', 'candles', 'formula', 'refresh', 'chevron', 'shown', 'hidden',
] as const

describe('AppIcon', () => {
  it.each(EVERY_ICON)('%s 畫得出來', (name) => {
    const wrapper = mount(AppIcon, { props: { name } })

    expect(wrapper.get('svg').attributes('data-icon')).toBe(name)
    expect(wrapper.findAll('path').length).toBeGreaterThan(0)
  })

  it('每個圖示畫的都不一樣', () => {
    // 同一份路徑貼成兩個名字，畫面上就會有兩顆按鈕長得一模一樣而意思不同。
    const drawings = EVERY_ICON.map(
      name => mount(AppIcon, { props: { name } })
        .findAll('path').map(path => path.attributes('d')).join('|'))

    expect(new Set(drawings).size).toBe(EVERY_ICON.length)
  })

  it('對讀螢幕的人隱藏——說話的是按鈕，不是圖示', () => {
    const wrapper = mount(AppIcon, { props: { name: 'save' } })

    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
  })

  it('顏色跟著使用它的地方走', () => {
    // 寫死顏色的話，同一個圖示放到深色按鈕上就看不見了。
    const wrapper = mount(AppIcon, { props: { name: 'save' } })

    expect(wrapper.get('svg').attributes('stroke')).toBe('currentColor')
  })
})
