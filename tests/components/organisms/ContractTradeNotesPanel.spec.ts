import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradeNotesPanel from '~/components/organisms/ContractTradeNotesPanel.vue'
import { buildRecord } from '../../fixtures/contract-trade-journal'

function mountPanel(recordOverrides: Record<string, unknown> = {}) {
  return mount(ContractTradeNotesPanel, {
    props: { record: buildRecord(recordOverrides).toDomain().toDto(), timeZoneIdentifier: 'UTC' },
  })
}

describe('ContractTradeNotesPanel', () => {
  it('附註依時間由早到晚', () => {
    const text = mountPanel().get('[data-testid="notes"]').text()

    expect(text.indexOf('第一則')).toBeLessThan(text.indexOf('第二則'))
  })

  it('加附註送出輸入的內容；空白時按不動', async () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="note-add"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="note-input"]').setValue('止損其實是 96,300')
    await wrapper.get('[data-testid="note-add"]').trigger('click')

    expect(wrapper.emitted('addNote')).toEqual([['止損其實是 96,300']])
  })

  it('換上新的一筆後附註輸入清空', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="note-input"]').setValue('附註')

    await wrapper.setProps({ record: buildRecord().toDomain().toDto() })

    expect((wrapper.get('[data-testid="note-input"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('還沒有附註時沒有附註清單', () => {
    expect(mountPanel({ notes: [] }).find('[data-testid="notes"]').exists()).toBe(false)
  })
})
