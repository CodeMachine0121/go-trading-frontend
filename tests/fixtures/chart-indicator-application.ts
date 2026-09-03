import { vi } from 'vitest'
import { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'

/**
 * 指標計算來自後端、線色偏好來自瀏覽器儲存，只 mock 這兩個介面；
 * application、domain service 與所有 domain model 都是真的。
 *
 * 預設沒挑過任何顏色——既有的測試因此不會因為儲存裡剛好有東西而改變行為。
 */
export function buildChartIndicatorApplication(
  indicatorCalculationProxy: Partial<IIndicatorCalculationProxy> = {},
  chartLineColorPreferenceProxy: Partial<IChartLineColorPreferenceProxy> = {},
): ChartIndicatorApplication {
  return new ChartIndicatorApplication(new ChartIndicatorService(
    { calculateIndicator: vi.fn(), ...indicatorCalculationProxy },
    {
      readColorToken: vi.fn().mockReturnValue(null),
      writeColorToken: vi.fn(),
      ...chartLineColorPreferenceProxy,
    },
  ))
}
