<script setup lang="ts">
import Decimal from 'decimal.js'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import BacktestConditionFields from '~/components/molecules/BacktestConditionFields.vue'
import BacktestRuleGuideDialog from '~/components/molecules/BacktestRuleGuideDialog.vue'
import BacktestResultSections from '~/components/organisms/BacktestResultSections.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import { useBacktestRun } from '~/composables/use-backtest-run'

// 有機體：回測這一整個去處。
//
// 它持有的是**只屬於回測的那幾件事**：時間區間、本金、押注方式，以及最近那一次的結果。
// 工作區的每一樣東西（算式、參數、市場、彙總刻度）都是以 props 進來的——
// 那些是兩個去處共用的，這裡只是借來用，不能擁有。
//
// 版面是兩塊：左邊（手機上是下面）是這一次說了什麼——提示與成績單、資金曲線、交易明細；
// 右邊（手機上是上面）是回測條件。右邊那一欄與工作台上參數那一欄同寬、上下對齊，
// 旋鈕與條件因此落在同一條直線上：調一個、跑一次、看左邊，是同一個動作的三拍。
const {
  backtestApplication,
  tradingSymbolApplication,
  timeZone,
  aggregationIntervalOptions,
  script,
  resultType,
  parameters,
  strategyScriptId,
  workspaceGeneration,
  backendUnreachable = false,
  marketDataKind = 'kCandle',
  replaysOnContractAccount = false,
} = defineProps<{
  backtestApplication: BacktestApplication
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
  script: string
  /** 工作區宣告的指標值種類。回測只跑「一個數字」，不對就當場說清楚。 */
  resultType: string
  parameters: readonly StrategyScriptParameterDto[]
  /**
   * 工作區裡那一支我加入的策略腳本。有它時回測指名它本身，不帶任何算式——
   * 從市集加入的那些沒有算式可以送。
   */
  strategyScriptId?: number
  /**
   * 工作區被換掉了幾次。
   *
   * 它是一個數字而不是算式的內容，因為後者每敲一個字都會變。這裡要知道的是
   * 「整份工作區被換成另一支策略腳本了」——那時上一次的成績單就與畫面上這一份無關了。
   */
  workspaceGeneration: number
  /** 後端連不上時執行鍵一併停用：按了也沒用，不要讓他按。 */
  backendUnreachable?: boolean
  /** 這一塊工作區吃哪一種行情——決定「回測照什麼規則走」讀哪一份。 */
  marketDataKind?: MarketDataKind
  /**
   * 這一種行情的回測是在合約帳戶上重演：多問槓桿、交易模式、滑點，
   * 成績單與明細多出合約那幾格。由工作區的行情種類說，不由這裡比對。
   */
  replaysOnContractAccount?: boolean
}>()

// 市場與彙總刻度是兩個去處共用的那一份，所以是雙向繫結而不是自己的狀態：
// 在哪一邊改都是改同一個東西，「另一邊看到的就是改過的」不需要任何同步邏輯。
const symbol = defineModel<string>('symbol', { required: true })
const aggregationInterval = defineModel<string>('aggregationInterval', { required: true })

const backtestRun = useBacktestRun(backtestApplication)

const positionSizingModeOptions = backtestApplication.listPositionSizingModeOptions()

// 回測照什麼規則走。三份都不會變，取一次就好——它們描述的是系統的行為，不是這一次的資料。
const signalReadings = backtestApplication.listSignalReadings()
const backtestRules = backtestApplication.listBacktestRules(marketDataKind)
const contractTradingModeOptions = backtestApplication.listContractTradingModeOptions()
/** 那份規則開著沒有。它是第一次用時讀一遍的東西，所以擺在一顆鍵後面。 */
const ruleGuideOpen = ref(false)

/**
 * 一打開就填好的那一段。時間選擇器吃的是當地讀數，所以在這裡就換成使用者的時區——
 * 而預設值本身（三十天前的零點、昨天的最後一刻）是規則，由 domain 給。
 */
const defaultTimeRange = backtestApplication.defaultTimeRange(new Date())
const startTime = ref(timeZone.formatMinuteInput(defaultTimeRange.startTime))
const endTime = ref(timeZone.formatMinuteInput(defaultTimeRange.endTime))

