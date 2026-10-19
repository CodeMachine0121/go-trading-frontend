import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import SymbolScreeningSubmitPanel from '~/components/organisms/SymbolScreeningSubmitPanel.vue'
import { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { buildScreeningProfile, buildScreeningRun } from '../../fixtures/symbol-screening'

function mountPanel(profiles = [buildScreeningProfile(1, '趨勢 V3').toDto(), buildScreeningProfile(2, '區間 V1').toDto()]) {
  const applicationMock = { submitRun: vi.fn().mockResolvedValue(buildScreeningRun(12, 'queued').toDomain().toDto()) }
  const wrapper = mount(SymbolScreeningSubmitPanel, {
    props: {
      symbolScreeningApplication: applicationMock as unknown as InstanceType<typeof SymbolScreeningSubmitPanel>['$props']['symbolScreeningApplication'],
      profiles,
    },
  })

  return { wrapper, applicationMock }
}

describe('SymbolScreeningSubmitPanel', () => {
  it('submits the pasted symbols with the chosen profile and hands the run up', async () => {
    const { wrapper, applicationMock } = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-submit-profile"]').setValue('2')
    await wrapper.get('[data-testid="symbol-screening-submit-symbols"]').setValue('linkusdt，ADAUSDT')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(applicationMock.submitRun).toHaveBeenCalledWith(new SymbolScreeningRunSubmissionDto(2, 'linkusdt，ADAUSDT'))
    expect(wrapper.emitted('submitted')?.[0]?.[0]).toMatchObject({ id: 12 })
  })

  it('shows the refusal and keeps what was pasted', async () => {
    const { wrapper, applicationMock } = mountPanel()
    applicationMock.submitRun.mockRejectedValue(new Error('你已經有一筆篩選在排隊或進行中，等它結束再送'))
    await wrapper.get('[data-testid="symbol-screening-submit-symbols"]').setValue('LINKUSDT')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="symbol-screening-submit-failure"]').text())
      .toBe('你已經有一筆篩選在排隊或進行中，等它結束再送')
    expect((wrapper.get('[data-testid="symbol-screening-submit-symbols"]').element as HTMLTextAreaElement).value)
      .toBe('LINKUSDT')
    expect(wrapper.emitted('submitted')).toBeUndefined()
  })

  it('explains a profile is needed first and offers no submit', () => {
    const { wrapper } = mountPanel([])

    expect(wrapper.find('[data-testid="symbol-screening-submit-no-profiles"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="symbol-screening-submit"]').exists()).toBe(false)
  })

  it('offers no submit once the last profile is gone', async () => {
    const { wrapper } = mountPanel()

    await wrapper.setProps({ profiles: [] })

    expect(wrapper.find('[data-testid="symbol-screening-submit-no-profiles"]').exists()).toBe(true)
  })

  it('switches to the first profile left when the chosen one disappears', async () => {
    const { wrapper, applicationMock } = mountPanel()
    await wrapper.get('[data-testid="symbol-screening-submit-profile"]').setValue('1')

    await wrapper.setProps({ profiles: [buildScreeningProfile(2, '區間 V1').toDto()] })
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(applicationMock.submitRun).toHaveBeenCalledWith(new SymbolScreeningRunSubmissionDto(2, ''))
  })
})
