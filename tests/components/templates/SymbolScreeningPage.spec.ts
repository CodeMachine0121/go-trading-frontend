// @vitest-environment nuxt
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SymbolScreeningPage from '~/components/templates/SymbolScreeningPage.vue'
import { SymbolScreeningService } from '~/domain/service/symbol-screening-service'
import type { ISymbolScreeningProxy } from '~/domain/interface/i-symbol-screening-proxy'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import { buildScreeningProfile, buildScreeningRun } from '../../fixtures/symbol-screening'
import { buildTimeZone } from '../../fixtures/time-zone'

const optionSource = new SymbolScreeningService({} as ISymbolScreeningProxy, {} as IStrategyScriptProxy)

const applicationMock = {
  listAggregationIntervalOptions: vi.fn(() => optionSource.listAggregationIntervalOptions()),
  listTradingModeOptions: vi.fn(() => optionSource.listTradingModeOptions()),
  listProfiles: vi.fn(),
  listScreenableStrategyScripts: vi.fn(),
  listRuns: vi.fn(),
  refreshRuns: vi.fn(),
}

async function mountPage(isAdministrator: boolean) {
  const wrapper = mount(SymbolScreeningPage, {
    props: {
      symbolScreeningApplication: applicationMock as unknown as InstanceType<typeof SymbolScreeningPage>['$props']['symbolScreeningApplication'],
      timeZone: buildTimeZone(),
      isAdministrator,
    },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  applicationMock.listProfiles.mockResolvedValue([buildScreeningProfile(1, '趨勢 V3')])
  applicationMock.listScreenableStrategyScripts.mockResolvedValue([])
  applicationMock.listRuns.mockResolvedValue([buildScreeningRun(12, 'succeeded').toDomain().toDto()])
})

describe('SymbolScreeningPage', () => {
  it('tells someone who is not an administrator that this is an administrator feature', async () => {
    const wrapper = await mountPage(false)

    expect(wrapper.get('[data-testid="symbol-screening-administrator-only"]').text()).toBe('這是管理員功能')
    expect(wrapper.findAll('button')).toHaveLength(0)
    expect(applicationMock.listProfiles).not.toHaveBeenCalled()
    expect(applicationMock.listRuns).not.toHaveBeenCalled()
  })

  it('shows an administrator their profiles and runs', async () => {
    const wrapper = await mountPage(true)

    expect(wrapper.find('[data-testid="symbol-screening-administrator-only"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="symbol-screening-profile-title"]').text()).toBe('趨勢 V3')
    expect(wrapper.findAll('[data-testid="symbol-screening-run"]')).toHaveLength(1)
  })

  it('puts a just-submitted screening on top of the history', async () => {
    const wrapper = await mountPage(true)

    await wrapper.getComponent({ name: 'SymbolScreeningSubmitPanel' })
      .vm.$emit('submitted', buildScreeningRun(13, 'queued').toDomain().toDto())
    await flushPromises()

    expect(wrapper.findAll('[data-testid="symbol-screening-run-status"]').map(status => status.text()))
      .toEqual(['排隊中', '完成'])
  })
})
