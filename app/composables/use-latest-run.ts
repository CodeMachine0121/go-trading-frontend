import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'
import { StrategyParameterNotDeclaredError } from '~/domain/errors/strategy-parameter-not-declared-error'

/**
 * 一種「這次拒絕是關於哪一格」的錯誤。
 *
 * 收的是那個類別本身而不是一個判斷函式：`instanceof` 由這裡做，呼叫端只要說出
 * 它的錯誤長什麼樣，那一格的名字也就跟著被型別擋住了——問一個不存在的欄位不會編譯過。
 */
type FieldErrorType<TField extends string> = new (
  field: TField, message: string, options?: { cause?: unknown },
) => Error & { field: TField }

/**
 * 最近那一次送出去的事情：跑完了沒有、結果是什麼，以及**哪一種**失敗。
 *
 * 這一整組東西的不變式只有一條：**一次執行只會留下其中一樣**。它們散在畫面上的時候，
 * 那條不變式只能靠一個「記得每一樣都要清掉」的函式維持——而少清一個不會有任何地方報錯，
 * 只會在畫面上留下一句屬於上一次的紅字。收在這裡之後，「重跑」與「清掉」是同一件事的兩面。
 *
 * 分開這幾種失敗的判準只有一個：**使用者接下來要去改哪裡**。
 * 名字對不上要去改參數那一列或算式那一行；算式跑不動要去改算法本身；
 * 後端自己壞了則是誰都不必改，等一下再試。把其中兩種說成同一種，
 * 會讓人盯著一段其實沒有問題的東西看很久。
 *
 * 指標計算與回測共用它。兩者在畫面上是各自獨立的兩次執行（同時活著，
 * 共用一份就代表切過去會看到別人的結果），但**這五種失敗與那條不變式一模一樣**——
 * 各寫一份，哪天多一種失敗，只有其中一邊認得它。
 */
export function useLatestRun<TResult, TField extends string>(
  fieldErrorType: FieldErrorType<TField>,
  unexpectedMessage: string,
) {
  const running = ref(false)
  const result = ref<TResult | null>(null) as Ref<TResult | null>
  const fieldError = ref<{ field: TField, message: string } | null>(null)
  const requestRejectedMessage = ref<string | null>(null)
  const scriptFailedMessage = ref<string | null>(null)
  /** 算式取用了一個沒有宣告的旋鈕名字。它與「算式跑不動」是兩件事。 */
  const parameterNotDeclaredMessage = ref<string | null>(null)
  const backendUnreachable = ref(false)
  const serverErrorMessage = ref<string | null>(null)

  /**
   * 把上一次留下的東西全部清掉。
   *
   * 換了一份算式時也要呼叫它：上一次那次執行與畫面上這一份已經無關了，
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
  function messageFor(field: TField): string | null {
    return fieldError.value?.field === field ? fieldError.value.message : null
  }

  /**
   * 跑一次。
   *
   * 收的是「怎麼做這件事」而不是做好的結果，因為**組裝那份請求本身就會失敗**——
   * 起點晚於終點、本金不是大於零的數，都是在組裝那一刻才知道的。
   * 請求先在外面組好，那一種失敗就落在這裡的 try 之外，於是畫面上什麼都不會說。
   */
  async function run(execute: () => Promise<TResult>) {
    running.value = true
    clear()

    try {
      result.value = await execute()
    }
    catch (error: unknown) {
      if (error instanceof StrategyParameterNotDeclaredError) {
        parameterNotDeclaredMessage.value = error.message
      }
      else if (error instanceof fieldErrorType) {
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
        requestRejectedMessage.value = unexpectedMessage
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
