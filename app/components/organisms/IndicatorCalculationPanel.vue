<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import IndicatorScriptEditor from '~/components/molecules/IndicatorScriptEditor.vue'
import IndicatorScriptGuide from '~/components/molecules/IndicatorScriptGuide.vue'
import IndicatorScriptGuideDialog from '~/components/molecules/IndicatorScriptGuideDialog.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyScriptPicker from '~/components/molecules/StrategyScriptPicker.vue'
import StrategyScriptNameDialog from '~/components/molecules/StrategyScriptNameDialog.vue'
import StrategyScriptLibraryDialog from '~/components/molecules/StrategyScriptLibraryDialog.vue'
import StrategyScriptLibraryList from '~/components/molecules/StrategyScriptLibraryList.vue'
import StrategyScriptParameterList from '~/components/molecules/StrategyScriptParameterList.vue'
import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { StrategyScriptApplication } from '~/application/strategy-script-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'
import AppTabs from '~/components/atoms/AppTabs.vue'
import StrategyScriptBacktestPane from '~/components/organisms/StrategyScriptBacktestPane.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { readNumberInput } from '~/utilities/number-input-reading'
import { useStrategyScriptParameters } from '~/composables/use-strategy-script-parameters'
import { useIndicatorCalculationRun } from '~/composables/use-indicator-calculation-run'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

// 有機體：策略腳本那一頁的整塊工作區。Application 由頁面注入。
//
// 型別名字留著「IndicatorCalculation」：「執行指標計算」在後端仍然是一個有效的
// 業務動作，而這一塊做的正是那件事。改的是**畫面叫什麼**——那一頁上還有腳本庫、
// 市集入口、參數宣告與回測，指標計算只是它能做的其中一件事。
//
// 版面照「上程式碼、下結果、右變數」擺——每一台這類工作台的形狀：
//
//   寬螢幕：   腳本庫 │ 編輯器              │ 參數
//                    │ 指標預覽／回測（分頁） │
//                    │ 結果                  │ 執行條件
//
//   窄一點時腳本庫收進一顆鍵後面的對話框；手機上一欄到底，
//   編輯器、參數、說明三段切換，底下接著執行條件與結果，主要動作釘在最下面。
//
// 右邊那一欄是**這一支的旋鈕，加上這一次的條件**：兩樣都是調一下、跑一次、
// 看左邊結果的東西，所以它們疊在同一條直線上。
const {
  indicatorCalculationApplication,
  strategyScriptApplication,
  tradingSymbolApplication,
  backtestApplication,
  timeZone,
  marketDataKind = 'kCandle',
} = defineProps<{
  indicatorCalculationApplication: IndicatorCalculationApplication
  strategyScriptApplication: StrategyScriptApplication
  tradingSymbolApplication: TradingSymbolApplication
  backtestApplication: BacktestApplication
  /** 這一頁說時間的地方一律照它——回測的資金曲線與交易明細也不例外。 */
  timeZone: TimeZoneDto
  /**
   * 這一塊工作區寫、存、算的是哪一種行情的策略腳本。
   *
   * 它是**這一頁的身分**，不是使用者在畫面上切換的東西：現貨策略腳本與合約策略腳本
   * 是兩個去處、共用這一塊。兩者的每一個差異——清單列哪一種、進入點收什麼、範例讀什麼、
   * 說明列什麼、標的從哪一份清單挑、計算送到哪、有沒有回測——都問領域，
   * 這裡不自己比對它的值。
   */
  marketDataKind?: MarketDataKind
}>()

/**
 * 這一頁有兩個去處，共用同一份工作區。
 *
 * 打開時停在指標預覽，那是這一頁原本就在做的事。切換不清空任何東西：
 * 兩邊都還掛在畫面上，只是其中一邊此刻看得見——填到一半的回測條件因此不會掉。
 */
const WORKBENCH_DESTINATIONS = [
  { value: 'indicatorPreview', label: '指標預覽' },
  { value: 'backtest', label: '回測' },
] as const

/**
 * 這一頁有沒有回測可以跑，由這一種行情說。沒有的時候那個分頁整個不出現，
 * 而不是出現一個按了才說「還不行」的去處——合約的回測是交易服務的下一刀。
 */
const workbench = indicatorCalculationApplication.describeStrategyScriptWorkbench(marketDataKind)

const destination = ref<string>(WORKBENCH_DESTINATIONS[0].value)

/**
 * 工作區被整份換掉了幾次。
 *
 * 回測那一側看著它決定何時把上一次的成績單清掉。它是一個數字而不是算式的內容，
 * 因為後者每敲一個字都會變——而敲字不是「換了一支策略腳本」。
 */
const workspaceGeneration = ref(0)

/**
 * 一份空白的策略腳本內容——「空白長什麼樣」在這個畫面上只有這一個定義。
 *
 * 第一次進入畫面時是它，按下「新的空白策略腳本」時也是它。各寫一份的話，
 * 哪天預設的種類改了、只改到一邊，「新開的」就會與「剛進來的」不一樣。
 */
// 空白長什麼樣由領域回答，整份一次交來：一份預填好的算式（開頭那幾行加一個空的
// Calculate，**每一行都改得動**）、預設的指標值種類，以及還沒有任何旋鈕。
// 第一次進來與按「新的空白策略腳本」都用這一份。
const blankStrategyScriptContent = indicatorCalculationApplication.describeBlankStrategyScript(marketDataKind)

/*
 * 這一組是「這一次要怎麼算」，不是策略腳本記著的東西：交易標的、彙總刻度、要看多長。
 * 它們因此不在那份空白裡，也不會被載入另一支策略腳本換掉——
 * 使用者正在用一小時的粗細研究一件事，換一支算法不該把他打回五分鐘，
 * 一如換算法向來不會把他丟到別的市場去。
 */
const symbol = ref('BTCUSDT')
const aggregationInterval = ref<string>(
  indicatorCalculationApplication.defaultAggregationInterval())
