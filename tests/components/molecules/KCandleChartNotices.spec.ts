import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleChartNotices from '~/components/molecules/KCandleChartNotices.vue'
import { LiveUpdateNoticeVo } from '~/domain/models/vo/live-update-notice-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const STALLED = new LiveUpdateNoticeVo('stalled', 'warning')
const shown = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('[data-testid$="-alert"]').map(alert => alert.attributes('data-testid'))

describe('圖的狀態說明', () => {
  it('即時更新的那一句與載入中同時存在：即時更新那一則在上', () => {
    const wrapper = mount(KCandleChartNotices, {
      props: { liveUpdateNotice: STALLED, liveUpdateMessage: '即時更新停了', loading: true },
    })

    expect(shown(wrapper)).toEqual(['live-update-stalled-alert', 'loading-alert'])
  })

  it('取行情那一組一次只說一句：被拒絕勝過連不上與載入中', () => {
    const wrapper = mount(KCandleChartNotices, {
      props: {
        rejectedMessage: new LocalizedTextVo('時間區間過大', 'Range too large'),
        unreachableExplanation: new LocalizedTextVo('連不上後端', 'Unreachable'),
        loading: true,
      },
    })

    expect(shown(wrapper)).toEqual(['rejected-alert'])
  })

  it.each([
    ['server-error-alert', new LocalizedTextVo('讀取 K 線失敗', 'Failed'), null],
    ['unreachable-alert', null, new LocalizedTextVo('連不上後端', 'Unreachable')],
  ])('%s 附「重試」，按下去交出重試', async (testId, serverErrorMessage, unreachableExplanation) => {
    const wrapper = mount(KCandleChartNotices, { props: { serverErrorMessage, unreachableExplanation } })

    await wrapper.get(`[data-testid="${testId}"] button`).trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('什麼事都沒有時什麼都不說', () => {
    expect(shown(mount(KCandleChartNotices))).toEqual([])
  })
})
