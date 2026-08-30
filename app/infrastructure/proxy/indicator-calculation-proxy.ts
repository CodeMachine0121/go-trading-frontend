import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const INDICATOR_CALCULATIONS_ENDPOINT = '/indicator-calculations'

/** 後端用這個狀態碼表示「請求沒問題，是算式跑不起來」。只有這裡需要知道這件事。 */
const SCRIPT_FAILED_STATUS = 422

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內。
 * values 的鍵是算式自己決定的指標名稱，因此是一組動態的名稱對數值；
 * 算式什麼都沒放進結果時它可能整個是空的（`null`），那仍是一次成功的計算。
 */
type IndicatorCalculationWire = {
  symbol: string
  usedCandleCount: number
  values: Record<string, number> | null
}

/** Proxy：打指標計算端點，並把「算式的問題」從一般的拒絕裡分出來。 */
export class IndicatorCalculationProxy extends BackendApiProxy implements IIndicatorCalculationProxy {
  async calculateIndicator(
    indicatorCalculationRequestDomain: IndicatorCalculationRequestDomain,
  ): Promise<IndicatorCalculation> {
    try {
      const wire = await this.requestBackend<IndicatorCalculationWire>(
        INDICATOR_CALCULATIONS_ENDPOINT,
        {
          method: 'POST',
          body: {
            symbol: indicatorCalculationRequestDomain.symbol,
            candleCount: indicatorCalculationRequestDomain.candleCount,
            script: indicatorCalculationRequestDomain.script,
          },
        },
      )

      return new IndicatorCalculation(
        wire.symbol,
        wire.usedCandleCount,
        Object.entries(wire.values ?? {}).map(
          ([name, value]) => new IndicatorValueVo(name, value)),
      )
    }
    catch (error: unknown) {
      // 狀態碼只在這一層被解讀：算式跑不起來與請求本身有問題，使用者要改的東西不同。
      if (error instanceof BackendRequestRejectedError && error.status === SCRIPT_FAILED_STATUS) {
        throw new IndicatorScriptFailedError(error.message, { cause: error })
      }

      throw error
    }
  }
}