// 使用者說得出口的是「最近兩小時」，不是「24 根」——而「24」還會隨彙總刻度
// 改變意義。要幾格由系統從這一段算出來，畫面不必也不能填。
const span = ref(indicatorCalculationApplication.defaultCalculationSpan())

const script = ref(blankStrategyScriptContent.script)
// 旋鈕是**策略腳本內容**，與算式內容、指標值種類同一層：載入時跟著換，
// 改動它算「有東西還沒存」。彙總刻度與要看多長仍然不是——它們屬於這一次。
const strategyScriptParameters = useStrategyScriptParameters(
  indicatorCalculationApplication, blankStrategyScriptContent.parameters)
const resultType = ref<string>(blankStrategyScriptContent.resultType)

// 換指標值種類時，把算式裡第一個 Calculate 進入點的回傳型別換成新選的——
// 使用者不必自己回去改簽章。開頭、函式主體、helper 一字不動；
// 找不到 Calculate 那一行就整份不動。
// 只在使用者親手改種類時做，載入策略腳本時不做（那時內容與種類一起換）。
function retargetResultType(nextResultType: string) {
  resultType.value = nextResultType
  script.value = indicatorCalculationApplication.retargetScriptReturnType(
    script.value, nextResultType, marketDataKind)
}

const aggregationIntervalOptions
  = indicatorCalculationApplication.listAggregationIntervalOptions()

const spanUnitOptions = indicatorCalculationApplication.listCalculationSpanUnitOptions()

const resultTypeOptions = indicatorCalculationApplication.listResultTypeOptions()
// 算式收到的每一根 K 線有哪些欄位，以及宣告好的參數怎麼讀。
// 兩份都是沙箱契約的一部分，都不會變，取一次就好。
const scriptInputGuide = indicatorCalculationApplication.describeScriptInputGuide(marketDataKind)
const scriptParameterAccesses = indicatorCalculationApplication.listScriptParameterAccesses()
const signalReadings = indicatorCalculationApplication.listSignalReadings()
/** 「算式裡可以用什麼」那份說明開著沒有。它只在使用者問的時候出現。 */
const guideOpen = ref(false)

/**
 * 手機上編輯器那一格現在顯示哪一段：程式碼、參數或說明。
 *
 * 寬螢幕上三樣同時攤開（說明在一顆 ⓘ 後面），這個值不起作用；
 * 它只決定窄螢幕上哪一段看得見——另外兩段仍然掛著，切回來時一個字都沒掉。
 */
const compactSection = ref<string>('code')
const compactSectionOptions = computed(() => [
  { value: 'code', label: '程式碼' },
  { value: 'parameters', label: `參數 ${strategyScriptParameters.fields.value.length}` },
  { value: 'guide', label: '說明' },
])
/** 這個種類之下，按「帶入範例內容」會填進來的那一整份。 */
const exampleScript = computed(
  () => indicatorCalculationApplication.describeExampleScript(resultType.value, marketDataKind))

const calculationRun = useIndicatorCalculationRun(indicatorCalculationApplication)

// 策略腳本庫拿畫面上這三樣東西當它的輸入，也負責把載入的那一份寫回來。
// 「這三樣是什麼」只寫在這兩個函式裡，其餘一律走 StrategyScriptContentDto——
// 多一樣東西要跟著策略腳本走，就只有這裡要改，「有沒有還沒存」自動跟著涵蓋它。
// 彙總刻度與要看多長刻意不在其中：它們不屬於任何一支策略腳本，
// 所以載入不會覆蓋它們，改動它們也不算「有東西還沒存」。
const strategyScriptLibrary = useStrategyScriptLibrary(
  strategyScriptApplication,
  () => new StrategyScriptContentDto(
    script.value, resultType.value, strategyScriptParameters.parameters.value, marketDataKind),
  (content) => {
    script.value = content.script
    resultType.value = content.resultType
    strategyScriptParameters.replaceAll(content.parameters)
    // 換了一份算式，上一次那次計算就與畫面上這一份無關了——結果與失敗訊息一起清掉。
    calculationRun.clear()
    // 回測那一側同理，但它有自己的一次，所以由它自己清——這裡只說「換過了」。
    workspaceGeneration.value += 1
  },
  blankStrategyScriptContent,
  marketDataKind)

onMounted(() => {
  void strategyScriptLibrary.refreshStrategyScripts()
})

// 工作區是不是唯讀由策略腳本庫說，畫面上每一個停用都讀它，不各自判斷——
// 哪一顆忘了看它，就是一個改得動別人東西的洞。
const readOnly = strategyScriptLibrary.readOnly

/** 標頭上那個檔名：工作區裡是哪一支就寫哪一支，還沒存過的是一份新檔。 */
const fileName = computed(() => {
  const name = strategyScriptLibrary.activeStrategyScript.value?.name
    ?? strategyScriptLibrary.activeAdoptedStrategyScript.value?.name
  return name === undefined ? 'indicator.go' : `${name}.go`
})

/**
 * 指標預覽這一次還什麼都沒說：沒算過、沒在算、也沒有任何一則提示。
 * 那時結果那一塊不留白，而是說一句「按下去之後這裡會出現什麼」。
 */
const indicatorPreviewQuiet = computed(() => calculationRun.result.value === null
  && !calculationRun.calculating.value
  && !calculationRun.backendUnreachable.value
  && calculationRun.parameterNotDeclaredMessage.value === null
  && calculationRun.scriptFailedMessage.value === null
  && calculationRun.requestRejectedMessage.value === null
  && calculationRun.serverErrorMessage.value === null)

/*
 * 手機上釘在最底下的那一條：儲存，以及「執行」。
 *
 * 「執行」送出的是**此刻看得見的那個去處**自己的表單（HTML 的 form 屬性），
 * 不另走一條路——兩顆鍵按下去走的是同一段送出、同一套把關。
 */
