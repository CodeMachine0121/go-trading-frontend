import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TradeNotesPanel from '~/components/organisms/TradeNotesPanel.vue'
import { TradeNote } from '~/domain/models/entities/trade-note'
import { buildRecord } from '../../fixtures/contract-trade-journal'

function mountPanel(recordOverrides: Record<string, unknown> = {}) {
  return mount(TradeNotesPanel, {
    props: { notes: buildRecord(recordOverrides).toDomain().toDto().notes, timeZoneIdentifier: 'UTC' },
  })
}

describe('TradeNotesPanel', () => {
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

  it('頁面重新讀取但附註沒變時保留輸入；多了一則附註（剛存下）才清空', async () => {
    const wrapper = mountPanel()
    await wrapper.get('[data-testid="note-input"]').setValue('附註')

    await wrapper.setProps({ notes: buildRecord().toDomain().toDto().notes })

    expect((wrapper.get('[data-testid="note-input"]').element as HTMLTextAreaElement).value).toBe('附註')

    const notesWithNewOne = buildRecord().notes.concat(new TradeNote(3, '附註', new Date('2026-09-27T03:00:00Z')))
    await wrapper.setProps({ notes: buildRecord({ notes: notesWithNewOne }).toDomain().toDto().notes })

    expect((wrapper.get('[data-testid="note-input"]').element as HTMLTextAreaElement).value).toBe('')
  })

  it('還沒有附註時沒有附註清單', () => {
    expect(mountPanel({ notes: [] }).find('[data-testid="notes"]').exists()).toBe(false)
  })
})
