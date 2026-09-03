import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorScalarValue } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const INDICATOR_CALCULATIONS_ENDPOINT = '/indicator-calculations'

/** 後端用這個狀態碼表示「請求沒問題，是算式跑不起來」。只有這裡需要知道這件事。 */
const SCRIPT_FAILED_STATUS = 422

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內。
 * values 的鍵是算式自己決定的指標名稱，值的形狀則跟著這次的指標值種類走——
 * 一個數字、一串數字、一個是非，或一串是非；
 * 算式什麼都沒放進結果時它可能整個是空的（`null`），那仍是一次成功的計算。
 */
type IndicatorWireValue = number | number[] | boolean | boolean[]

type IndicatorCalculationWire = {
  symbol: string
  interval: string
  usedCandleCount: number
  /** 這次讀了哪幾根，由早到晚；後端一律以世界標準時間的字串給。 */
  openTimes: string[] | null
  resultType: string
  values: Record<string, IndicatorWireValue> | null
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
            aggregationInterval: indicatorCalculationRequestDomain.aggregationInterval.value,
            candleCount: indicatorCalculationRequestDomain.candleCount,
            // 省略等同「算到現在」，那正是沒指定時後端的預設，因此不必送一個假的現在。
            ...(indicatorCalculationRequestDomain.endTime === null
              ? {}
              : { endTime: indicatorCalculationRequestDomain.endTime.toISOString() }),
            resultType: indicatorCalculationRequestDomain.resultType.value,
            script: indicatorCalculationRequestDomain.script,
          },
        },
      )

      return new IndicatorCalculation(
        wire.symbol,
        wire.interval,
        wire.usedCandleCount,
        wire.resultType,
        // 一個值與一串值在 domain 裡存法相同，差別由這次的種類決定，
        // 所以單獨一個值在這裡就被收成長度一的那一串。
        Object.entries(wire.values ?? {}).map(([name, value]) => new IndicatorValueVo(
          name,
          Array.isArray(value) ? (value as IndicatorScalarValue[]) : [value])),
        (wire.openTimes ?? []).map(openTime => new Date(openTime)),
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