const indicatorPreviewFormId = useId()
const backtestFormId = useId()
const backtestPane = useTemplateRef<InstanceType<typeof StrategyScriptBacktestPane>>('backtestPane')
const compactRunLabel = computed(() => (destination.value === 'backtest' ? '執行回測' : '執行計算'))
const compactRunning = computed<boolean>(() => (destination.value === 'backtest'
  ? backtestPane.value?.running ?? false
  : calculationRun.calculating.value))

/** 同上：打到一半的東西不往下送。 */
function changeSpanAmount(raw: string | number) {
  const amount = readNumberInput(raw)
  if (amount !== null) {
    span.value = new CalculationSpanDto(amount, span.value.unit)
  }
}

function changeSpanUnit(unit: string) {
  span.value = new CalculationSpanDto(span.value.amount, unit as CalculationSpanUnit)
}

function fillExampleScript() {
  script.value = exampleScript.value
}

/**
 * 挑策略腳本那一排要顯示的東西：自己的，加上從市集加入的。
 *
 * 兩段在這裡合成一排是因為「要挑哪一支」對使用者是一個動作，不是兩個；
 * 而挑到加入來的那一支會發生什麼，由收下這個選擇的地方決定——那一支沒有算式，
 * 所以它不會被載進編輯器。
 */
const pickableStrategyScripts = computed(() => [
  ...strategyScriptLibrary.strategyScripts.value.map(strategyScript => strategyScript.toChartApplicable()),
  ...strategyScriptLibrary.adoptedStrategyScripts.value.map(published => published.toChartApplicable()),
])

/**
 * 把使用中的那一支放到市集上。
 *
 * 「哪一支」不由呼叫端說——它就是眼前這一支。沒有使用中的那一支時按鈕是禁用的，
 * 所以這裡讀到 null 是不會發生的事；讀到了就什麼都不做，而不是拿一個猜的識別碼去打後端。
 */
async function shareActiveStrategyScript() {
  const active = strategyScriptLibrary.activeStrategyScript.value
  if (active === null) {
    return
  }

  await strategyScriptLibrary.publishStrategyScript(active.id)
}

/** 從市集收回使用中的那一支。收回一律先問——理由與那個確認框上寫的一樣。 */
function withdrawActiveStrategyScript() {
  const active = strategyScriptLibrary.activeStrategyScript.value
  if (active === null) {
    return
  }

  strategyScriptLibrary.askToWithdraw(active.id)
}

async function calculateIndicator() {
  await calculationRun.run(() => new IndicatorCalculationRequestDto(
    symbol.value,
    aggregationInterval.value,
    indicatorCalculationApplication.observationWindowFor(span.value),
    script.value,
    resultType.value,
    strategyScriptParameters.parameters.value,
    // 唯讀時沒有算式可以送——指名那一支本身來跑，那是它唯一跑得動的方式。
    strategyScriptLibrary.namedStrategyScriptId.value,
    marketDataKind))
}

/**
 * 頁面離開前要問的那一句由頁面決定（它才擁有路由），這裡只回答「編輯區裡有沒有還沒存的東西」。
 * 按現貨／合約開關也是換一頁：寫到一半的算式不能因為切一下就靜靜不見。
 */
defineExpose({ hasUnsavedDraft: () => strategyScriptLibrary.hasUnsavedDraft() })
</script>

