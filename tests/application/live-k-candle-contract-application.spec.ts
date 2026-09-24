import { describe, expect, it } from 'vitest'
import { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'
import { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { aggregationIntervalOf } from '~/domain/models/vo/aggregation-interval-vo'
import { buildLiveKCandleContractApplication } from '../fixtures/live-k-candle-application'
import { AUTOMATIC_AGGREGATION_INTERVAL_CHOICE } from '../fixtures/aggregation-interval-choice'

/** 一張沒有 K 線的圖：這幾個問句只問提示，不看圖上有什麼。 */
const aChart = new KCandleChartDto(
  'BTCUSDT', aggregationIntervalOf('15m'),
  new Date('2026-09-23T00:00:00.000Z'), new Date('2026-09-23T12:00:00.000Z'),
  [], AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
)

describe('合約圖表上該說哪一句', () => {
  const application = buildLiveKCandleContractApplication()

  it('不在合約追蹤名單上蓋過即時更新已停止：一次只說一句，說等多久都一樣的那一句', () => {
    const notice = application.liveUpdateNotice(
      new ContractTradingSymbolDto('DOGEUSDT', false), new LiveKCandleReportDto(aChart, false, true))

    expect(notice?.value).toBe('noLivePlace')
  })

  it('名單上的、斷了就說已停止', () => {
    const notice = application.liveUpdateNotice(
      new ContractTradingSymbolDto('BTCUSDT', true), new LiveKCandleReportDto(aChart, false, true))

    expect(notice?.value).toBe('stalled')
  })

  it('不知道在不在名單上、也還沒有任何更新時什麼都不說', () => {
    expect(application.liveUpdateNotice(null, null)).toBeNull()
  })

  it('一則帶著 K 線的更新比清單上那一份新：跟得動就不說不在名單上', () => {
    const notice = application.liveUpdateNotice(
      new ContractTradingSymbolDto('DOGEUSDT', false), new LiveKCandleReportDto(aChart, false, false))

    expect(notice).toBeNull()
  })
})