const initialCapital = ref(backtestApplication.defaultInitialCapital().toString())
const positionSizingMode = ref<string>(backtestApplication.defaultPositionSizingMode())
// 那一格的數字活在自己的 ref 裡，切換模式時不清掉：使用者在百分比填了 50、
// 切去全押看一眼再切回來，50 還在——他本來就沒有改過它。
const positionSizingValue = ref('50')
// 這一次照哪一套規矩操作。它與上面那幾格一樣活在自己的 ref 裡，
// 所以換它不會動到任何別的東西，也不會清掉上一張成績單。
// 兩個出場距離。**預設留白，而留白就是不模擬**——
// 這一刀之前的每一次重演都沒有停損，替它們補一個就是在沒有人動手的
// 情況下改掉使用者手上每一張成績單。
const stopLossPercentage = ref('')
const takeProfitPercentage = ref('')
// 兩個費率。**預設留白，而留白就是不收費**——同樣的理由：
// 替既有的每一次重演補一個「常見費率」，就是在沒有人動手的情況下
// 改掉使用者手上每一張成績單。
const entryCostPercentage = ref('')
const exitCostPercentage = ref('')
// 合約重演多問的那三格。槓桿與滑點留白就是「沒說」；交易模式從第一個選項（多空反手）開始。
const leverage = ref('')
const tradingMode = ref<string>(contractTradingModeOptions[0]?.value ?? 'longShort')
const slippagePercentage = ref('')
// 短線回測多問的兩格。成交時點從收盤成交開始（與這兩格出現以前一樣）；
// 驗證起點留白就是不切分。
const fillTimingOptions = backtestApplication.listFillTimingOptions()
const fillTiming = ref<string>(fillTimingOptions[0]?.value ?? 'close')
const validationStartTime = ref('')

/**
 * 這一次還什麼都沒說：沒跑過、沒在跑、也沒有任何一則提示。
 * 那時結果那一塊不留白，而是說一句「按下去之後這裡會出現什麼」。
 */
const quiet = computed(() => backtestRun.result.value === null
  && !backtestRun.running.value
  && !backtestRun.backendUnreachable.value
  && backtestRun.parameterNotDeclaredMessage.value === null
  && backtestRun.scriptFailedMessage.value === null
  && backtestRun.requestRejectedMessage.value === null
  && backtestRun.timeAllowanceSpentMessage.value === null
  && backtestRun.serverErrorMessage.value === null)

// 工作台手機上釘在底下的那顆「執行回測」送出的是這一張表單；它要知道這一次是不是還在跑，
// 才能與這裡自己那顆一起停用——兩顆鍵，同一條規矩。
defineExpose({ running: backtestRun.running })

// 換了一份工作區，上一次那次重演就與畫面上這一份無關了——結果與失敗訊息一起清掉。
watch(() => workspaceGeneration, () => backtestRun.clear())

async function runBacktest() {
  if (replaysOnContractAccount) {
    await backtestRun.runContract(buildRequest, () => new ContractBacktestTermsDto(
      // 留白是零，而零就是「沒說」：一倍、不計滑點。
      new Decimal(leverage.value === '' ? 0 : leverage.value),
      new Decimal(slippagePercentage.value === '' ? 0 : slippagePercentage.value),
      tradingMode.value as ContractTradingMode,
    ))

    return
  }

  await backtestRun.run(buildRequest)
}

