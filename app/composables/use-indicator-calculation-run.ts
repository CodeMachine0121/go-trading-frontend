import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorCalculationResultDto } from '~/domain/models/dto/indicator-calculation-result-dto'
import type { IndicatorCalculationField } from '~/domain/errors/indicator-calculation-field-error'
import { IndicatorCalculationFieldError } from '~/domain/errors/indicator-calculation-field-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 最近那一次計算：跑完了沒有、結果是什麼，以及**哪一種**失敗。
 *
 * 這一整組東西的不變式只有一條：**一次計算只會留下其中一樣**。
 * 它們散在面板上的時候，那條不變式只能靠一個「記得每一樣都要清掉」的函式維持——
 * 而少清一個不會有任何地方報錯，只會在畫面上留下一句屬於上一次的紅字。
 * 收在這裡之後，「重跑」與「清掉」是同一件事的兩面，沒有人有機會漏掉。
 *
 * 分開這幾種失敗的判準只有一個：**使用者接下來要去改哪裡**。
 * 名字對不上要去改參數那一列或算式那一行；算式跑不動要去改算法本身。
 * 把前者說成後者，會讓人盯著一段其實沒有問題的程式碼看很久。
 */
export function useIndicatorCalculationRun(
  indicatorCalculationApplication: IndicatorCalculationApplication,
) {
  const calculating = ref(false)
  const result = ref<IndicatorCalculationResultDto | null>(null)
  const fieldError = ref<{ field: IndicatorCalculationField, message: string } | null>(null)
  const requestRejectedMessage = ref<string | null>(null)
  const scriptFailedMessage = ref<string | null>(null)
  /** 算式取用了一個沒有宣告的旋鈕名字。它與「算式跑不動」是兩件事。 */
  const parameterNotDeclaredMessage = ref<string | null>(null)
  const backendUnreachable = ref(false)
  const serverErrorMessage = ref<string | null>(null)

  /**
   * 把上一次留下的東西全部清掉。
   *
   * 換了一份算式時也要呼叫它：上一次那次計算與畫面上這一份已經無關了，
   * 留著會出現對不上的畫面——欄位已經是新的，旁邊卻還紅著上一次那句話。
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
  function messageFor(field: IndicatorCalculationField): string | null {
    return fieldError.value?.field === field ? fieldError.value.message : null
  }

  /**
   * 跑一次。
   *
   * 收的是「怎麼組出那份請求」而不是組好的請求，因為**組裝本身就會失敗**——
   * 「要看多長」不合理是在組裝那一刻才知道的。請求先在外面組好，
   * 那一種失敗就落在這裡的 try 之外，於是畫面上什麼都不會說。
   */
  async function run(buildRequest: () => IndicatorCalculationRequestDto) {
    calculating.value = true
    clear()

    try {
      result.value = await indicatorCalculationApplication.calculateIndicator(buildRequest())
    }
    catch (error: unknown) {
      if (error instanceof StrategyParameterNotDeclaredError) {
        parameterNotDeclaredMessage.value = error.message
      }
      else if (error instanceof IndicatorCalculationFieldError) {
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
        requestRejectedMessage.value = '執行計算時發生未預期的錯誤。'
      }
    }
    finally {
      calculating.value = false
    }
  }

  return {
    calculating,
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
