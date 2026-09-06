import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorCalculationField } from '~/domain/errors/indicator-calculation-field-error'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { useLatestRun } from '~/composables/use-latest-run'

/**
 * 最近那一次計算。
 *
 * 「跑完了沒有」在這裡叫 `calculating`：這一頁上還有一個「重演中」，
 * 兩者同時出現在同一段程式碼裡時，一個叫 running 的東西是哪一個並不明顯。
 */
export function useIndicatorCalculationRun(
  indicatorCalculationApplication: IndicatorCalculationApplication,
) {
  const latestRun = useLatestRun<IndicatorCalculationResultDto, IndicatorCalculationField>(
    IndicatorCalculationFieldError, '執行計算時發生未預期的錯誤。')

  return {
    ...latestRun,
    calculating: latestRun.running,
    /** 收的是「怎麼組出那份請求」——組裝本身就會失敗，所以它要落在 try 裡面。 */
    run: (buildRequest: () => IndicatorCalculationRequestDto) =>
      latestRun.run(() => indicatorCalculationApplication.calculateIndicator(buildRequest())),
  }
}
