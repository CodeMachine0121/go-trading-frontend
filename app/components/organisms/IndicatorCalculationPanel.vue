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
import IndicatorScriptGuideDialog from '~/components/molecules/IndicatorScriptGuideDialog.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyScriptPicker from '~/components/molecules/StrategyScriptPicker.vue'
import StrategyScriptNameDialog from '~/components/molecules/StrategyScriptNameDialog.vue'
import StrategyScriptLibraryDialog from '~/components/molecules/StrategyScriptLibraryDialog.vue'
import type { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import type { StrategyScriptApplication } from '~/application/strategy-script-application'
import type { StrategyScriptMarketplaceApplication } from '~/application/strategy-script-marketplace-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { CalculationSpanDto } from '~/domain/models/dto/calculation-span-dto'
import type { CalculationSpanUnit } from '~/domain/models/vo/calculation-span-vo'
import StrategyScriptParameterDialog from '~/components/molecules/StrategyScriptParameterDialog.vue'
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
// 版面由上而下照著使用者的順序擺，也就是每一台這類工作台的擺法
// （Databricks、Neon、Supabase 的查詢頁都是同一個形狀）：
//
//   現在用的是哪一支策略腳本  →  這一次要算什麼（一條橫列，最右邊是那顆按鈕）
//   →  算式與它的旋鈕（獨佔下面那一整片，右邊擺寫的時候要查的東西）
//   →  結果攤在最下面整排
//
// **執行條件是一條橫列，不是一根側欄。** 側欄得跟編輯區一樣高，
// 於是三個欄位下面永遠空著一大塊；而編輯區——這個畫面上唯一需要空間的東西——
// 反而被那根用不到的欄子擠窄。
const {
  indicatorCalculationApplication,
  strategyScriptApplication,
  strategyScriptMarketplaceApplication,
  tradingSymbolApplication,
  backtestApplication,
  timeZone,
  marketDataKind = 'kCandle',
} = defineProps<{
  indicatorCalculationApplication: IndicatorCalculationApplication
  strategyScriptApplication: StrategyScriptApplication
  /** 市集那一條線。這一頁只用它做一件事：把加入來的那一支從清單移除。 */
  strategyScriptMarketplaceApplication: StrategyScriptMarketplaceApplication
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
/** 宣告旋鈕的那一份開著沒有。同理——它是偶爾做一次的事。 */
const parametersOpen = ref(false)
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
  strategyScriptMarketplaceApplication,
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
</script>

<template>
  <div class="indicator-calculation-panel">
    <!-- 策略腳本那一列收成一塊面板，才不會一整排控制項懸在工作區的底色上。
         它不必有標題列——「策略腳本」兩個字就寫在它自己的欄位標籤上了。 -->
    <AppPanel class="indicator-calculation-panel__strategyScript">
      <StrategyScriptPicker
        :strategy-scripts="pickableStrategyScripts"
        :active-strategy-script-id="strategyScriptLibrary.activeStrategyScript.value?.id ?? null"
        @select="strategyScriptLibrary.selectStrategyScript"
      >
        <template #actions>
          <!-- 「新的」排第一：每一個檔案選單都是這個順序，肌肉記憶在那裡。 -->
          <AppButton
            type="button"
            variant="secondary"
            label="新的空白策略腳本"
            data-testid="new-strategy-script-button"
            @click="strategyScriptLibrary.startBlankStrategyScript"
          >
            <AppIcon name="new" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="strategyScriptLibrary.saving.value || readOnly"
            label="存回目前這一支"
            data-testid="save-strategy-script-button"
            @click="strategyScriptLibrary.saveStrategyScript"
          >
            <AppIcon name="save" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="readOnly"
            label="另存為新的一支"
            data-testid="save-as-strategy-script-button"
            @click="strategyScriptLibrary.openNameDialog"
          >
            <AppIcon name="save-as" />
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="strategyScriptLibrary.activeStrategyScript.value === null"
            label="重新命名"
            data-testid="rename-strategy-script-button"
            @click="strategyScriptLibrary.openRenameDialog"
          >
            <AppIcon name="rename" />
          </AppButton>
          <!--
            分享與收回就擺在這裡，而不是躲在清單裡：想分享的幾乎總是眼前這一支——
            剛調對、剛存好的那一支。要為它多開一個對話框、在一排列裡再找一次自己，
            是一段不必要的路。

            它與旁邊那幾顆一樣，作用對象是**使用中的那一支**；沒有使用中的那一支時
            它是禁用的，與「重新命名」同一條規則、同一個理由：那兩件事都需要先有一支。
          -->
          <AppButton
            v-if="!strategyScriptLibrary.activeStrategyScript.value?.published"
            type="button"
            variant="secondary"
            :disabled="strategyScriptLibrary.activeStrategyScript.value === null
              || strategyScriptLibrary.saving.value"
            label="分享到市集"
            data-testid="share-strategy-script-button"
            @click="shareActiveStrategyScript"
          >
            <AppIcon name="share" />
          </AppButton>
          <AppButton
            v-else
            type="button"
            variant="secondary"
            :disabled="strategyScriptLibrary.saving.value"
            label="從市集收回"
            data-testid="withdraw-strategy-script-button"
            @click="withdrawActiveStrategyScript"
          >
            <AppIcon name="unshare" />
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            label="策略腳本清單"
            data-testid="open-library-button"
            @click="strategyScriptLibrary.openLibrary"
          >
            <AppIcon name="library" />
          </AppButton>
        </template>
      </StrategyScriptPicker>

      <!--
        挑到一支我加入的，工作區就是唯讀的。這一句擺在選單正下方而不是編輯區裡：
        那一整排按不下去的按鈕就在它上面，看的人第一個問題是「為什麼按不下去」。
      -->
      <AppAlert
        v-if="readOnly"
        tone="info"
        data-testid="adopted-read-only-notice"
      >
        這支策略腳本是從市集加入的，不是你的——可以拿來試跑、回測，但不能修改。
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
    </AppPanel>

    <!--
      兩個直欄：左邊是**你在寫什麼**，右邊是**它算出什麼**。

      這是每一台工作台的形狀（編輯器／筆記本／查詢頁都是），而它成立的前提是
      右欄真的填得滿：右欄裝的不只是三個執行條件，還有那一整片結果——
      成績單、資金曲線、交易明細，或指標值那張表。
      （執行條件曾經是貼在頂上的一條橫列，理由是「三個欄位撐不起一根側欄」。
      有了結果之後那個理由就不成立了：撐起右欄的是結果，不是條件。）

      工作區留在左欄、與去處切換無關，所以**切換去處時算式編輯器完全不受影響**——
      那正是這一頁把兩件事放在一起的整個理由。
    -->
    <div class="indicator-calculation-panel__columns">
      <!-- 左欄：這支算法——算式、它自己的旋鈕，以及寫的時候翻一下的那份清單。 -->
      <div class="indicator-calculation-panel__workbench">
        <IndicatorScriptEditor
          v-model="script"
          class="indicator-calculation-panel__editor"
          :concealed="readOnly"
          :error-message="calculationRun.messageFor('script')"
        >
          <template #toolbar>
            <!--
            這個框裡的每一樣東西——算式、指標值種類、旋鈕——都是這支策略腳本記著的。
            對面那個「只影響這一次」是它的另一半：兩個標記擺在一起才看得出是一組，
            而這一頁只有這一個分別需要記住。
          -->
            <AppBadge variant="success">
              跟著策略腳本存
            </AppBadge>

            <AppSelect
              :model-value="resultType"
              :disabled="readOnly"
              class="indicator-calculation-panel__result-type"
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
              variant="secondary"
              label="帶入範例內容"
              :disabled="readOnly"
              data-testid="example-button"
              @click="fillExampleScript"
            >
              <AppIcon name="example" />
            </AppButton>
            <!--
            宣告旋鈕是偶爾做一次的事——寫算式時做一次，之後幾十次執行都不再動它。
            所以它在一顆按鈕後面，不佔編輯區的版面；數量寫在按鈕上，
            使用者不必打開就知道這支算式有沒有旋鈕。
          -->
            <AppButton
              type="button"
              :variant="calculationRun.messageFor('parameters') ? 'danger' : 'secondary'"
              data-testid="parameters-button"
              @click="parametersOpen = true"
            >
              參數 {{ strategyScriptParameters.fields.value.length }}
            </AppButton>
            <AppButton
              type="button"
              variant="ghost"
              label="算式裡可以用什麼"
              data-testid="script-guide-button"
              @click="guideOpen = true"
            >
              <AppIcon name="info" />
            </AppButton>
          </template>
        </IndicatorScriptEditor>
      </div>

      <!-- 右欄：拿這支算法做什麼，以及它說了什麼。 -->
      <div class="indicator-calculation-panel__outcome">
        <!-- 切換擺在右欄的頂上：它換掉的只有這一欄，左欄那份工作區與它無關。 -->
        <AppTabs
          v-if="workbench.offersBacktest"
          v-model="destination"
          :options="WORKBENCH_DESTINATIONS"
        />

        <!--
      兩個去處都掛著，只有一個看得見。用 v-show 而不是 v-if，
      是因為填到一半的回測條件與已經算出來的結果都必須留著——
      切過去再切回來，畫面與離開時一樣。
    -->
        <form
          v-show="destination === 'indicatorPreview'"
          class="indicator-calculation-panel__destination"
          @submit.prevent="calculateIndicator"
        >
          <!--
      執行條件是一條**貼在頂上的橫列**，不是一根高高的側欄。
      它描述的是「這一次要算什麼」——交易標的、看多長、多粗——三件事各一格，
      按下去的那顆在最右邊。做過這件事的工具（Databricks、Neon、Supabase）都是這樣擺：
      設定與動作連在同一條帶子上，寫東西的地方獨佔下面那一整片。
      擺成側欄的代價很具體：它得跟編輯區一樣高，於是三個欄位下面永遠空著一大塊。
    -->
          <!--
      這一頁只有一個分別要記住：**什麼跟著策略腳本走，什麼只屬於這一次**。
      它以前被拆成三句小灰字散在三個地方，於是沒有人讀——一句永遠掛著、
      每次都讀到的話，讀的人很快就會學會不讀它。
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

              <FormField
                label="彙總刻度"
              >
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
                class="indicator-calculation-panel__run-action"
                :disabled="calculationRun.calculating.value"
                data-testid="calculate-button"
              >
                {{ calculationRun.calculating.value ? '計算中…' : '執行計算' }}
              </AppButton>
            </div>
          </AppPanel>

          <!--
      說明橫跨整個寬度：它講的是剛剛那一次計算，不屬於左右任何一欄。
      刻意不包一層外框——包了，沒有任何說明的時候那個空盒子照樣吃掉一個間距，
      而 Vue 為沒渲染的東西留下的是註解節點，`:empty` 選不到它。
    -->
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
        </form>

        <StrategyScriptBacktestPane
          v-if="workbench.offersBacktest"
          v-show="destination === 'backtest'"
          v-model:symbol="symbol"
          v-model:aggregation-interval="aggregationInterval"
          class="indicator-calculation-panel__destination"
          :backtest-application="backtestApplication"
          :trading-symbol-application="tradingSymbolApplication"
          :time-zone="timeZone"
          :aggregation-interval-options="aggregationIntervalOptions"
          :script="script"
          :result-type="resultType"
          :parameters="strategyScriptParameters.parameters.value"
          :strategy-script-id="strategyScriptLibrary.namedStrategyScriptId.value"
          :workspace-generation="workspaceGeneration"
        />
      </div>
    </div>

    <StrategyScriptParameterDialog
      :open="parametersOpen"
      :fields="strategyScriptParameters.fields.value"
      :kind-options="strategyScriptParameters.kindOptions"
      :error-message="calculationRun.messageFor('parameters')"
      :read-only="readOnly"
      @close="parametersOpen = false"
      @add="strategyScriptParameters.add"
      @remove="strategyScriptParameters.remove"
      @rename="strategyScriptParameters.rename"
      @change-kind="strategyScriptParameters.changeKind"
      @change-value="strategyScriptParameters.changeValue"
    />

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
      @load="strategyScriptLibrary.selectStrategyScript"
      @remove="strategyScriptLibrary.askToDelete"
      @abandon="strategyScriptLibrary.abandonStrategyScript"
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
      hint="只換名字，這一支記著的算式與其餘設定都不會被動到。"
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
.indicator-calculation-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: spacing('sm');
  min-height: 0;

  // 兩個直欄。窄螢幕先疊起來：兩欄各半的寬度裝不下一段程式碼，
  // 而寫算式是這一頁存在的理由——寧可捲，也不要兩邊都太窄。
  &__columns {
    display: grid;
    flex: 1;
    gap: spacing('sm');
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;

    @include respond-to('lg') {
      // 左右各半。編輯區與結果都需要寬度，沒有一邊天生比較不重要——
      // 而任何不對稱的比例都要有一個理由，這裡沒有。
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }

  // 右欄：去處切換、執行條件、提示，然後結果。它自己捲——
  // 讓整頁捲的話，左邊的編輯區會跟著被推走，而使用者往下看結果時多半還想看得到算式。
  &__outcome {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    min-width: 0;

    @include respond-to('lg') {
      overflow-y: auto;
    }
  }

  // 每一個去處自己是一疊由上而下的區塊，與右欄本身的排法相同——
  // 多包了一層，但那一層不改變任何東西的位置。
  &__destination {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__strategyScript {
    flex: none;
  }

  &__strategy-script-notice,
  &__strategy-script-error {
    margin: 0;
    font-size: font-size('2xs');
  }

  &__strategy-script-notice {
    color: color('text-muted');
  }

  &__strategy-script-error {
    color: color('danger');
  }

  // 執行條件現在住在右欄裡，只有半個畫面寬——四樣東西排成一列會讓每一格都讀不出值。
  // 改成自動折行：寬的時候排得下就排一列，排不下就自己折，不必為每一段寬度各寫一條規則。
  &__run-fields {
    display: grid;
    gap: spacing('xs') spacing('sm');
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    align-items: end;
  }

  &__run-action {
    // 與同一列的輸入框對齊：它們的標籤在上面，按鈕沒有標籤。
    align-self: end;
  }

  // 左欄：算式與它的旋鈕。編輯區吃掉整個欄高——這一欄裡只有它。
  &__workbench {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    min-width: 0;

    // 給一個下限而不是 0：窄螢幕兩欄疊起來時，編輯區既不能被壓到只剩幾行，
    // 也不能吃掉整個視窗高度——後者會把結果推到看不見的地方，
    // 而使用者根本不知道它已經算完了。
    min-height: 18rem;
  }

  // 編輯區吃掉左欄剩下的所有高度。
  //
  // 它一度只寫了 min-width，於是編輯區長到自己的內容高度就停住，
  // 底下那一大塊灰是「沒有人要的高度」——而這一欄裡除了它沒有別的東西，
  // 那塊空白不屬於任何人。多出來的高度落在檔尾（見編輯器自己的 __filler），
  // 點下去就是接著往下寫。
  &__editor {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  &__result-type {
    width: auto;
  }

  &__notice {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__result {
    flex: none;

    // 一串很長的指標值不該把右欄撐長——結果自己在框裡捲。
    max-height: 24rem;
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
    border-radius: radius('sm');
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
