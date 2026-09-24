<script setup lang="ts">
import Decimal from 'decimal.js'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import BacktestConditionFields from '~/components/molecules/BacktestConditionFields.vue'
import BacktestRuleGuideDialog from '~/components/molecules/BacktestRuleGuideDialog.vue'
import BacktestResultSections from '~/components/organisms/BacktestResultSections.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { FillTiming } from '~/domain/models/vo/fill-timing-vo'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'
import { useTradingStrategyBacktestRun } from '~/composables/use-trading-strategy-backtest-run'

// 有機體：重演這一份交易策略。
//
// 它與重演一支策略腳本那一塊做的是同一件事，少了兩格：**算式與彙總刻度**。
// 那兩樣都是那份交易策略自己說的——每個信號來源各帶一支腳本與一個刻度。
// 在這裡畫一個挑得動的選單，等於在畫面上放第二個答案。
const {
  backtestApplication,
  tradingSymbolApplication,
  timeZone,
  tradingStrategyId,
  savedGeneration,
  backendUnreachable = false,
  marketDataKind = 'kCandle',
  replaysOnContractAccount = false,
  tradingModeLabel = null,
} = defineProps<{
  backtestApplication: BacktestApplication
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  /** 要重演哪一份。還沒存過的那一份是 `null`——沒有東西可以指名。 */
  tradingStrategyId: number | null
  /**
   * 這一份被存過幾次。
   *
   * 存過一次，上一張成績單說的就是上一版的規則了——留著它比清掉更糟，
   * 因為它看起來仍然是「這一份」的成績。
   */
  savedGeneration: number
  /** 後端連不上時執行鍵一併停用：按了也沒用，不要讓他按。 */
  backendUnreachable?: boolean
  /** 這一份吃哪一種行情——決定「回測照什麼規則走」讀哪一份。 */
  marketDataKind?: MarketDataKind
  /** 這一份是合約交易策略：在合約帳戶上重演，多問槓桿與滑點。 */
  replaysOnContractAccount?: boolean
  /** 合約交易策略自己的交易模式，例如「只做多」。重演時不能另外挑。 */
  tradingModeLabel?: string | null
}>()

const symbol = ref('')
// 彙總刻度由那份交易策略自己說，所以這一格是唯讀的一句話；
// 它仍然要一個繫結的值，因為條件那一塊是兩種受測對象共用的。
const aggregationInterval = ref('')

const backtestRun = useTradingStrategyBacktestRun(backtestApplication)

const positionSizingModeOptions = backtestApplication.listPositionSizingModeOptions()

// 回測照什麼規則走。兩種受測對象讀的是同一份——規則本來就是同一套。
const signalReadings = backtestApplication.listSignalReadings()
// 合約交易策略讀的是合約那一份規則。
const backtestRules = computed(() => backtestApplication.listBacktestRules(marketDataKind))
const ruleGuideOpen = ref(false)

const defaultTimeRange = backtestApplication.defaultTimeRange(new Date())
const startTime = ref(timeZone.formatMinuteInput(defaultTimeRange.startTime))
const endTime = ref(timeZone.formatMinuteInput(defaultTimeRange.endTime))

const initialCapital = ref(backtestApplication.defaultInitialCapital().toString())
const positionSizingMode = ref<string>(backtestApplication.defaultPositionSizingMode())
const positionSizingValue = ref('50')
// 兩個出場距離。預設留白，而留白就是不模擬。
//
// 它們在這一邊是**填得動的輸入框**，而不是彙總刻度那種一句話：
// 刻度是那份交易策略自己說的，而一份交易策略對「它的主人能忍多少」沒有意見。
const stopLossPercentage = ref('')
const takeProfitPercentage = ref('')
// 兩個費率。**預設留白，而留白就是不收費**——同樣的理由：
// 替既有的每一次重演補一個「常見費率」，就是在沒有人動手的情況下
// 改掉使用者手上每一張成績單。
const entryCostPercentage = ref('')
const exitCostPercentage = ref('')
// 合約重演多問的那兩格；交易模式是那份交易策略自己的，這裡只寫出來。
const leverage = ref('')
const slippagePercentage = ref('')
// 短線回測多問的兩格。成交時點從收盤成交開始（與這兩格出現以前一樣）；
// 驗證起點留白就是不切分。
const fillTimingOptions = backtestApplication.listFillTimingOptions()
const fillTiming = ref<string>(fillTimingOptions[0]?.value ?? 'close')
const validationStartTime = ref('')
const contractTradingModeNote = computed(
  () => (tradingModeLabel === null ? null : `${tradingModeLabel}（由這份交易策略決定，要換請改交易策略）`))

// 規則被改存過之後，上一次那次重演說的就是上一版了。
watch(() => savedGeneration, () => backtestRun.clear())

