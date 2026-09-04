import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IndicatorScalarValue } from '~/domain/models/vo/indicator-value-vo'
import { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const INDICATOR_CALCULATIONS_ENDPOINT = '/indicator-calculations'

/** 後端用這個狀態碼表示「請求沒問題，是算式跑不起來」。只有這裡需要知道這件事。 */
const SCRIPT_FAILED_STATUS = 422

/**
 * 後端指名這一格時用的詞彙。它說的是「根數」——那是它的量詞；
 * 這個畫面把同一件事畫成「要看多長」，所以翻譯發生在這裡。
 * 後端沒有理由知道畫面把它畫成了什麼。
 */
const CANDLE_COUNT_FIELD = 'candleCount'

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
            // 宣告與這一次的值分兩份送：系統要先知道這支算式**宣告**了哪些名字，
            // 才有辦法在算式取用一個沒宣告的名字時指名說出是哪一個。
            //
            // 兩份都永遠送出去，空的也送——「一個都沒宣告」與「忘了送」
            // 在收的那一端長得一模一樣，而後者曾經真的發生過：
            // 少了這兩行，每一次計算都收到零個參數，於是算式裡**第一個**
            // 取用參數的那一行失敗，看起來像宣告的順序有影響。
            parameters: indicatorCalculationRequestDomain.parameters.all.map(parameter => ({
              name: parameter.name,
              kind: parameter.kind,
              defaultValue: parameter.value,
            })),
            parameterValues: indicatorCalculationRequestDomain.parameters.all.map(parameter => ({
              name: parameter.name,
              value: parameter.value,
            })),
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
      // 名字對不上先問：它與「算式跑不動」都是被拒絕，但使用者要去改的地方完全不同。
      // 判準是回應帶回來的那個欄位，不是訊息的文字——文字是寫給人看的。
      if (error instanceof BackendRequestRejectedError && error.parameterName !== undefined) {
        throw new StrategyParameterNotDeclaredError(
          error.parameterName, error.message, { cause: error })
      }

      // 要的太多了：這一種拒絕有兩條具體的出路，所以它要落在使用者改得動的那一格旁邊，
      // 而不是變成一則籠統的「請求的問題」——後者說了什麼都對，卻指不出下一步。
      if (error instanceof BackendRequestRejectedError && error.field === CANDLE_COUNT_FIELD) {
        throw new IndicatorCalculationFieldError(
          'span',
          `${error.message}。請縮短要看的區間，或換粗一點的彙總刻度。`,
          { cause: error })
      }

      if (error instanceof BackendRequestRejectedError && error.status === SCRIPT_FAILED_STATUS) {
        throw new IndicatorScriptFailedError(error.message, { cause: error })
      }

      throw error
    }
  }
}
