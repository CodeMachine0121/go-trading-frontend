import type { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'

/**
 * 圖表上「已套用的指標」這一塊的**狀態**：誰在清單上、誰正在算、誰失敗了、算出哪幾條線。
 *
 * **它不做任何業務判斷**——一個數字畫成什麼、線是什麼顏色、值怎麼對回 K 線，
 * 一律問 Application。它持有的是狀態，不是規則。
 *
 * 清單刻意**不留存**：每次坐下來想看的東西都不同，記住它反而礙事。
 * 被記住的只有顏色，而那由領域那一側負責。
 */
export function useChartIndicators(chartIndicatorApplication: ChartIndicatorApplication) {
  /** 已套用的那幾支，依加入的順序。順序決定沒挑過顏色時誰先拿到哪個顏色。 */
  const appliedStrategies = ref<StrategyDto[]>([])
  /** 算成功的那幾支該畫的線。失敗與計算中的不在裡面——圖上就不會有它們。 */
  const chartIndicators = ref<ChartIndicatorDto[]>([])
  const calculatingStrategyIds = ref<number[]>([])
  /** 每一支各自的失敗說明。一支失敗只標在它自己旁邊，其他支照常畫。 */
  const failureMessages = ref<Map<number, string>>(new Map())

  /** 上一次拿來算的那批 K 線。重算一律照它，因此線與圖上的 K 線是同一段行情。 */
  const lastChart = shallowRef<KCandleChartDto | null>(null)

  /**
   * 每一支各自的「這是第幾次要求」。回來的結果只有在它仍是那一支最新的一次時才採用。
   *
   * 圖表本身早就有同一套（`latestRequestNumber`），理由也一模一樣：
   * 使用者按一下、還沒回來又按一下時，先送出的那次可能後回來。指標更需要它——
   * BTC→ETH→BTC 之間，慢的 ETH 回應會蓋掉較新的 BTC 結果，
   * 把**另一檔的值**畫在圖上，而且不會有任何錯誤。
   *
   * 移除一支時也把它的號碼往前推：在飛的那一次回來時就認不得自己了，
   * 因此不會把一條已經被移除的線加回圖上——那條線會留在圖上，
   * 而清單上已經沒有那一列可以再移除它。
   */
  const requestNumbers = new Map<number, number>()

  function nextRequestNumber(strategyId: number): number {
    const requestNumber = (requestNumbers.get(strategyId) ?? 0) + 1
    requestNumbers.set(strategyId, requestNumber)

    return requestNumber
  }

  function isLatestRequest(strategyId: number, requestNumber: number): boolean {
    return requestNumbers.get(strategyId) === requestNumber
  }

  const colorOptions = chartIndicatorApplication.listChartLineColorOptions()

  /** 還可以挑的策略：已經在圖上的那幾支不再出現。 */
  function selectableStrategies(strategies: readonly StrategyDto[]): StrategyDto[] {
    return strategies.filter(strategy => !appliedStrategies.value.some(
      applied => applied.id === strategy.id))
  }

  function isCalculating(strategyId: number): boolean {
    return calculatingStrategyIds.value.includes(strategyId)
  }

  function failureMessageOf(strategyId: number): string | null {
    return failureMessages.value.get(strategyId) ?? null
  }

  /** 加一支上來，並立刻對圖上那批 K 線算一次——不必再按任何按鈕。 */
  async function applyStrategy(strategy: StrategyDto) {
    if (appliedStrategies.value.some(applied => applied.id === strategy.id)) {
      return
    }

    appliedStrategies.value = [...appliedStrategies.value, strategy]
    await calculateOne(strategy)
  }

  /** 移除一支：它的線、它的失敗說明、它在清單上的位置一起消失。 */
  function removeStrategy(strategyId: number) {
    // 往前推一號：正在飛的那一次回來時已經不是最新的，於是它算出來的線不會被加回去。
    nextRequestNumber(strategyId)
    appliedStrategies.value = appliedStrategies.value.filter(
      applied => applied.id !== strategyId)
    chartIndicators.value = chartIndicators.value.filter(
      indicator => indicator.strategyId !== strategyId)
    forgetFailure(strategyId)
  }

  /**
   * 圖上換了一批 K 線，每一支都重算一次——包含上次算失敗的那幾支。
   *
   * 失敗多半是暫時的（這一段區間根數不夠，換一段就夠了），
   * 所以它們留在清單上，換了資料就再試一次。
   */
  /**
   * 圖上換了一批 K 線，每一支都重算一次——包含上次算失敗的那幾支。
   *
   * **一支一支來，不並行。** 沒挑過顏色的線是從「目前沒被用掉的」裡面依序取的，
   * 而「已經用掉的」只看得到已經算完的那幾支：一起送出去的話，它們會全部拿到同一個顏色，
   * 那正是顏色要解決的問題。一支一支來讓配色變成確定的，代價是幾支就是幾趟——
   * 同時掛著的指標數量由使用者自己控制，這個代價換一個看得懂的畫面很划算。
   */
  async function recalculateAll(chart: KCandleChartDto) {
    lastChart.value = chart

    for (const strategy of appliedStrategies.value) {
      await calculateOne(strategy)
    }
  }

  /**
   * 圖沒了（取行情失敗、查無資料），線也留不得。
   *
   * 已套用的清單留著——使用者沒有取消掛任何一支，等圖回來它們會跟著重算。
   * 但那幾條線畫的是**上一批**行情：留在一張空圖上，它們不只看起來是錯的，
   * 還會繼續撐著價格軸。
   */
  function clearLines() {
    chartIndicators.value = []
  }

  /** 換一條線的顏色。圖上立刻換，不重算——算出來的值一個字都不會變。 */
  function changeLineColor(lineKey: string, colorToken: string) {
    chartIndicators.value = chartIndicatorApplication.changeChartLineColor(
      chartIndicators.value, lineKey, colorToken)
  }

  async function calculateOne(strategy: StrategyDto) {
    const chart = lastChart.value
    // 圖上還沒有任何 K 線（系統沒起來、查無資料）：沒有東西可以算。
    if (chart === null || chart.isEmpty) {
      return
    }

    const requestNumber = nextRequestNumber(strategy.id)
    calculatingStrategyIds.value = [...calculatingStrategyIds.value, strategy.id]
    forgetFailure(strategy.id)

    try {
      const calculated = await chartIndicatorApplication.calculateChartIndicator(
        new ChartIndicatorRequestDto(
          strategy,
          chart.symbol,
          chart.interval.value,
          chart.count,
          chart.coveredEndTime,
          takenColorTokensExcept(strategy.id),
        ))

      // 這一次已經不是那一支最新的要求了（使用者又換了一次標的，或已經把它移除）：
      // 這份結果講的是另一段行情，採用它就是在圖上畫一條沒有人要求過的線。
      if (!isLatestRequest(strategy.id, requestNumber)) {
        return
      }

      chartIndicators.value = [
        ...chartIndicators.value.filter(indicator => indicator.strategyId !== strategy.id),
        calculated,
      ]
    }
    catch (error: unknown) {
      if (!isLatestRequest(strategy.id, requestNumber)) {
        return
      }

      // 這一支失敗了，就只有這一支不畫線。**上一輪那條也要收掉**——
      // 留著它，圖上就會有一條屬於另一段行情、卻看起來完全正常的線。
      chartIndicators.value = chartIndicators.value.filter(
        indicator => indicator.strategyId !== strategy.id)
      failureMessages.value = new Map(failureMessages.value)
        .set(strategy.id, messageOf(error))
    }
    finally {
      calculatingStrategyIds.value = calculatingStrategyIds.value.filter(
        id => id !== strategy.id)
    }
  }

  /** 除了這一支之外，圖上其他線已經用掉的顏色。重算它時要避開那些。 */
  function takenColorTokensExcept(strategyId: number): string[] {
    return chartIndicators.value
      .filter(indicator => indicator.strategyId !== strategyId)
      .flatMap(indicator => indicator.usedColorTokens)
  }

  function forgetFailure(strategyId: number) {
    if (!failureMessages.value.has(strategyId)) {
      return
    }

    const remaining = new Map(failureMessages.value)
    remaining.delete(strategyId)
    failureMessages.value = remaining
  }

  function messageOf(error: unknown): string {
    if (error instanceof BackendUnreachableError) {
      return '連不上後端，請確認它已經啟動。'
    }
    if (error instanceof IndicatorScriptFailedError) {
      return error.message
    }
    if (error instanceof Error) {
      return error.message
    }

    return '計算這支指標時發生未預期的錯誤。'
  }

  return {
    appliedStrategies,
    chartIndicators,
    colorOptions,
    selectableStrategies,
    isCalculating,
    failureMessageOf,
    applyStrategy,
    removeStrategy,
    recalculateAll,
    clearLines,
    changeLineColor,
  }
}