<template>
  <div
    class="indicator-calculation-panel"
    :class="{ 'indicator-calculation-panel--offers-backtest': workbench.offersBacktest }"
  >
    <!--
      腳本庫：寬螢幕上常駐在最左邊一欄，挑、開新的、刪、移除加入的都在這裡。
      窄一點放不下第三欄，同一份清單改收在編輯器那一排的「策略腳本清單」鍵後面。
    -->
    <AppPanel
      title="腳本庫"
      flush
      class="indicator-calculation-panel__library"
    >
      <template #actions>
        <AppButton
          type="button"
          variant="secondary"
          size="small"
          data-testid="library-new-strategy-script-button"
          @click="strategyScriptLibrary.startBlankStrategyScript"
        >
          <AppIcon
            name="plus"
            size="small"
          />
          新腳本
        </AppButton>
      </template>

      <StrategyScriptLibraryList
        :strategy-scripts="strategyScriptLibrary.strategyScripts.value"
        :adopted-strategy-scripts="strategyScriptLibrary.adoptedStrategyScripts.value"
        :error-message="strategyScriptLibrary.listErrorMessage.value"
        :active-strategy-script-id="strategyScriptLibrary.activeStrategyScript.value?.id ?? null"
        :active-adopted-strategy-script-id="strategyScriptLibrary.activeAdoptedStrategyScript.value?.id ?? null"
        @load="strategyScriptLibrary.selectStrategyScript"
        @remove="strategyScriptLibrary.askToDelete"
        @delete-adopted="strategyScriptLibrary.deleteAdoptedStrategyScript"
      />
    </AppPanel>

    <!-- 手機上編輯器那一格分三段：程式碼、參數、說明。寬螢幕上三樣同時攤開，這一排不出現。 -->
    <AppTabs
      v-model="compactSection"
      variant="segmented"
      block
      class="indicator-calculation-panel__sections"
      :options="compactSectionOptions"
    />

    <!-- 中間那一欄的上半：現在是哪一支、對它做什麼，以及算式本身。 -->
    <div
      class="indicator-calculation-panel__region indicator-calculation-panel__workbench"
      :class="{ 'indicator-calculation-panel__region--folded': compactSection !== 'code' }"
    >
      <!-- 腳本庫收起來的寬度上，挑哪一支靠這一個選單；寬螢幕上左邊那一欄就是它。 -->
      <StrategyScriptPicker
        class="indicator-calculation-panel__picker"
        :strategy-scripts="pickableStrategyScripts"
        :active-strategy-script-id="strategyScriptLibrary.activeStrategyScript.value?.id
          ?? strategyScriptLibrary.activeAdoptedStrategyScript.value?.id
          ?? null"
        @select="strategyScriptLibrary.selectStrategyScript"
      />

      <!--
        挑到一支我加入的，工作區就是唯讀的。這一句擺在編輯器正上方：
        那一整排按不下去的按鈕就在它下面，看的人第一個問題是「為什麼按不下去」。
      -->
      <AppAlert
        v-if="readOnly"
        tone="info"
        data-testid="adopted-read-only-notice"
      >
        這份是從市集加入的副本：算式是作者寫的，看不到也改不動——可以拿來試跑、回測與組交易策略。
      </AppAlert>

      <p
        v-if="strategyScriptLibrary.noticeMessage.value"
        class="indicator-calculation-panel__strategy-script-notice"
        data-testid="strategy-script-notice"
      >
        {{ strategyScriptLibrary.noticeMessage.value }}
      </p>
      <p
        v-if="strategyScriptLibrary.errorMessage.value"
        class="indicator-calculation-panel__strategy-script-error"
        data-testid="strategy-script-error"
      >
        {{ strategyScriptLibrary.errorMessage.value }}
      </p>

      <IndicatorScriptEditor
        v-model="script"
        class="indicator-calculation-panel__editor"
        :file-name="fileName"
        :concealed="readOnly"
        :error-message="calculationRun.messageFor('script')"
      >
        <template #status>
          <!--
            這個框裡的每一樣東西——算式、指標值種類、旋鈕——都是這支策略腳本記著的。
            執行條件上那個「只影響這一次」是它的另一半：兩個標記一起看才看得出是一組，
            而這一頁只有這一個分別需要記住。
          -->
          <AppBadge variant="success">
            跟著策略腳本存
          </AppBadge>
          <AppBadge
            v-if="strategyScriptLibrary.activeStrategyScript.value?.published"
            variant="info"
          >
            已分享
          </AppBadge>
        </template>

        <template #actions>
          <!--
            作用對象一律是**使用中的那一支**。「新的」排第一：每一個檔案選單都是這個順序。
            寬螢幕上「新腳本」在腳本庫的標頭，這裡那一顆就不再出現。
          -->
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            class="indicator-calculation-panel__until-library"
            label="新的空白策略腳本"
            data-testid="new-strategy-script-button"
            @click="strategyScriptLibrary.startBlankStrategyScript"
          >
            <AppIcon name="new" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            class="indicator-calculation-panel__until-library"
            label="策略腳本清單"
            data-testid="open-library-button"
            @click="strategyScriptLibrary.openLibrary"
          >
            <AppIcon name="library" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            :disabled="readOnly"
            label="另存為新的一支"
            data-testid="save-as-strategy-script-button"
            @click="strategyScriptLibrary.openNameDialog"
          >
            <AppIcon name="save-as" />
          </AppButton>
          <!-- 名稱與說明走同一個對話框：分享出去之後，那一段說明是別人唯一的介紹。 -->
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            :disabled="strategyScriptLibrary.activeStrategyScript.value === null"
            label="重新命名與撰寫說明"
            data-testid="rename-strategy-script-button"
            @click="strategyScriptLibrary.openRenameDialog"
          >
            <AppIcon name="rename" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            label="算式裡可以用什麼"
            data-testid="script-guide-button"
            @click="guideOpen = true"
          >
            <AppIcon name="info" />
          </AppButton>
          <!--
            分享與收回就擺在這裡，而不是躲在清單裡：想分享的幾乎總是眼前這一支——
            剛調對、剛存好的那一支。沒有使用中的那一支時它是禁用的，
            與「重新命名」同一條規則、同一個理由：那兩件事都需要先有一支。
          -->
          <AppButton
            v-if="!strategyScriptLibrary.activeStrategyScript.value?.published"
            type="button"
            variant="secondary"
            size="small"
            :disabled="strategyScriptLibrary.activeStrategyScript.value === null
              || strategyScriptLibrary.saving.value"
            data-testid="share-strategy-script-button"
            @click="shareActiveStrategyScript"
          >
            <AppIcon
              name="share"
              size="small"
            />
            分享到市集
          </AppButton>
          <AppButton
            v-else
            type="button"
            variant="secondary"
            size="small"
            :disabled="strategyScriptLibrary.saving.value"
            data-testid="withdraw-strategy-script-button"
            @click="withdrawActiveStrategyScript"
          >
            <AppIcon
              name="unshare"
              size="small"
            />
            從市集收回
          </AppButton>
          <!-- 手機上「儲存」釘在畫面最底下那一條，這裡那一顆只在寬螢幕出現。 -->
          <AppButton
            type="button"
            variant="primary"
            size="small"
            class="indicator-calculation-panel__wide-only"
            :disabled="strategyScriptLibrary.saving.value || readOnly"
            data-testid="save-strategy-script-button"
            @click="strategyScriptLibrary.saveStrategyScript"
          >
            <AppIcon
              name="save"
              size="small"
            />
            儲存
          </AppButton>
        </template>

        <template #toolbar>
          <AppSelect
            :model-value="resultType"
            :disabled="readOnly"
            class="indicator-calculation-panel__result-type"
            aria-label="指標值種類"
            data-testid="result-type-select"
            @update:model-value="retargetResultType"
          >
            <option
              v-for="resultTypeOption in resultTypeOptions"
              :key="resultTypeOption.value"
              :value="resultTypeOption.value"
            >
              {{ resultTypeOption.label }}
            </option>
          </AppSelect>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            :disabled="readOnly"
            data-testid="example-button"
            @click="fillExampleScript"
          >
            <AppIcon
              name="example"
              size="small"
            />
            帶入範例
          </AppButton>
        </template>
      </IndicatorScriptEditor>
    </div>

    <!--
      參數：這支算式的旋鈕。寬螢幕上它常駐在右邊那一欄，正上方對著執行條件；
      手機上它是編輯器的「參數」那一段。
    -->
    <div
      class="indicator-calculation-panel__region indicator-calculation-panel__parameters"
      :class="{ 'indicator-calculation-panel__region--folded': compactSection !== 'parameters' }"
    >
      <AppPanel title="參數">
        <template #meta>
          <AppBadge
            :variant="calculationRun.messageFor('parameters') ? 'danger' : 'neutral'"
            data-testid="parameters-count"
          >
            {{ strategyScriptParameters.fields.value.length }}
          </AppBadge>
        </template>

        <div class="indicator-calculation-panel__parameter-body">
          <p class="indicator-calculation-panel__lead">
            算式以名字取用它們，它們跟著這支策略腳本一起存。
            在 K 線圖表上套用時可以替那一次另外調一個值，這裡填的預設值不會被動到。
          </p>

          <StrategyScriptParameterList
            :fields="strategyScriptParameters.fields.value"
            :kind-options="strategyScriptParameters.kindOptions"
            :read-only="readOnly"
            @add="strategyScriptParameters.add"
            @remove="strategyScriptParameters.remove"
            @rename="strategyScriptParameters.rename"
            @change-kind="strategyScriptParameters.changeKind"
            @change-value="strategyScriptParameters.changeValue"
          />

          <AppAlert
            v-if="calculationRun.messageFor('parameters')"
            tone="danger"
            data-testid="parameters-alert"
          >
            {{ calculationRun.messageFor('parameters') }}
          </AppAlert>
        </div>
      </AppPanel>
    </div>

    <!-- 手機上「說明」那一段。寬螢幕上同一份在工具列那顆 ⓘ 後面的對話框裡。 -->
    <AppPanel
      v-if="compactSection === 'guide'"
      title="算式裡可以用什麼"
      class="indicator-calculation-panel__compact-guide"
    >
      <IndicatorScriptGuide
        :guide="scriptInputGuide"
        :parameter-accesses="scriptParameterAccesses"
        :signal-readings="signalReadings"
      />
    </AppPanel>

    <!--
      兩個去處：指標預覽與回測，就在編輯器正下方。打開時停在指標預覽；
      切換換掉的只有這底下那一塊，編輯器與參數完全不受影響——那正是這一頁把兩件事放在一起的整個理由。
    -->
    <AppTabs
      v-if="workbench.offersBacktest"
      v-model="destination"
      class="indicator-calculation-panel__destinations"
      :options="WORKBENCH_DESTINATIONS"
    />

    <!--
      兩個去處都掛著，只有一個看得見。用 v-show 而不是 v-if，
      是因為填到一半的回測條件與已經算出來的結果都必須留著——
      切過去再切回來，畫面與離開時一樣。
    -->
    <div class="indicator-calculation-panel__outcome">
      <form
        v-show="destination === 'indicatorPreview'"
        :id="indicatorPreviewFormId"
        class="indicator-calculation-panel__destination"
        @submit.prevent="calculateIndicator"
      >
        <!--
          這一頁只有一個分別要記住：**什麼跟著策略腳本走，什麼只屬於這一次**。
          改成兩個對照的標記：短到會被讀完，而且兩邊擺在一起才看得出是一組。
        -->
        <AppPanel
          title="執行條件"
          class="indicator-calculation-panel__run"
        >
          <template #meta>
            <AppBadge variant="info">
              只影響這一次
            </AppBadge>
          </template>

          <div class="indicator-calculation-panel__run-fields">
            <!-- 兩份清單、兩個欄位：同一個名字在現貨與合約是兩個商品，從現貨清單挑合約會挑錯。 -->
            <SymbolField
              v-if="!workbench.picksContractTradingSymbol"
              v-model="symbol"
              :trading-symbol-application="tradingSymbolApplication"
              :error-message="calculationRun.messageFor('symbol')"
            />
            <ContractSymbolField
              v-else
              v-model="symbol"
              :trading-symbol-application="tradingSymbolApplication"
              :error-message="calculationRun.messageFor('symbol')"
            />

            <FormField
              label="要看多長"
              :error-message="calculationRun.messageFor('span')"
            >
              <div class="indicator-calculation-panel__span">
                <AppInput
                  :model-value="String(span.amount)"
                  type="number"
                  inputmode="numeric"
                  :invalid="Boolean(calculationRun.messageFor('span'))"
                  data-testid="span-amount-input"
                  @update:model-value="changeSpanAmount"
                />
                <AppSelect
                  :model-value="span.unit"
                  data-testid="span-unit-select"
                  @update:model-value="changeSpanUnit"
                >
                  <option
                    v-for="unitOption in spanUnitOptions"
                    :key="unitOption.value"
                    :value="unitOption.value"
                  >
                    {{ unitOption.label }}
                  </option>
                </AppSelect>
              </div>
            </FormField>

            <FormField label="彙總刻度">
              <AppSelect
                v-model="aggregationInterval"
                data-testid="aggregation-interval-select"
              >
                <option
                  v-for="intervalOption in aggregationIntervalOptions"
                  :key="intervalOption.value"
                  :value="intervalOption.value"
                >
                  {{ intervalOption.label }}
                </option>
              </AppSelect>
            </FormField>

            <AppButton
              type="submit"
              block
              :disabled="calculationRun.calculating.value"
              data-testid="calculate-button"
            >
              {{ calculationRun.calculating.value ? '計算中…' : '執行計算' }}
            </AppButton>
          </div>
        </AppPanel>

        <!-- 這一次說了什麼：提示、然後結果。它在左邊（手機上在下面），條件在右邊。 -->
        <div class="indicator-calculation-panel__findings">
          <p
            v-if="indicatorPreviewQuiet"
            class="indicator-calculation-panel__placeholder"
            data-testid="indicator-preview-placeholder"
          >
            按「執行計算」，這支算式在這一段行情上算出的指標值會出現在這裡。
          </p>

          <AppAlert
            v-if="calculationRun.parameterNotDeclaredMessage.value"
            tone="danger"
            data-testid="parameter-not-declared-alert"
          >
            參數的問題（要改的是參數那一列的名字，或算式裡取用它的那一行）：{{ calculationRun.parameterNotDeclaredMessage.value }}
          </AppAlert>

          <AppAlert
            v-if="calculationRun.scriptFailedMessage.value"
            tone="danger"
            data-testid="script-failed-alert"
          >
            算式的問題（要改的是算式）：{{ calculationRun.scriptFailedMessage.value }}
            <!--
          「沙箱裡沒有這個名字」是這一則最常見的原因，而訊息只說得出少了什麼，
          說不出有什麼——那份清單在工具列那顆 ⓘ 後面。
          這裡不去解讀訊息的文字：那是直譯器的措辭，它會隨版本改。
          指路對每一種算式問題都成立，所以它一律出現。
        -->
            <template #action>
              <AppButton
                variant="secondary"
                size="small"
                data-testid="script-failed-guide-button"
                @click="guideOpen = true"
              >
                算式裡可以用什麼
              </AppButton>
            </template>
          </AppAlert>

          <AppAlert
            v-else-if="calculationRun.requestRejectedMessage.value"
            tone="warning"
            data-testid="request-rejected-alert"
          >
            請求的問題：{{ calculationRun.requestRejectedMessage.value }}
          </AppAlert>

          <AppAlert
            v-else-if="calculationRun.serverErrorMessage.value"
            tone="danger"
            data-testid="server-error-alert"
          >
            後端出錯了（不是你的請求有問題），請稍後重試：{{ calculationRun.serverErrorMessage.value }}
            <template #action>
              <AppButton
                variant="secondary"
                size="small"
                :disabled="calculationRun.calculating.value"
                @click="calculateIndicator"
              >
                重試
              </AppButton>
            </template>
          </AppAlert>

          <AppAlert
            v-else-if="calculationRun.backendUnreachable.value"
            tone="danger"
            data-testid="unreachable-alert"
          >
            連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。
            <template #action>
              <AppButton
                variant="secondary"
                size="small"
                :disabled="calculationRun.calculating.value"
                @click="calculateIndicator"
              >
                重試
              </AppButton>
            </template>
          </AppAlert>

          <AppAlert
            v-else-if="calculationRun.calculating.value"
            tone="info"
            data-testid="calculating-alert"
          >
            計算中…算式最長可能跑上數十秒。
          </AppAlert>

          <AppPanel
            v-if="calculationRun.result.value"
            title="計算結果"
            flush
            class="indicator-calculation-panel__result"
          >
            <!-- 「這次用了多粗」與「用了幾根」是同一句話的兩半，所以並列。
             挑了一小時卻用五分鐘算出來的數字長得跟對的一模一樣，
             所以它必須看得見，而不是靠信任。 -->
            <template #meta>
              <!--
            「為什麼是這個數字」與那個數字擺在一起。
            它以前是一行常駐在執行條件底下的細字——而使用者會問這件事的時刻，
            正是他看到「實際採用 24 根」卻要了 25 根的那一刻，不是他剛打開畫面的時候。
          -->
              <span data-testid="used-candle-count">
                實際採用 {{ calculationRun.result.value.usedCandleCount }} 根
                <AppBadge
                  variant="info"
                  data-testid="used-interval"
                >
                  每根涵蓋 {{ calculationRun.result.value.intervalLabel }}
                </AppBadge>
                <AppBadge variant="info">
                  {{ calculationRun.result.value.resultTypeLabel }}
                </AppBadge>
                <span
                  class="indicator-calculation-panel__notice"
                  data-testid="calculation-notice"
                >只採用已經走完的那幾格——還在走的那一格不算，它的數字還會變。</span>
              </span>
            </template>

            <!--
                沒畫滿時的那一句，緊貼在那兩個數字旁邊——使用者會問這件事的時刻，
                正是他看到「實際採用 50 根」的那一刻。

                它**不是錯誤**：結果是有效的，只是以較短的行情算出來的，所以用提醒的強度，
                不用危險的紅色。要不要說、怎麼說都由領域決定，這裡只問它有沒有話講。
              -->
            <AppAlert
              v-if="calculationRun.result.value.shortCoverageMessage"
              tone="warning"
              data-testid="short-coverage-alert"
            >
              {{ calculationRun.result.value.shortCoverageMessage }}
            </AppAlert>

            <p
              v-if="calculationRun.result.value.isEmpty"
              class="indicator-calculation-panel__empty"
              data-testid="empty-result"
            >
              這次沒有算出任何指標。算式可以什麼都不放進結果，這不算失敗。
            </p>

            <p
              v-else-if="calculationRun.result.value.isSignal"
              class="indicator-calculation-panel__signal"
              :class="`indicator-calculation-panel__signal--${calculationRun.result.value.signalTone}`"
              data-testid="signal-verdict"
            >
              {{ calculationRun.result.value.signalLabel }}
            </p>

            <div
              v-else
              class="indicator-calculation-panel__scroller"
            >
              <table class="indicator-calculation-panel__table">
                <thead>
                  <tr>
                    <th scope="col">
                      指標名稱
                    </th>
                    <th scope="col">
                      數值
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="indicatorValue in calculationRun.result.value.indicatorValues"
                    :key="indicatorValue.name"
                    data-testid="indicator-row"
                  >
                    <td class="indicator-calculation-panel__indicator-name">
                      {{ indicatorValue.name }}
                    </td>
                    <td>
                      <span
                        v-if="indicatorValue.isEmptySeries"
                        class="indicator-calculation-panel__empty-series"
                        data-testid="empty-series"
                      >空的一串</span>
                      <ol
                        v-else-if="indicatorValue.isSeries"
                        class="indicator-calculation-panel__series"
                      >
                        <li
                          v-for="(displayValue, position) in indicatorValue.displayValues"
                          :key="position"
                          class="indicator-calculation-panel__series-item"
                          data-testid="series-item"
                        >
                          {{ displayValue }}
                        </li>
                      </ol>
                      <span
                        v-else
                        class="indicator-calculation-panel__value"
                      >{{ indicatorValue.displayValues[0] }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AppPanel>
        </div>
      </form>

      <StrategyScriptBacktestPane
        v-if="workbench.offersBacktest"
        v-show="destination === 'backtest'"
        :id="backtestFormId"
        ref="backtestPane"
        v-model:symbol="symbol"
        v-model:aggregation-interval="aggregationInterval"
        :backtest-application="backtestApplication"
        :trading-symbol-application="tradingSymbolApplication"
        :time-zone="timeZone"
        :aggregation-interval-options="aggregationIntervalOptions"
        :script="script"
        :result-type="resultType"
        :parameters="strategyScriptParameters.parameters.value"
        :strategy-script-id="strategyScriptLibrary.namedStrategyScriptId.value"
        :workspace-generation="workspaceGeneration"
        :market-data-kind="marketDataKind"
        :replays-on-contract-account="workbench.replaysOnContractAccount"
      />
    </div>

    <!--
      手機上釘在最底下的主要動作：儲存與執行。「執行」送出的是此刻看得見的那個去處的表單，
      與條件那一塊裡那顆走同一條路。寬螢幕上兩樣都在各自的位置上，這一條不出現。
    -->
    <div class="indicator-calculation-panel__dock">
      <AppButton
        type="button"
        variant="secondary"
        block
        :disabled="strategyScriptLibrary.saving.value || readOnly"
        data-testid="dock-save-button"
        @click="strategyScriptLibrary.saveStrategyScript"
      >
        儲存
      </AppButton>
      <AppButton
        type="submit"
        block
        :form="destination === 'backtest' ? backtestFormId : indicatorPreviewFormId"
        :disabled="compactRunning"
        data-testid="dock-run-button"
      >
        {{ compactRunLabel }}
      </AppButton>
    </div>

    <!-- 兩份要查的清單收在同一個對話框裡：去查它們的時機是同一個。 -->
    <IndicatorScriptGuideDialog
      :open="guideOpen"
      :guide="scriptInputGuide"
      :parameter-accesses="scriptParameterAccesses"
      :signal-readings="signalReadings"
      @close="guideOpen = false"
    />

    <StrategyScriptLibraryDialog
      :open="strategyScriptLibrary.openDialog.value === 'library'"
      :strategy-scripts="strategyScriptLibrary.strategyScripts.value"
      :adopted-strategy-scripts="strategyScriptLibrary.adoptedStrategyScripts.value"
      :error-message="strategyScriptLibrary.listErrorMessage.value"
      :active-strategy-script-id="strategyScriptLibrary.activeStrategyScript.value?.id ?? null"
      :active-adopted-strategy-script-id="strategyScriptLibrary.activeAdoptedStrategyScript.value?.id ?? null"
      data-testid="strategy-script-library-dialog"
      @load="strategyScriptLibrary.selectStrategyScript"
      @remove="strategyScriptLibrary.askToDelete"
      @delete-adopted="strategyScriptLibrary.deleteAdoptedStrategyScript"
      @close="strategyScriptLibrary.closeDialog"
    />

    <StrategyScriptNameDialog
      :open="strategyScriptLibrary.openDialog.value === 'name'"
      title="另存為新策略腳本"
      hint="其餘內容取自畫面上目前的算式、指標值種類與參數。"
      :error-message="strategyScriptLibrary.nameErrorMessage.value"
      :submitting="strategyScriptLibrary.saving.value"
      @submit="strategyScriptLibrary.createStrategyScript"
      @cancel="strategyScriptLibrary.closeDialog"
    />

    <StrategyScriptNameDialog
      :open="strategyScriptLibrary.openDialog.value === 'rename'"
      title="重新命名"
      hint="只換名字與說明，這一支記著的算式與其餘設定都不會被動到。"
      :initial-name="strategyScriptLibrary.activeStrategyScript.value?.name ?? ''"
      :initial-description="strategyScriptLibrary.activeStrategyScript.value?.description ?? ''"
      :error-message="strategyScriptLibrary.nameErrorMessage.value"
      :submitting="strategyScriptLibrary.saving.value"
      data-testid="rename-dialog"
      @submit="strategyScriptLibrary.renameStrategyScript"
      @cancel="strategyScriptLibrary.closeDialog"
    />

    <ConfirmDialog
      :open="strategyScriptLibrary.openDialog.value === 'discard'"
      title="放棄尚未儲存的變更？"
      message="編輯區的內容已經改過而且還沒存。接下來這個動作會蓋掉它。"
      confirm-label="放棄並繼續"
      @confirm="strategyScriptLibrary.confirmDiscard"
      @cancel="strategyScriptLibrary.closeDialog"
    />

    <ConfirmDialog
      :open="strategyScriptLibrary.openDialog.value === 'delete'"
      title="刪除這支策略腳本？"
      message="刪掉就沒了，救不回來。編輯區的內容會留著。"
      confirm-label="刪除"
      variant="danger"
      @confirm="strategyScriptLibrary.confirmDelete"
      @cancel="strategyScriptLibrary.closeDialog"
    />

    <!--
      收回要先問，分享不用。分享做錯了收回就好，中間沒有人失去任何東西；
      收回做錯了，每一個加入過它的人都要重新加入一次，而你不會知道有誰。
    -->
    <ConfirmDialog
      :open="strategyScriptLibrary.openDialog.value === 'withdraw'"
      title="從市集收回這一支？"
      message="收回之後，所有把它加進自己清單的人都會失去它，而且你不會知道有誰。重新分享也不會讓他們自動回來。"
      confirm-label="收回"
      variant="danger"
      @confirm="strategyScriptLibrary.confirmWithdraw"
      @cancel="strategyScriptLibrary.closeDialog"
    />
  </div>
</template>

<style scoped lang="scss">
// 右邊那一欄的寬度。StrategyScriptBacktestPane 的條件那一欄是同一個數字——
// 兩欄上下疊著（參數在上、條件在下），差一點就對不齊。
$side-column-width: 17rem;
$library-column-width: 13rem;

// 整個工作台是一張格子，每一塊自己報出它住在哪一格。
//
// 手機：一欄到底——三段切換、編輯器（或參數、說明）、去處分頁、條件與結果、底下那一條動作。
// 中寬：編輯器與參數並排，去處橫跨兩欄（它自己再分成「結果 │ 條件」，條件對著參數）。
// 寬：   左邊多一欄常駐的腳本庫。
.indicator-calculation-panel {
  display: grid;
  gap: spacing('sm');
  grid-template-areas:
    'sections'
    'workbench'
    'parameters'
    'guide'
    'destinations'
    'outcome'
    'dock';
  grid-template-columns: minmax(0, 1fr);
  align-items: start;

  @include respond-to('lg') {
    grid-template-areas:
      'workbench parameters'
      'destinations parameters'
      'outcome outcome';
    grid-template-columns: minmax(0, 1fr) $side-column-width;
  }

  @include respond-to('xl') {
    grid-template-areas:
      'library workbench parameters'
      'library destinations parameters'
      'library outcome outcome';
    grid-template-columns: $library-column-width minmax(0, 1fr) $side-column-width;
  }

  // 腳本庫只在放得下第三欄時常駐；它自己捲，不把整頁撐長。
  &__library {
    display: none;
    grid-area: library;
    align-self: stretch;
    max-height: 48rem;
    overflow-y: auto;

    @include respond-to('xl') {
      display: flex;
    }
  }

  &__sections {
    grid-area: sections;

    @include respond-to('lg') {
      display: none;
    }
  }

  // 手機上三段只看得見一段；另外兩段仍然掛著（只是收起來），寬螢幕上一律攤開。
  &__region {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    min-width: 0;

    &--folded {
      display: none;

      @include respond-to('lg') {
        display: flex;
      }
    }
  }

  &__workbench {
    grid-area: workbench;
  }

  &__parameters {
    grid-area: parameters;
    align-self: stretch;
  }

  &__compact-guide {
    grid-area: guide;

    @include respond-to('lg') {
      display: none;
    }
  }

  // 腳本庫常駐時，挑哪一支就是那一欄；這個選單只在它收起來的寬度上出現。
  &__picker {
    @include respond-to('xl') {
      display: none;
    }
  }

  &__until-library {
    @include respond-to('xl') {
      display: none;
    }
  }

  &__wide-only {
    display: none;

    @include respond-to('lg') {
      display: inline-flex;
    }
  }

  &__strategy-script-notice,
  &__strategy-script-error {
    margin: 0;
    font-size: font-size('xs');
  }

  &__strategy-script-notice {
    color: color('text-muted');
  }

  &__strategy-script-error {
    color: color('danger');
  }

  // 編輯區是這個畫面上唯一需要空間的東西：它有一個夠寫的底線，
  // 多出來的高度落在檔尾（見編輯器自己的 __filler），點下去就是接著往下寫。
  &__editor {
    flex: 1;
    min-width: 0;
    min-height: 28rem;
  }

  &__result-type {
    width: auto;
  }

  &__parameter-body {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__lead,
  &__notice {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__destinations {
    grid-area: destinations;
    align-self: end;
  }

  &__outcome {
    grid-area: outcome;
    min-width: 0;
  }

  // 一個去處：「這一次說了什麼」在左、「這一次怎麼跑」在右；手機上條件在上、結果在下。
  &__destination {
    display: grid;
    gap: spacing('sm');
    grid-template-areas:
      'run'
      'findings';
    grid-template-columns: minmax(0, 1fr);
    align-items: start;

    @include respond-to('lg') {
      grid-template-areas: 'findings run';
      grid-template-columns: minmax(0, 1fr) $side-column-width;
    }
  }

  &__run {
    grid-area: run;
  }

  &__run-fields {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__span {
    display: grid;
    gap: spacing('2xs');
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  &__findings {
    display: flex;
    grid-area: findings;
    flex-direction: column;
    gap: spacing('sm');
    min-width: 0;
  }

  &__placeholder {
    margin: 0;
    border: 1px dashed color('border-strong');
    border-radius: radius('md');
    padding: spacing('xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('sm');
    text-align: center;
  }

  // 手機上的主要動作釘在畫面最底下，拇指搆得到的地方。
  //
  // 版型底下那一排分頁也釘在最底下；它的高度由版型給（`--console-bottom-navigation-height`），
  // 這一條就停在它的正上方。版型沒給的時候貼齊底邊。
  &__dock {
    display: grid;
    position: sticky;
    bottom: var(--console-bottom-navigation-height, 0);
    grid-area: dock;
    gap: spacing('xs');
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    border-top: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('xs') 0;

    @include respond-to('lg') {
      display: none;
    }
  }

  &__result {
    // 一串很長的指標值不該把整頁撐長——結果自己在框裡捲。
    max-height: 32rem;
  }

  &__empty {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }

  &__signal {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    font-size: font-size('2xl');
    font-weight: font-weight('bold');
    text-align: center;

    &--positive {
      color: color('success');
    }

    &--negative {
      color: color('danger');
    }

    &--neutral {
      color: color('text-strong');
    }
  }

  &__series {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('3xs');
    justify-content: flex-end;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__series-item,
  &__value {
    border-radius: radius('xs');
    background-color: color('surface-muted');
    padding: 0 spacing('2xs');
    color: color('text-strong');

    @include numeric;
  }

  &__indicator-name {
    color: color('text-strong');
    font-family: font-family('mono');
  }

  &__empty-series {
    color: color('text-faint');
  }

  &__scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &__table {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
    font-size: font-size('xs');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('2xs') spacing('sm');
      text-align: left;
    }

    td:last-child,
    th:last-child {
      text-align: right;
    }

    th {
      position: sticky;
      top: 0;

      // sticky 的表頭必須自己不透明，否則捲上來的列會從它底下透出來。
      background-color: color('surface-muted');
      white-space: nowrap;

      @include dense-label;
    }

    // 指標名稱那一欄只要放得下名字就好，剩下的寬度全部留給值
    td:first-child {
      width: 1%;
      white-space: nowrap;
    }
  }
}
</style>
