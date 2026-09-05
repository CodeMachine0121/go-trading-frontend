import type { BacktestApplication } from '~/application/backtest-application'
import type { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { BacktestField } from '~/domain/errors/backtest-field-error'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 最近那一次回測：跑完了沒有、結果是什麼，以及**哪一種**失敗。
 *
 * 這一整組東西的不變式只有一條：**一次回測只會留下其中一樣**。上一次的成績單與
 * 這一次的錯誤不會同時掛在畫面上——那會讓人讀著一段已經不成立的成績。
 *
 * 它與指標預覽那一支是各自獨立的兩個，儘管形狀相似。兩個去處同時活著，
 * 共用一個就代表切過去會看到別人的結果；而它們的失敗種類本來就不同——
 * 回測沒有「要看多長」那一格，卻有本金與押注那兩格。
 */
export function useBacktestRun(backtestApplication: BacktestApplication) {
  const running = ref(false)
  const result = ref<BacktestResultDto | null>(null)
  const fieldError = ref<{ field: BacktestField, message: string } | null>(null)
  const requestRejectedMessage = ref<string | null>(null)
  const scriptFailedMessage = ref<string | null>(null)
  /** 算式取用了一個沒有宣告的旋鈕名字。它與「算式跑不動」是兩件事。 */
  const parameterNotDeclaredMessage = ref<string | null>(null)
  const backendUnreachable = ref(false)
  const serverErrorMessage = ref<string | null>(null)

  /**
   * 把上一次留下的東西全部清掉。
   *
   * 換了一份算式時也要呼叫它：上一次那次回測與畫面上這一份已經無關了，
   * 留著會出現對不上的畫面——算式已經是新的，底下卻還攤著上一支的成績單。
   */
  function clear() {
    result.value = null
    fieldError.value = null
    requestRejectedMessage.value = null
    scriptFailedMessage.value = null
    parameterNotDeclaredMessage.value = null
    serverErrorMessage.value = null
    backendUnreachable.value = false
  }

  /** 這個欄位有沒有被指出問題——沒有就是 `null`。 */
  function messageFor(field: BacktestField): string | null {
    return fieldError.value?.field === field ? fieldError.value.message : null
  }

  /**
   * 跑一次。
   *
   * 收的是「怎麼組出那份請求」而不是組好的請求，因為**組裝本身就會失敗**——
   * 起點晚於終點、本金不是大於零的數，都是在組裝那一刻才知道的。
   * 請求先在外面組好，那些失敗就落在這裡的 try 之外，於是畫面上什麼都不會說。
   */
  async function run(buildRequest: () => BacktestRequestDto) {
    running.value = true
    clear()

    try {
      result.value = await backtestApplication.runBacktest(buildRequest())
    }
    catch (error: unknown) {
      if (error instanceof StrategyParameterNotDeclaredError) {
        parameterNotDeclaredMessage.value = error.message
      }
      else if (error instanceof BacktestFieldError) {
        fieldError.value = { field: error.field, message: error.message }
      }
      else if (error instanceof IndicatorScriptFailedError) {
        scriptFailedMessage.value = error.message
      }
      else if (error instanceof BackendServerError) {
        serverErrorMessage.value = error.message
      }
      else if (error instanceof BackendRequestRejectedError) {
        requestRejectedMessage.value = error.message
      }
      else if (error instanceof BackendUnreachableError) {
        backendUnreachable.value = true
      }
      else {
        requestRejectedMessage.value = '執行回測時發生未預期的錯誤。'
      }
    }
    finally {
      running.value = false
    }
  }

  return {
    running,
    result,
    requestRejectedMessage,
    scriptFailedMessage,
    parameterNotDeclaredMessage,
    backendUnreachable,
    serverErrorMessage,
    messageFor,
    clear,
    run,
  }
}
