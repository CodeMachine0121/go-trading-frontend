import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantPendingRevisionCard from '~/components/molecules/AssistantPendingRevisionCard.vue'
import { AssistantPendingRevisionDto } from '~/domain/models/dto/assistant-pending-revision-dto'

function revisionDtoOf(canResolve: boolean, statusLabel = canResolve ? '等你確認' : '已確認') {
  return new AssistantPendingRevisionDto(
    70, '策略腳本「二十根均線」', '{\n  "name": "六十根均線"\n}', statusLabel, canResolve,
    new Date('2026-09-26T08:00:00Z'))
}

describe('AssistantPendingRevisionCard', () => {
  it('說得出改的是哪一支、在哪個狀態，並看得到改成的完整內容', () => {
    const wrapper = mount(AssistantPendingRevisionCard, { props: { revision: revisionDtoOf(true) } })

    expect(wrapper.get('[data-testid="assistant-pending-revision-title"]').text()).toBe('策略腳本「二十根均線」')
    expect(wrapper.get('[data-testid="assistant-pending-revision-status"]').text()).toBe('等你確認')
    expect(wrapper.get('[data-testid="assistant-pending-revision-content"]').text()).toContain('"name": "六十根均線"')
  })

  it.each([
    { action: 'confirm' as const, testId: 'assistant-pending-revision-confirm' },
    { action: 'reject' as const, testId: 'assistant-pending-revision-reject' },
  ])('按 $action 時說出是哪一筆', async ({ action, testId }) => {
    const wrapper = mount(AssistantPendingRevisionCard, { props: { revision: revisionDtoOf(true) } })

    await wrapper.get(`[data-testid="${testId}"]`).trigger('click')

    expect(wrapper.emitted(action)).toEqual([[70]])
  })

  it('處理過的只顯示狀態，沒有鍵', () => {
    const wrapper = mount(AssistantPendingRevisionCard, { props: { revision: revisionDtoOf(false) } })

    expect(wrapper.get('[data-testid="assistant-pending-revision-status"]').text()).toBe('已確認')
    expect(wrapper.find('[data-testid="assistant-pending-revision-confirm"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-pending-revision-reject"]').exists()).toBe(false)
  })

  it('結果回來之前兩顆鍵都不給按', async () => {
    const wrapper = mount(AssistantPendingRevisionCard, { props: { revision: revisionDtoOf(true), busy: true } })

    await wrapper.get('[data-testid="assistant-pending-revision-confirm"]').trigger('click')
    await wrapper.get('[data-testid="assistant-pending-revision-reject"]').trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.emitted('reject')).toBeUndefined()
  })

  it('被擋下時就地說出後端那一句，沒有時什麼都不多', () => {
    const blocked = mount(AssistantPendingRevisionCard, {
      props: { revision: revisionDtoOf(true), errorMessage: '這幾台機器人正在用它跑：早盤突破，請先停止它們' },
    })
    const clear = mount(AssistantPendingRevisionCard, { props: { revision: revisionDtoOf(true) } })

    expect(blocked.get('[data-testid="assistant-pending-revision-error"]').text())
      .toBe('這幾台機器人正在用它跑：早盤突破，請先停止它們')
    expect(clear.find('[data-testid="assistant-pending-revision-error"]').exists()).toBe(false)
  })
})
