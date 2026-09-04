import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantTriggerButton from '~/components/molecules/AssistantTriggerButton.vue'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

function mountTrigger(props: { right?: number, bottom?: number, dragging?: boolean } = {}) {
  return mount(AssistantTriggerButton, {
    props: {
      position: new AssistantTriggerPositionDto(props.right ?? 20, props.bottom ?? 20),
      dragging: props.dragging ?? false,
    },
  })
}

describe('AssistantTriggerButton', () => {
  it('畫在使用者把它擺著的地方', () => {
    const wrapper = mountTrigger({ right: 300, bottom: 120 })

    const style = wrapper.get('[data-testid="assistant-drawer-trigger"]').attributes('style')
    expect(style).toContain('right: 300px')
    expect(style).toContain('bottom: 120px')
  })

  it('是一顆圓的、只放圖示的鍵', () => {
    // 一個隨時都在、疊在所有內容之上的東西，方形會像有人把一塊東西忘在畫面上。
    const button = mountTrigger().get('[data-testid="assistant-drawer-trigger"]')

    expect(button.classes()).toContain('app-button--circle')
    expect(button.classes()).toContain('app-button--labelled')
  })

  it('說得出自己是誰，也說得出它可以被拖', () => {
    // 一顆只有圖示的鍵，對讀螢幕的人來說什麼都沒說。
    const button = mountTrigger().get('[data-testid="assistant-drawer-trigger"]')

    expect(button.attributes('aria-label')).toContain('問助手')
    expect(button.attributes('aria-label')).toContain('可拖曳')
  })

  it('按下就把游標的位置交出去', async () => {
    // 之後的移動與放下掛在 window 上——手一快就會離開這顆鍵。
    const wrapper = mountTrigger()

    await wrapper.get('[data-testid="assistant-drawer-trigger"]')
      .trigger('pointerdown', { clientX: 640, clientY: 480 })

    expect(wrapper.emitted('dragStart')).toEqual([[640, 480]])
  })

  it('拖曳中看得出來正被拿著', () => {
    const wrapper = mountTrigger({ dragging: true })

    expect(wrapper.get('[data-testid="assistant-drawer-trigger"]').classes())
      .toContain('assistant-trigger-button--dragging')
  })
})