function buildRequest(): BacktestRequestDto {
  return new BacktestRequestDto(
    symbol.value,
    aggregationInterval.value,
    timeZone.parseMinuteInput(startTime.value),
    timeZone.parseMinuteInput(endTime.value),
    script,
    resultType,
    parameters,
    new Decimal(initialCapital.value === '' ? Number.NaN : initialCapital.value),
    positionSizingMode.value as PositionSizingMode,
    new Decimal(positionSizingValue.value === '' ? Number.NaN : positionSizingValue.value),
    // 留白是零，而零就是「沒有這個出場」。上面兩格留白讀成 `NaN`（一個錯誤），
    // 這兩格讀成零（一個意思）——因為沒填初始資金是一件事情沒講完，
    // 而沒填停損距離本來就是一個完整的回答。
    new Decimal(stopLossPercentage.value === '' ? 0 : stopLossPercentage.value),
    new Decimal(takeProfitPercentage.value === '' ? 0 : takeProfitPercentage.value),
    // 兩個費率與上面兩格同一條規則：留白讀成零，而零就是「這一側不收費」。
    new Decimal(entryCostPercentage.value === '' ? 0 : entryCostPercentage.value),
    new Decimal(exitCostPercentage.value === '' ? 0 : exitCostPercentage.value),
    strategyScriptId,
    fillTiming.value as FillTiming,
    // 留白就是不切分；填了就照使用者的時區讀成那一刻。
    validationStartTime.value === '' ? null : timeZone.parseMinuteInput(validationStartTime.value),
  )
}
</script>

