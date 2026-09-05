import type { BacktestApplication } from '~/application/backtest-application'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { useLatestRun } from '~/composables/use-latest-run'

/**
 * 最近那一次回測。
 *
 * 它與指標預覽那一支是**各自獨立的兩個**，儘管形狀相同：兩個去處同時活著，
 * 共用一份就代表切過去會看到別人的結果。共用的是那五種失敗與「一次只留一樣」，
 * 不是那一次執行本身。
 */
export function useBacktestRun(backtestApplication: BacktestApplication) {
  const latestRun = useLatestRun<BacktestResultDto, BacktestField>(
    BacktestFieldError, '執行回測時發生未預期的錯誤。')

  return {
    ...latestRun,
    /** 收的是「怎麼組出那份請求」——組裝本身就會失敗，所以它要落在 try 裡面。 */
    run: (buildRequest: () => BacktestRequestDto) =>
      latestRun.run(() => backtestApplication.runBacktest(buildRequest())),
  }
}
