import type { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import { DrawnChartLinesVo } from '~/domain/models/vo/drawn-chart-lines-vo'
import { AppliedIndicatorLineDto, AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { ChartVisibleRangeVo } from '~/domain/models/vo/chart-visible-range-vo'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { IndicatorScriptFailedError } from '~/domain/errors/indicator-script-failed-error'

/**
 * 圖表上「已套用的指標」這一塊的**狀態**：誰在清單上、誰正在算、誰失敗了、算出哪幾條線。
 *
 * **它不做任何業務判斷**——一個數字畫成什麼、線是什麼顏色、值怎麼對回 K 線，
 * 一律問 Application。它持有的是狀態，不是規則。
 *
 * 清單**留存**：打開畫面時上次擺著的那幾支自己回來。留存的是「他要哪幾支、各配什麼值」，
 * 對照現在的策略清單之後才回得來——那個判斷不在這裡，由領域那一側負責。
 * 顏色與旋鈕習慣值仍然各自留存，各自回答自己的問題。
 *
 * **同一支策略可以擺好幾筆**，所以這裡的每一把鑰匙都是「**這一次套用**」的序號，
 * 不是策略識別碼。用後者當鍵，移除一筆會讓兩筆一起消失、一筆失敗會讓另一筆也紅、
 * 一筆算完會覆蓋掉另一筆的線——而這四件事沒有一件會報錯。
 */
export function useChartIndicators(chartIndicatorApplication: ChartIndicatorApplication) {
  /** 已套用的那幾筆，依加入的順序。順序決定沒挑過顏色時誰先拿到哪個顏色。 */
  const appliedIndicators = ref<AppliedIndicatorDto[]>([])
  /** 算成功的那幾筆該畫的線。失敗與計算中的不在裡面——圖上就不會有它們。 */
  const chartIndicators = ref<ChartIndicatorDto[]>([])
  const calculatingIds = ref<number[]>([])
  /** 每一筆各自的失敗說明。一筆失敗只標在它自己旁邊，其他筆照常畫。 */
  const failureMessages = ref<Map<number, string>>(new Map())
  /**
   * 每一筆各自的「這幾格哪裡不對」。
   *
   * 與失敗說明分開，因為它們講的是不同的事：那個說「算過了、算不出來」，
   * 這個說「還沒算——你填的東西用不了」。混成同一個，使用者會以為算式壞了。
   */
  const parameterMessages = ref<Map<number, string>>(new Map())

  /**
   * 使用者暫時收起來的那幾筆——**收起來的是那條線，不是那一支指標**。
   *
   * 它們仍然在清單上、仍然跟著重算、仍然佔著自己的顏色：使用者要的是
   * 「先讓開一下，我要看蠟燭」，不是「拿掉它」——後者清單上已經有一顆按鈕了。
   * 照樣算是刻意的：再打開時圖上立刻就有線，而不是等一次計算。
   *
   * 它只活在這一次瀏覽裡，不留存：留存的是「他要哪幾支」，
   * 而「這一刻先讓開一下」是這一刻的事。
   */
  const hiddenAppliedIndicatorIds = ref<number[]>([])

  /**
   * 還沒上圖的那一筆：使用者挑了一支有旋鈕的策略，正在調它的值。
   *
   * 它與已經在圖上的那幾筆是不同的東西——**還沒有人算過它**，
   * 圖上也還沒有屬於它的線。放在這裡而不另開一個地方，是因為
   * 「這一次要不要停下來調」的判斷必須留在這個 composable 裡：
   * 拆出去就會浮到元件層，而元件不該做那個判斷。
   */
  const pendingAppliedIndicator = ref<AppliedIndicatorDto | null>(null)
  const pendingParametersMessage = ref<string | null>(null)

  /**
   * 下一筆套用的序號。它只在這個畫面活著——留存的是「他要哪幾支、各配什麼值」，
   * 不是這幾個序號，所以還原回來的那幾筆也在這裡重新拿號。
   */
  let lastAppliedIndicatorId = 0

  /**
   * 每一筆**最後一次「值用得了」**的樣子。
   *
   * 畫面上那一份（`appliedIndicators`）可能帶著使用者剛打、但用不了的值——
   * 那是刻意的，畫面必須顯示他剛剛打的東西。但**留存的不能是那一份**，
   * 而清單的下一次改動（移除、加入）寫的是**整份**：
   * 少了這裡，那一次改動就會把用不了的值一起寫下去，
   * 下次打開時它退回策略的預設值，**使用者自己調過的那個值就這樣消失了**——
   * 而從頭到尾沒有任何地方報錯。
   *
   * 它是一張以序號為鍵的查詢表，不是第二份清單：要寫下去的那一份永遠**由畫面上那一份推導**
   * （順序與成員一律照它），所以兩者不會漂移。
   */
  const lastUsableAppliedIndicators = new Map<number, AppliedIndicatorDto>()

  /**
   * 目前在算的是哪一張圖的哪一段。
   *
   * 兩者是同一件事的兩面，所以一起存：圖給的是交易標的與彙總刻度，
   * 區間給的是**算哪一段**。分開存就會有一個已經設好、另一個還沒有的空檔，
   * 而那個空檔裡算出來的是另一段行情的指標。
   *
   * **同步記下，不等停手**——否則剛套上來的那一支會用整批算，而停手之後的重算
   * 又會用這一段再算一次：同一支算兩遍，而且兩遍的答案不一樣。
   * 延後的只有「重算」這件事本身。
   */
  const current = shallowRef<{ chart: KCandleChartDto, range: ChartVisibleRangeVo } | null>(null)

  /**
   * 使用者停手多久才算。拖動一次會產生幾十個中間狀態，每一個都算是把同一份工作
   * 做上幾十遍，而使用者根本來不及看清其中任何一個——只算停下來的那一個，
   * 看到的結果完全一樣。
   */
  const SETTLE_MILLISECONDS = 300
  let settleTimer: ReturnType<typeof setTimeout> | null = null

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

  function nextRequestNumber(appliedIndicatorId: number): number {
    const requestNumber = (requestNumbers.get(appliedIndicatorId) ?? 0) + 1
    requestNumbers.set(appliedIndicatorId, requestNumber)

    return requestNumber
  }

  function isLatestRequest(appliedIndicatorId: number, requestNumber: number): boolean {
    return requestNumbers.get(appliedIndicatorId) === requestNumber
  }

  const colorOptions = chartIndicatorApplication.listChartLineColorOptions()

  /**
   * 清單上每一列此刻的樣子。
   *
   * 這幾樣東西各自住在自己的地方（哪幾筆、哪幾筆在算、哪幾筆失敗、算出哪些線），
   * 因為它們各自變動的時機不同。但**畫面要的是一列**——讓它拿身分去查五次，
   * 等於要求它也會算同一把鑰匙，而那把鑰匙一旦兩邊算得不一樣，
   * 畫面會安靜地少畫一列的狀態，不會有任何地方報錯。
   */
  const appliedIndicatorRows = computed(() => appliedIndicators.value.map((appliedIndicator) => {
    const drawn = chartIndicators.value.find(
      indicator => indicator.appliedIndicatorId === appliedIndicator.id)

    return new AppliedIndicatorRowDto(
      appliedIndicator,
      chartIndicatorApplication.describeAppliedIndicatorParameters(appliedIndicator.parameters),
      calculatingIds.value.includes(appliedIndicator.id),
      failureMessages.value.get(appliedIndicator.id) ?? null,
      parameterMessages.value.get(appliedIndicator.id) ?? null,
      [
        ...(drawn?.levels ?? []).map(level => new AppliedIndicatorLineDto(
          level.lineKey, level.indicatorName, level.colorToken)),
        ...(drawn?.series ?? []).map(oneSeries => new AppliedIndicatorLineDto(
          oneSeries.lineKey, oneSeries.indicatorName, oneSeries.colorToken)),
      ],
      drawn?.drawsNothing ?? false,
      !hiddenAppliedIndicatorIds.value.includes(appliedIndicator.id),
    )
  }))

  /**
   * 圖上真的畫出來的那幾筆。
   *
   * 與 `chartIndicators` 分開，因為它們回答的是兩個問題：那個是「算出了什麼」，
   * 這個是「現在看得到什麼」。避開顏色、判斷誰畫過哪條線一律問前者——
   * 收起來的那一支仍然佔著它的顏色，否則再打開時線會換一個顏色回來。
   */
  const visibleChartIndicators = computed(() => chartIndicators.value.filter(
    indicator => !hiddenAppliedIndicatorIds.value.includes(indicator.appliedIndicatorId)))

  /** 收起這一筆的線，或把它拿回來。**不重算**——算出來的值一個字都不會變。 */
  function toggleAppliedIndicatorVisibility(appliedIndicatorId: number) {
    hiddenAppliedIndicatorIds.value
      = hiddenAppliedIndicatorIds.value.includes(appliedIndicatorId)
        ? hiddenAppliedIndicatorIds.value.filter(id => id !== appliedIndicatorId)
        : [...hiddenAppliedIndicatorIds.value, appliedIndicatorId]
  }

  /** 還沒上圖那一筆的那幾格。同一個問法，只是問的是還沒上圖的那一筆。 */
  const pendingParameterFields = computed(
    () => chartIndicatorApplication.describeAppliedIndicatorParameters(
      pendingAppliedIndicator.value?.parameters ?? []))

  /**
   * 還可以挑的策略：**全部**——已經在圖上的那幾支仍然挑得到。
   *
   * 這裡曾經把已套用的那幾支濾掉，前提是「同一支只畫得出同一條線」。
   * 旋鈕讓那個前提不成立了：二十期與六十期是兩條不同的線，只是恰好共用同一段算法。
   * 規則沒有錯，是它的前提消失了。
   */
  function selectableStrategies(strategies: readonly StrategyDto[]): StrategyDto[] {
    return [...strategies]
  }

  /**
   * 把上次擺著的那幾支還原回來。**取到策略清單之後才叫得動**——
   * 那份清單是還原時唯一的真相（策略可能被刪、改了宣告、現在畫不成線）。
   *
   * 「哪幾筆回得來」這個判斷不在這裡：這個 composable 持有的是狀態，不是規則。
   *
   * 算不算得動要看行情回來了沒有。**兩件事各自進行、誰先回來都可以**（既有設計），
   * 所以這裡照樣對每一筆算一次：行情還沒回來時 `calculateOne` 會安靜地回頭，
   * 而第一次擺好位置時它們會被補算——那一段在 `recalculateForRange` 裡。
   *
   * **還原不寫回留存**：留存的內容一個字都沒有變，寫它只是把剛讀到的東西寫回去。
   */
  async function restoreAppliedIndicators(strategies: readonly StrategyDto[]) {
    const restored = chartIndicatorApplication.restoreAppliedIndicators(
      strategies, lastAppliedIndicatorId)
    if (restored.length === 0) {
      return
    }

    lastAppliedIndicatorId += restored.length
    appliedIndicators.value = [...appliedIndicators.value, ...restored]
    // 回來的那幾筆的值都是能用的（用不了的在還原時就退回了預設值）——
    // 記著它們，之後清單的任何一次改動才寫得出能用的那一份。
    for (const appliedIndicator of restored) {
      lastUsableAppliedIndicators.set(appliedIndicator.id, appliedIndicator)
    }

    // **在這裡就決定要不要算，而不是邊算邊等。**
    // 行情還沒回來時算不動（`calculateOne` 會安靜地回頭），而第一次擺好位置時會補算。
    // 若照樣逐筆 await，每一個 await 都是一個空檔——行情的續段可能正好落在裡面，
    // 於是補算與這個迴圈同時跑，同一批被算兩遍。兩次都畫得出線，圖上不會有任何異狀。
    if (current.value === null) {
      return
    }

    for (const appliedIndicator of restored) {
      await calculateOne(appliedIndicator)
    }
  }

  /**
   * 使用者挑了一支——**唯一的入口**。
   *
   * 有旋鈕的先停下來讓他調；一個旋鈕都沒有的直接上圖，中間不多一步。
   * **這個判斷不是畫面的事**，而是那一筆自己答得出來的：多數策略沒有旋鈕，
   * 為了少數有旋鈕的讓所有策略都多一次確認，是拿多數人的每一次操作去補貼少數情況。
   */
  async function applyIndicator(strategy: StrategyDto) {
    lastAppliedIndicatorId += 1
    const prepared = chartIndicatorApplication.prepareAppliedIndicator(
      strategy, lastAppliedIndicatorId)

    if (!prepared.readyToApply) {
      pendingAppliedIndicator.value = prepared
      pendingParametersMessage.value = null
      return
    }

    await addToChart(prepared)
  }

  /** 調待上圖那一筆的其中一格。 */
  function changePendingParameterValue(parameterName: string, value: number) {
    const pending = pendingAppliedIndicator.value
    if (pending === null) {
      return
    }

    pendingAppliedIndicator.value = pending.withParameterValue(parameterName, value)
    pendingParametersMessage.value = null
  }

  /** 調好了：值合法才上圖，不合法就地說明、什麼都不算。 */
  async function confirmPendingIndicator() {
    const pending = pendingAppliedIndicator.value
    if (pending === null) {
      return
    }

    const message = chartIndicatorApplication.validateAppliedIndicatorParameters(
      pending.parameters)
    if (message !== null) {
      pendingParametersMessage.value = message
      return
    }

    pendingAppliedIndicator.value = null
    await addToChart(pending)
  }

  /** 不加了。那一筆從來沒有上過圖，所以沒有任何東西要收拾。 */
  function cancelPendingIndicator() {
    pendingAppliedIndicator.value = null
    pendingParametersMessage.value = null
  }

  /**
   * 改掉已經在圖上那一筆的值：記住它，並且**只有那一筆**重算。
   *
   * 填了用不了的值時**照樣把它留下**，只是不算也不記——畫面必須顯示使用者剛剛打的東西。
   * 這裡曾經直接不理它：格子裡留著他打的 0，清單那一列卻還寫著 20，
   * 而沒有任何一個字說為什麼。畫面自己跟自己矛盾，比什麼都不做更糟。
   */
  async function changeAppliedParameterValue(
    appliedIndicatorId: number, parameterName: string, value: number,
  ) {
    const applied = appliedIndicators.value.find(one => one.id === appliedIndicatorId)
    if (applied === undefined) {
      return
    }

    const changed = applied.withParameterValue(parameterName, value)
    appliedIndicators.value = appliedIndicators.value.map(
      one => (one.id === appliedIndicatorId ? changed : one))

    const message = chartIndicatorApplication.validateAppliedIndicatorParameters(
      changed.parameters)
    parameterMessages.value = withMessage(parameterMessages.value, appliedIndicatorId, message)
    if (message !== null) {
      return
    }

    chartIndicatorApplication.rememberAppliedIndicatorParameters(changed)
    // 這個值用得了，所以它就是這一筆最後一次能用的樣子。
    // **值用不了的那一次走不到這裡**（上面已經回頭），於是留存的仍是上一個能用的值。
    lastUsableAppliedIndicators.set(appliedIndicatorId, changed)
    rememberAppliedIndicators()
    await calculateOne(changed)
  }

  /**
   * 把「圖上擺著哪幾筆」寫下來——**唯一的寫入點**。
   *
   * 寫的是**能用的那一份**：成員與順序照畫面上那一份，但每一筆的值取它最後一次用得了的樣子。
   * 兩者只有在使用者正把一個用不了的值留在某一格裡時才不同。
   */
  function rememberAppliedIndicators() {
    chartIndicatorApplication.rememberAppliedIndicators(appliedIndicators.value.map(
      applied => lastUsableAppliedIndicators.get(applied.id) ?? applied))
  }

  /** 換掉某一筆的說明；`null` 就是把它拿掉。 */
  function withMessage(
    messages: ReadonlyMap<number, string>, appliedIndicatorId: number, message: string | null,
  ): Map<number, string> {
    const changed = new Map(messages)
    if (message === null) {
      changed.delete(appliedIndicatorId)
    }
    else {
      changed.set(appliedIndicatorId, message)
    }

    return changed
  }

  /** 移除一筆：它的線、它的失敗說明、它在清單上的位置一起消失。 */
  function removeAppliedIndicator(appliedIndicatorId: number) {
    // 往前推一號：正在飛的那一次回來時已經不是最新的，於是它算出來的線不會被加回去。
    nextRequestNumber(appliedIndicatorId)
    appliedIndicators.value = appliedIndicators.value.filter(
      applied => applied.id !== appliedIndicatorId)
    chartIndicators.value = chartIndicators.value.filter(
      indicator => indicator.appliedIndicatorId !== appliedIndicatorId)
    forgetFailure(appliedIndicatorId)
    parameterMessages.value = withMessage(parameterMessages.value, appliedIndicatorId, null)
    lastUsableAppliedIndicators.delete(appliedIndicatorId)
    // 那一筆不在了，「它收著」也就不再是任何問題的答案。
    hiddenAppliedIndicatorIds.value = hiddenAppliedIndicatorIds.value.filter(
      id => id !== appliedIndicatorId)
    // 不寫的話它明天會回來，而使用者明明已經把它拿下來了。
    rememberAppliedIndicators()
  }

  /**
   * 真的加上去：記住這一次的值、記住清單變成了什麼，然後立刻算一次。
   *
   * 兩份記憶都要寫，因為它們回答的是兩個問題：
   * 「我習慣把這支調成幾」（下次挑一支新的時帶起始值）與
   * 「圖上擺著哪幾筆」（下次打開時還原）。
   */
  async function addToChart(appliedIndicator: AppliedIndicatorDto) {
    chartIndicatorApplication.rememberAppliedIndicatorParameters(appliedIndicator)
    appliedIndicators.value = [...appliedIndicators.value, appliedIndicator]
    // 加得進來的值必然用得了（有旋鈕的先驗過才上圖，沒旋鈕的沒有值可驗）。
    lastUsableAppliedIndicators.set(appliedIndicator.id, appliedIndicator)
    rememberAppliedIndicators()
    await calculateOne(appliedIndicator)
  }

  /**
   * 使用者正在看的那一段變了：等他停手，然後對**那一段**重算每一支。
   *
   * 「等停手」在這裡而不在領域裡，是因為它需要計時器：一個「等一下再做」的物件，
   * 行為只能靠推進時間來觀察，而領域物件在這個專案裡的價值正是不必推進時間就驗得動。
   * **要不要算**這個判斷仍然不在這裡——那是顯示區間自己回答的。
   */
  function recalculateForRange(chart: KCandleChartDto, range: ChartVisibleRangeVo) {
    const previous = current.value
    const wasNeverSet = previous === null
    // 同一檔的同一段：算出來必然一樣。換了交易標的就不算同一段——
    // 換標的時使用者正在看的那一段不變，光比對時間會把它誤判成沒事發生。
    const isUnchanged = range.isSameAs(previous?.range ?? null)
      && chart.symbol === previous?.chart.symbol

    current.value = { chart, range }

    if (isUnchanged) {
      return
    }

    // 第一次擺好位置：還沒有任何一支在別的區間下算過，所以沒有東西需要「跟上」——
    // 但清單上可能已經有東西了。還原回來的那幾筆在行情之前就進了清單，
    // 而它們當時算不動（沒有「算哪一段」可用），這一刻才第一次有。
    //
    // 這條判斷原本只是「什麼都不做」，前提是「清單此刻必然是空的」（清單不留存）。
    // 留存讓那個前提消失了；規則沒有錯，是它的前提不在了。
    if (wasNeverSet) {
      if (appliedIndicators.value.length > 0) {
        // **不等停手**：第一次擺好位置不是拖動，等 300 毫秒只是讓圖空著。
        void recalculateEveryApplied()
      }

      return
    }

    if (settleTimer !== null) {
      clearTimeout(settleTimer)
    }

    settleTimer = setTimeout(() => {
      settleTimer = null
      void recalculateEveryApplied()
    }, SETTLE_MILLISECONDS)
  }

  /**
   * 一根走完了：指標可用的資料真的多了一根，所以要重算——**不等停手**。
   * 五分鐘才發生一次，節流它只會讓畫面慢半拍。
   */
  async function recalculateAfterKCandleClosed(chart: KCandleChartDto) {
    const range = current.value?.range
    if (range === undefined) {
      return
    }

    // 看不到最新那一根：走完的那一根不在他正在看的那一段裡，
    // 「可用的資料多了一根」對他的問題並不成立。
    if (!range.showsTheLatestKCandle(chart.latestKCandleOpenTime)) {
      return
    }
    current.value = { chart, range }

    await recalculateEveryApplied()
  }

  async function recalculateEveryApplied() {
    for (const appliedIndicator of appliedIndicators.value) {
      await calculateOne(appliedIndicator)
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

  /** 元件收掉時把還在等的那次也收掉，免得對一個已經不存在的畫面重算。 */
  function stopSettling() {
    if (settleTimer !== null) {
      clearTimeout(settleTimer)
      settleTimer = null
    }
  }

  /** 換一條線的顏色。圖上立刻換，不重算——算出來的值一個字都不會變。 */
  function changeLineColor(lineKey: string, colorToken: string) {
    chartIndicators.value = chartIndicatorApplication.changeChartLineColor(
      chartIndicators.value, lineKey, colorToken)
  }

  async function calculateOne(appliedIndicator: AppliedIndicatorDto) {
    const inView = current.value
    // 圖上還沒有任何 K 線（系統沒起來、查無資料）：沒有東西可以算。
    if (inView === null || inView.chart.isEmpty) {
      return
    }
    const { chart, range } = inView

    const requestNumber = nextRequestNumber(appliedIndicator.id)
    calculatingIds.value = [...calculatingIds.value, appliedIndicator.id]
    forgetFailure(appliedIndicator.id)

    try {
      const calculated = await chartIndicatorApplication.calculateChartIndicator(
        new ChartIndicatorRequestDto(
          appliedIndicator,
          chart.symbol,
          chart.interval.value,
          // 算的是使用者正在看的那一段，不是手上那一整批（後者兩側各多取了半段）。
          // 顯示區間是狀態不是參數，所以剛套用的那一支與早就套上的那幾支
          // 算的必然是同一段——沒有哪個呼叫點可以忘記帶它。
          range.kCandleCountAt(chart.interval),
          // 算到哪一刻由顯示區間回答：看得到最新那一根就不指定（照系統的現在），
          // 看不到就是這一段的右端。
          range.calculationEndTime(chart.latestKCandleOpenTime),
          drawnLinesExcept(appliedIndicator.id),
        ))

      // 這一次已經不是那一支最新的要求了（使用者又換了一次標的，或已經把它移除）：
      // 這份結果講的是另一段行情，採用它就是在圖上畫一條沒有人要求過的線。
      if (!isLatestRequest(appliedIndicator.id, requestNumber)) {
        return
      }

      chartIndicators.value = [
        ...chartIndicators.value.filter(
          indicator => indicator.appliedIndicatorId !== appliedIndicator.id),
        calculated,
      ]
    }
    catch (error: unknown) {
      if (!isLatestRequest(appliedIndicator.id, requestNumber)) {
        return
      }

      // 這一筆失敗了，就只有這一筆不畫線。**上一輪那條也要收掉**——
      // 留著它，圖上就會有一條屬於另一段行情、卻看起來完全正常的線。
      chartIndicators.value = chartIndicators.value.filter(
        indicator => indicator.appliedIndicatorId !== appliedIndicator.id)
      failureMessages.value = new Map(failureMessages.value)
        .set(appliedIndicator.id, messageOf(error))
    }
    finally {
      calculatingIds.value = calculatingIds.value.filter(id => id !== appliedIndicator.id)
    }
  }

  /**
   * 除了這一筆之外，圖上其他線的樣子。重算它時要避開那些顏色。
   *
   * 記憶身分也一起交出去：同一支策略的另一筆畫的是**同一條線**，
   * 而那正是唯一該跳過記住的顏色的情況。
   */
  function drawnLinesExcept(appliedIndicatorId: number): DrawnChartLinesVo {
    const others = chartIndicators.value.filter(
      indicator => indicator.appliedIndicatorId !== appliedIndicatorId)

    return new DrawnChartLinesVo(
      others.flatMap(indicator => indicator.usedColorTokens),
      others.flatMap(indicator => indicator.drawnLineKeys),
    )
  }

  function forgetFailure(appliedIndicatorId: number) {
    if (!failureMessages.value.has(appliedIndicatorId)) {
      return
    }

    const remaining = new Map(failureMessages.value)
    remaining.delete(appliedIndicatorId)
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
    appliedIndicators,
    appliedIndicatorRows,
    chartIndicators,
    visibleChartIndicators,
    colorOptions,
    pendingAppliedIndicator,
    pendingParameterFields,
    pendingParametersMessage,
    selectableStrategies,
    restoreAppliedIndicators,
    applyIndicator,
    changePendingParameterValue,
    confirmPendingIndicator,
    cancelPendingIndicator,
    changeAppliedParameterValue,
    removeAppliedIndicator,
    toggleAppliedIndicatorVisibility,
    recalculateForRange,
    recalculateAfterKCandleClosed,
    clearLines,
    stopSettling,
    changeLineColor,
  }
}
