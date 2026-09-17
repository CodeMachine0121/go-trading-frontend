import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { StrategyScriptParameterDto, StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'

/**
 * 一支算式的旋鈕在畫面上的**狀態**：宣告了哪幾個，以及每一列該長什麼樣子。
 *
 * **它不做任何業務判斷**——「回看根數要整數鍵盤」「名稱不得重複」一律問 Application。
 * 它持有的是狀態，不是規則。
 *
 * 把這一組從面板搬出來的理由，與 useStrategyScriptLibrary 相同：改一列旋鈕本來要
 * 「讀出整份、交給 Application、把回傳寫回去」三步，而那三步在面板裡重複了五次。
 * 現在那個順序住在它操作的資料旁邊，面板只說使用者按了什麼。
 */
export function useStrategyScriptParameters(
  indicatorCalculationApplication: IndicatorCalculationApplication,
  initialParameters: readonly StrategyScriptParameterDto[],
) {
  const parameters = ref<readonly StrategyScriptParameterDto[]>(initialParameters)

  const fields = computed(
    () => indicatorCalculationApplication.describeStrategyScriptParameters(parameters.value))
  const kindOptions = indicatorCalculationApplication.listStrategyScriptParameterKindOptions()

  function replaceAll(replacement: readonly StrategyScriptParameterDto[]) {
    parameters.value = replacement
  }

  function add() {
    parameters.value = indicatorCalculationApplication.addStrategyScriptParameter(parameters.value)
  }

  function remove(index: number) {
    parameters.value = indicatorCalculationApplication.removeStrategyScriptParameter(
      parameters.value, index)
  }

  function rename(index: number, name: string) {
    parameters.value = indicatorCalculationApplication.renameStrategyScriptParameter(
      parameters.value, index, name)
  }

  function changeKind(index: number, kind: StrategyScriptParameterKind) {
    parameters.value = indicatorCalculationApplication.changeStrategyScriptParameterKind(
      parameters.value, index, kind)
  }

  function changeValue(index: number, value: number) {
    parameters.value = indicatorCalculationApplication.changeStrategyScriptParameterValue(
      parameters.value, index, value)
  }

  return {
    parameters,
    fields,
    kindOptions,
    replaceAll,
    add,
    remove,
    rename,
    changeKind,
    changeValue,
  }
}