async function runBacktest() {
  if (replaysOnContractAccount) {
    await backtestRun.runContract(buildRequest, () => new ContractBacktestTermsDto(
      new Decimal(leverage.value === '' ? 0 : leverage.value),
      new Decimal(slippagePercentage.value === '' ? 0 : slippagePercentage.value),
      // 交易模式不送：它是那份交易策略自己的。
      null,
    ))

    return
  }

  await backtestRun.run(buildRequest)
}

function buildRequest(): TradingStrategyBacktestRequestDto {
  return new TradingStrategyBacktestRequestDto(
    tradingStrategyId ?? 0,
    symbol.value,
    timeZone.parseMinuteInput(startTime.value),
    timeZone.parseMinuteInput(endTime.value),
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
    fillTiming.value as FillTiming,
    // 留白就是不切分；填了就照使用者的時區讀成那一刻。
    validationStartTime.value === '' ? null : timeZone.parseMinuteInput(validationStartTime.value),
  )
}
</script>

<template>
  <form
    class="trading-strategy-backtest-pane"
    @submit.prevent="runBacktest"
  >
    <!--
      還沒存過的那一份沒有東西可以指名。說清楚下一步是先存，
      比讓他填完四格再被擋下來好。
    -->
    <AppAlert
      v-if="tradingStrategyId === null"
      tone="info"
      data-testid="trading-strategy-backtest-unsaved"
    >
      這一份還沒存過，所以還沒有東西可以拿去回測。先存起來，再回來這裡。
    </AppAlert>

    <AppPanel title="回測條件">
      <template #meta>
        <AppBadge variant="info">
          只影響這一次
        </AppBadge>
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
        v-model:slippage-percentage="slippagePercentage"
        v-model:fill-timing="fillTiming"
        v-model:validation-start-time="validationStartTime"
        :fill-timing-options="fillTimingOptions"
        :fill-timing-error="backtestRun.messageFor('fillTiming')"
        :validation-start-time-error="backtestRun.messageFor('validationStartTime')"
        :replays-on-contract-account="replaysOnContractAccount"
        :contract-trading-mode-note="contractTradingModeNote"
        :leverage-error="backtestRun.messageFor('leverage')"
        :trading-mode-error="backtestRun.messageFor('tradingMode')"
        :slippage-error="backtestRun.messageFor('slippage')"
        :trading-symbol-application="tradingSymbolApplication"
        :time-zone="timeZone"
        :aggregation-interval-options="[]"
        :aggregation-interval-note="'由這份交易策略的訊號來源決定——這一版要求它們一致'"
        :position-sizing-mode-options="positionSizingModeOptions"
        :running="backtestRun.running.value"
        :disabled="tradingStrategyId === null
          || backendUnreachable || backtestRun.backendUnreachable.value"
        :symbol-error="backtestRun.messageFor('symbol')"
        :time-range-error="backtestRun.messageFor('timeRange')"
        :initial-capital-error="backtestRun.messageFor('initialCapital')"
        :position-sizing-value-error="backtestRun.messageFor('positionSizingValue')"
        :exit-levels-error="backtestRun.messageFor('exitLevels')"
        :transaction-costs-error="backtestRun.messageFor('transactionCosts')"
      />
    </AppPanel>

    <!--
      這幾則說明的語氣與措辭刻意與重演一支腳本一字不差：
      同一份算式壞掉時，兩個地方不該講出兩種故事。
    -->
    <AppAlert
      v-if="backtestRun.parameterNotDeclaredMessage.value"
      tone="danger"
      data-testid="backtest-parameter-not-declared-alert"
    >
      參數的問題（要改的是那個訊號來源填的值，或算式裡取用它的那一行）：{{ backtestRun.parameterNotDeclaredMessage.value }}
    </AppAlert>

    <AppAlert
      v-if="backtestRun.scriptFailedMessage.value"
      tone="danger"
      data-testid="backtest-script-failed-alert"
    >
      算式的問題（要改的是那個訊號來源指名的策略腳本）：{{ backtestRun.scriptFailedMessage.value }}
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
      回測中…每一根 K 線上每個訊號來源都要各跑一次算式，一段長期間可能要等上數十秒；超過九十秒交易服務會中止這一次。
    </AppAlert>

    <!-- 畫成哪幾塊由結果自己說：沒有驗證起點時只有一塊，與這個功能出現以前一模一樣。 -->
    <BacktestResultSections
      v-if="backtestRun.result.value"
      :result="backtestRun.result.value"
      :time-zone="timeZone"
    />

    <BacktestRuleGuideDialog
      :open="ruleGuideOpen"
      :signal-readings="signalReadings"
      :rules="backtestRules"
      @close="ruleGuideOpen = false"
    />
  </form>
</template>

<style scoped lang="scss">
.trading-strategy-backtest-pane {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
}
</style>
