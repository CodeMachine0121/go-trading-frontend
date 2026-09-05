<script setup lang="ts">
import Decimal from 'decimal.js'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import BacktestConditionFields from '~/components/molecules/BacktestConditionFields.vue'
import BacktestEquityCurveChart from '~/components/molecules/BacktestEquityCurveChart.vue'
import BacktestSummaryCard from '~/components/molecules/BacktestSummaryCard.vue'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { useBacktestRun } from '~/composables/use-backtest-run'

// 有機體：回測這一整個去處。
//
// 它持有的是**只屬於回測的那幾件事**：時間區間、本金、押注方式，以及最近那一次的結果。
// 工作區的每一樣東西（算式、參數、市場、彙總刻度）都是以 props 進來的——
// 那些是兩個去處共用的，這裡只是借來用，不能擁有。
const {
  backtestApplication,
  tradingSymbolApplication,
  timeZone,
  aggregationIntervalOptions,
  scriptBody,
  parameters,
  workspaceGeneration,
  backendUnreachable = false,
} = defineProps<{
  backtestApplication: BacktestApplication
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
  scriptBody: string
  parameters: readonly StrategyParameterDto[]
  /**
   * 工作區被換掉了幾次。
   *
   * 它是一個數字而不是算式的內容，因為後者每敲一個字都會變。這裡要知道的是
   * 「整份工作區被換成另一支策略了」——那時上一次的成績單就與畫面上這一份無關了。
   */
  workspaceGeneration: number
  /** 後端連不上時執行鍵一併停用：按了也沒用，不要讓他按。 */
  backendUnreachable?: boolean
}>()

// 市場與彙總刻度是兩個去處共用的那一份，所以是雙向繫結而不是自己的狀態：
// 在哪一邊改都是改同一個東西，「另一邊看到的就是改過的」不需要任何同步邏輯。
const symbol = defineModel<string>('symbol', { required: true })
const aggregationInterval = defineModel<string>('aggregationInterval', { required: true })

const backtestRun = useBacktestRun(backtestApplication)

const positionSizingModeOptions = backtestApplication.listPositionSizingModeOptions()

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

// 換了一份工作區，上一次那次重演就與畫面上這一份無關了——結果與失敗訊息一起清掉。
watch(() => workspaceGeneration, () => backtestRun.clear())

async function runBacktest() {
  await backtestRun.run(() => new BacktestRequestDto(
    symbol.value,
    aggregationInterval.value,
    timeZone.parseMinuteInput(startTime.value),
    timeZone.parseMinuteInput(endTime.value),
    scriptBody,
    parameters,
    new Decimal(initialCapital.value === '' ? Number.NaN : initialCapital.value),
    positionSizingMode.value as PositionSizingMode,
    new Decimal(positionSizingValue.value === '' ? Number.NaN : positionSizingValue.value),
  ))
}
</script>

<template>
  <form
    class="strategy-backtest-pane"
    @submit.prevent="runBacktest"
  >
    <AppPanel title="回測條件">
      <template #meta>
        <AppBadge variant="info">
          只影響這一次
        </AppBadge>
      </template>

      <BacktestConditionFields
        v-model:symbol="symbol"
        v-model:aggregation-interval="aggregationInterval"
        v-model:start-time="startTime"
        v-model:end-time="endTime"
        v-model:initial-capital="initialCapital"
        v-model:position-sizing-mode="positionSizingMode"
        v-model:position-sizing-value="positionSizingValue"
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
      />

      <p
        v-if="backtestRun.messageFor('scriptBody')"
        class="strategy-backtest-pane__script-error"
        data-testid="backtest-script-body-error"
      >
        {{ backtestRun.messageFor('scriptBody') }}
      </p>
    </AppPanel>

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
      重演中…每一根 K 線都要跑一次算式，一段長期間可能要等上數十秒。
    </AppAlert>

    <!-- 三塊東西一起出現：成績單說結論，曲線說形狀，明細說每一筆。 -->
    <template v-if="backtestRun.result.value">
      <AppPanel title="成績單">
        <template #meta>
          <span data-testid="backtest-used-candle-count">
            重演了 {{ backtestRun.result.value.usedCandleCount }} 根
            <AppBadge variant="info">
              每根涵蓋 {{ backtestRun.result.value.intervalLabel }}
            </AppBadge>
          </span>
        </template>

        <BacktestSummaryCard :summary="backtestRun.result.value.summary" />
      </AppPanel>

      <AppPanel
        title="資金曲線"
        flush
      >
        <BacktestEquityCurveChart
          :equity-curve="backtestRun.result.value.equityCurve"
          :time-zone="timeZone"
        />
      </AppPanel>

      <AppPanel title="交易明細">
        <BacktestTradeTable
          :closed-trades="backtestRun.result.value.closedTrades"
          :time-zone="timeZone"
        />
      </AppPanel>
    </template>
  </form>
</template>

<style scoped lang="scss">
.strategy-backtest-pane {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__script-error {
    margin: spacing('2xs') 0 0;
    color: color('danger');
    font-size: font-size('sm');
  }
}
</style>