<template>
  <form
    class="strategy-script-backtest-pane"
    @submit.prevent="runBacktest"
  >
    <AppPanel
      title="回測條件"
      class="strategy-script-backtest-pane__conditions"
    >
      <template #meta>
        <AppBadge variant="info">
          只影響這一次
        </AppBadge>
        <!--
          規則擺在一顆鍵後面而不是攤在版面上：使用者會想讀它的時刻只有兩個——
          第一次用，以及看到一張不如預期的成績單時。其餘時候它只是在佔寬度。
        -->
        <AppButton
          type="button"
          variant="ghost"
          size="small"
          label="回測照什麼規則走"
          data-testid="backtest-rule-guide-button"
          @click="ruleGuideOpen = true"
        >
          <AppIcon name="info" />
        </AppButton>
      </template>

      <BacktestConditionFields
        v-model:symbol="symbol"
        v-model:aggregation-interval="aggregationInterval"
        v-model:start-time="startTime"
        v-model:end-time="endTime"
        v-model:initial-capital="initialCapital"
        v-model:position-sizing-mode="positionSizingMode"
        v-model:position-sizing-value="positionSizingValue"
        v-model:stop-loss-percentage="stopLossPercentage"
        v-model:take-profit-percentage="takeProfitPercentage"
        v-model:entry-cost-percentage="entryCostPercentage"
        v-model:exit-cost-percentage="exitCostPercentage"
        v-model:leverage="leverage"
        v-model:trading-mode="tradingMode"
        v-model:slippage-percentage="slippagePercentage"
        v-model:fill-timing="fillTiming"
        v-model:validation-start-time="validationStartTime"
        :fill-timing-options="fillTimingOptions"
        :fill-timing-error="backtestRun.messageFor('fillTiming')"
        :validation-start-time-error="backtestRun.messageFor('validationStartTime')"
        :replays-on-contract-account="replaysOnContractAccount"
        :contract-trading-mode-options="contractTradingModeOptions"
        :leverage-error="backtestRun.messageFor('leverage')"
        :trading-mode-error="backtestRun.messageFor('tradingMode')"
        :slippage-error="backtestRun.messageFor('slippage')"
        :trading-symbol-application="tradingSymbolApplication"
        :time-zone="timeZone"
        :aggregation-interval-options="aggregationIntervalOptions"
        :position-sizing-mode-options="positionSizingModeOptions"
        :running="backtestRun.running.value"
        :disabled="backendUnreachable || backtestRun.backendUnreachable.value"
        :symbol-error="backtestRun.messageFor('symbol')"
        :time-range-error="backtestRun.messageFor('timeRange')"
        :initial-capital-error="backtestRun.messageFor('initialCapital')"
        :position-sizing-value-error="backtestRun.messageFor('positionSizingValue')"
        :exit-levels-error="backtestRun.messageFor('exitLevels')"
        :transaction-costs-error="backtestRun.messageFor('transactionCosts')"
      />

      <p
        v-if="backtestRun.messageFor('script')"
        class="strategy-script-backtest-pane__script-error"
        data-testid="backtest-script-error"
      >
        {{ backtestRun.messageFor('script') }}
      </p>
    </AppPanel>

    <div class="strategy-script-backtest-pane__outcome">
      <p
        v-if="quiet"
        class="strategy-script-backtest-pane__placeholder"
        data-testid="backtest-placeholder"
      >
        按「執行回測」，成績單、資金曲線與交易明細會出現在這裡。
      </p>

      <!--
        這幾則說明的語氣與措辭刻意與指標預覽一字不差：同一頁上的兩個去處，
        同一份算式壞掉時不該講出兩種故事。
      -->
      <AppAlert
        v-if="backtestRun.parameterNotDeclaredMessage.value"
        tone="danger"
        data-testid="backtest-parameter-not-declared-alert"
      >
        參數的問題（要改的是參數那一列的名字，或算式裡取用它的那一行）：{{ backtestRun.parameterNotDeclaredMessage.value }}
      </AppAlert>

      <AppAlert
        v-if="backtestRun.scriptFailedMessage.value"
        tone="danger"
        data-testid="backtest-script-failed-alert"
      >
        算式的問題（要改的是算式）：{{ backtestRun.scriptFailedMessage.value }}
      </AppAlert>

      <AppAlert
        v-else-if="backtestRun.requestRejectedMessage.value"
        tone="warning"
        data-testid="backtest-request-rejected-alert"
      >
        請求的問題：{{ backtestRun.requestRejectedMessage.value }}
      </AppAlert>

      <!--
        沒在允許時間內跑完不是算式的錯，也不是後端壞了：是這一段太長或刻度太細。
        說成前兩者，都會讓人去改一個沒有問題的東西。
      -->
      <AppAlert
        v-else-if="backtestRun.timeAllowanceSpentMessage.value"
        tone="warning"
        data-testid="backtest-time-allowance-spent-alert"
      >
        這一次重演沒在允許時間內跑完，所以沒有成績單。請縮短期間，或改用粗一點的彙總刻度再試：{{ backtestRun.timeAllowanceSpentMessage.value }}
      </AppAlert>

      <AppAlert
        v-else-if="backtestRun.serverErrorMessage.value"
        tone="danger"
        data-testid="backtest-server-error-alert"
      >
        後端出錯了（不是你的請求有問題），請稍後重試：{{ backtestRun.serverErrorMessage.value }}
        <template #action>
          <AppButton
            variant="secondary"
            size="small"
            :disabled="backtestRun.running.value"
            @click="runBacktest"
          >
            重試
          </AppButton>
        </template>
      </AppAlert>

      <AppAlert
        v-else-if="backtestRun.backendUnreachable.value"
        tone="danger"
        data-testid="backtest-unreachable-alert"
      >
        連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。
      </AppAlert>

      <AppAlert
        v-else-if="backtestRun.running.value"
        tone="info"
        data-testid="backtest-running-alert"
      >
        回測中…每一根 K 線都要跑一次算式，一段長期間可能要等上數十秒；超過九十秒交易服務會中止這一次。
      </AppAlert>

      <!-- 畫成哪幾塊由結果自己說：沒有驗證起點時只有一塊，與這個功能出現以前一模一樣。 -->
      <BacktestResultSections
        v-if="backtestRun.result.value"
        :result="backtestRun.result.value"
        :time-zone="timeZone"
      />
    </div>

    <BacktestRuleGuideDialog
      :open="ruleGuideOpen"
      :signal-readings="signalReadings"
      :rules="backtestRules"
      @close="ruleGuideOpen = false"
    />
  </form>
</template>

<style scoped lang="scss">
// 右邊那一欄的寬度。它與 IndicatorCalculationPanel 參數那一欄是同一個數字——
// 兩欄上下疊著，差一點就對不齊。
$side-column-width: 17rem;

.strategy-script-backtest-pane {
  display: grid;
  gap: spacing('sm');
  grid-template-areas:
    'conditions'
    'outcome';
  grid-template-columns: minmax(0, 1fr);
  align-items: start;

  @include respond-to('lg') {
    grid-template-areas: 'outcome conditions';
    grid-template-columns: minmax(0, 1fr) $side-column-width;
  }

  &__conditions {
    grid-area: conditions;
  }

  &__outcome {
    display: flex;
    grid-area: outcome;
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

  &__script-error {
    margin: spacing('2xs') 0 0;
    color: color('danger');
    font-size: font-size('sm');
  }
}
</style>
