// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SymbolScreeningRunPanel from '~/components/organisms/SymbolScreeningRunPanel.vue'
import { buildCandidate, buildRunDetail, buildScreeningRun } from '../../fixtures/symbol-screening'
import { buildTimeZone } from '../../fixtures/time-zone'

const applicationMock = {
  listRuns: vi.fn(),
  refreshRuns: vi.fn(),
  cancelRun: vi.fn(),
  getRun: vi.fn(),
  refreshRun: vi.fn(),
}

function runDto(id: number, status: string, failureReason = '') {
  return buildScreeningRun(id, status, { failureReason }).toDomain().toDto()
}

async function mountPanel() {
  const wrapper = mount(SymbolScreeningRunPanel, {
    props: {
      symbolScreeningApplication: applicationMock as unknown as InstanceType<typeof SymbolScreeningRunPanel>['$props']['symbolScreeningApplication'],
      timeZone: buildTimeZone(),
    },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SymbolScreeningRunPanel', () => {
  it('lists runs with status, progress and the failure reason', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(2, 'queued'), runDto(1, 'failed', '超過時間上限')])
    const wrapper = await mountPanel()

    const rows = wrapper.findAll('[data-testid="symbol-screening-run"]')
    expect(rows.map(row => row.get('[data-testid="symbol-screening-run-status"]').text())).toEqual(['排隊中', '失敗'])
    expect(rows[0]?.get('[data-testid="symbol-screening-run-progress"]').text()).toBe('0／2')
    expect(rows[1]?.get('[data-testid="symbol-screening-run-failure-reason"]').text()).toBe('超過時間上限')
  })

  it('offers cancel only while a run has not ended', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(2, 'queued'), runDto(1, 'succeeded')])
    const wrapper = await mountPanel()

    const rows = wrapper.findAll('[data-testid="symbol-screening-run"]')
    expect(rows.map(row => row.find('[data-testid="symbol-screening-run-cancel"]').exists())).toEqual([true, false])
  })

  it('cancels a queued run and drops its cancel button', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(2, 'queued')])
    applicationMock.cancelRun.mockResolvedValue(runDto(2, 'cancelled'))
    const wrapper = await mountPanel()

    await wrapper.get('[data-testid="symbol-screening-run-cancel"]').trigger('click')
    await flushPromises()

    expect(applicationMock.cancelRun).toHaveBeenCalledWith(2)
    expect(wrapper.get('[data-testid="symbol-screening-run-status"]').text()).toBe('已取消')
    expect(wrapper.find('[data-testid="symbol-screening-run-cancel"]').exists()).toBe(false)
  })

  it('puts a just-submitted run on top', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'succeeded')])
    const wrapper = await mountPanel()

    await wrapper.setProps({ submittedRun: runDto(2, 'queued') })

    expect(wrapper.findAll('[data-testid="symbol-screening-run-status"]').map(status => status.text()))
      .toEqual(['排隊中', '完成'])
  })

  it('says why the history could not be read', async () => {
    applicationMock.listRuns.mockRejectedValue(new Error('讀不到'))
    const wrapper = await mountPanel()

    expect(wrapper.get('[data-testid="symbol-screening-runs-failure"]').text()).toBe('讀不到')
  })

  it('leaves the history alone when the submitted run is cleared', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'succeeded')])
    const wrapper = await mountPanel()
    await wrapper.setProps({ submittedRun: runDto(2, 'queued') })

    await wrapper.setProps({ submittedRun: null })

    expect(wrapper.findAll('[data-testid="symbol-screening-run"]')).toHaveLength(2)
  })

  it('says there are no runs yet', async () => {
    applicationMock.listRuns.mockResolvedValue([])
    const wrapper = await mountPanel()

    expect(wrapper.find('[data-testid="symbol-screening-runs-empty"]').exists()).toBe(true)
  })

  it('opens a run and cancels it from its details', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(2, 'running')])
    applicationMock.getRun
      .mockResolvedValueOnce(buildRunDetail(buildScreeningRun(2, 'running'), [buildCandidate('LINKUSDT', 'processing')]).toDto())
      .mockResolvedValueOnce(buildRunDetail(buildScreeningRun(2, 'cancelled'), [buildCandidate('LINKUSDT', 'cancelled')]).toDto())
    applicationMock.cancelRun.mockResolvedValue(runDto(2, 'cancelled'))
    const wrapper = await mountPanel()

    await wrapper.get('[data-testid="symbol-screening-run-open"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="symbol-screening-run-detail-cancel"]').trigger('click')
    await flushPromises()

    expect(applicationMock.cancelRun).toHaveBeenCalledWith(2)
    expect(wrapper.get('[data-testid="symbol-screening-run-detail-status"]').text()).toBe('已取消')
    expect(wrapper.find('[data-testid="symbol-screening-run-detail-cancel"]').exists()).toBe(false)
  })
})
