<script setup lang="ts">
import Decimal from 'decimal.js'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import BacktestConditionFields from '~/components/molecules/BacktestConditionFields.vue'
import BacktestRuleGuideDialog from '~/components/molecules/BacktestRuleGuideDialog.vue'
import BacktestEquityCurveChart from '~/components/molecules/BacktestEquityCurveChart.vue'
import BacktestSummaryCard from '~/components/molecules/BacktestSummaryCard.vue'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import type { TradingMode } from '~/domain/models/vo/trading-mode-vo'
import { TradingStrategyBacktestRequestDto } from '~/domain/models/dto/trading-strategy-backtest-request-dto'
import { useTradingStrategyBacktestRun } from '~/composables/use-trading-strategy-backtest-run'

// 有機體：重演這一份交易策略。
//
// 它與重演一支策略腳本那一塊做的是同一件事，少了三格：**算式、彙總刻度與交易模式**。
// 那三樣都是那份交易策略自己說的——每個信號來源各帶一支腳本與一個刻度，
// 而交易模式是那一份記著的性質。畫一個挑得動的選單，等於在畫面上放第二個答案。
const {
  backtestApplication,
  tradingSymbolApplication,
  timeZone,
  tradingStrategyId,
  savedTradingMode,
  savedGeneration,
  backendUnreachable = false,
} = defineProps<{
  backtestApplication: BacktestApplication
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  /** 要重演哪一份。還沒存過的那一份是 `null`——沒有東西可以指名。 */
  tradingStrategyId: number | null
  /**
   * **存起來的那一份**是哪一種交易模式。還沒存過的那一份是 `null`。
   *
   * 是存起來的那一個，不是表單上正在改的那一個：重演打的是
   * `/trading-strategies/{id}/backtests`，跑的是伺服器上那一份。
   * 顯示未存的值，會讓使用者拿著一張「現貨」標籤底下的多空反手成績單。
   */
  savedTradingMode: TradingMode | null
  /**
   * 這一份被存過幾次。
   *
   * 存過一次，上一張成績單說的就是上一版的規則了——留著它比清掉更糟，
   * 因為它看起來仍然是「這一份」的成績。
   */
  savedGeneration: number
  /** 後端連不上時執行鍵一併停用：按了也沒用，不要讓他按。 */
  backendUnreachable?: boolean
}>()

const symbol = ref('')
// 彙總刻度由那份交易策略自己說，所以這一格是唯讀的一句話；
// 它仍然要一個繫結的值，因為條件那一塊是兩種受測對象共用的。
const aggregationInterval = ref('')

const backtestRun = useTradingStrategyBacktestRun(backtestApplication)

const positionSizingModeOptions = backtestApplication.listPositionSizingModeOptions()

/**
 * 交易模式那一格要說的那一句話。
 *
 * 名字與說明來自 `TradingModeDomain`，與工作檯那一列、與重演一支腳本那兩顆按鈕
 * 讀的是同一份字串——使用者在三塊畫面上讀到的必須是對同一件事的同一種說法。
 *
 * 還沒存過的那一份用預設值，與後端對一份沒填的交易策略的讀法一字不差。
 */
const tradingModeNote = computed(() => {
  const optionDto = backtestApplication.tradingModeOption(savedTradingMode)

  return `由這份交易策略決定：${optionDto.label}——${optionDto.description}`
})

/**
 * 條件那一塊要一個繫結的值，因為它是兩種受測對象共用的。
 *
 * 這一塊挑不動交易模式，所以它從頭到尾不會變、也不會被送出去——
 * 與上面那個彙總刻度**同一個狀況、同一個寫法**：空字串說的正是「這裡沒有人挑過」。
 */
const unpickedTradingMode = ref('')

// 回測照什麼規則走。兩種受測對象讀的是同一份——規則本來就是同一套。
const signalReadings = backtestApplication.listSignalReadings()
const backtestRules = backtestApplication.listBacktestRules()
const ruleGuideOpen = ref(false)

const defaultTimeRange = backtestApplication.defaultTimeRange(new Date())
const startTime = ref(timeZone.formatMinuteInput(defaultTimeRange.startTime))
const endTime = ref(timeZone.formatMinuteInput(defaultTimeRange.endTime))

const initialCapital = ref(backtestApplication.defaultInitialCapital().toString())
const positionSizingMode = ref<string>(backtestApplication.defaultPositionSizingMode())
const positionSizingValue = ref('50')

// 規則被改存過之後，上一次那次重演說的就是上一版了。
watch(() => savedGeneration, () => backtestRun.clear())

async function runBacktest() {
  await backtestRun.run(() => new TradingStrategyBacktestRequestDto(
    tradingStrategyId ?? 0,
    symbol.value,
    timeZone.parseMinuteInput(startTime.value),
    timeZone.parseMinuteInput(endTime.value),
    new Decimal(initialCapital.value === '' ? Number.NaN : initialCapital.value),
    positionSizingMode.value as PositionSizingMode,
    new Decimal(positionSizingValue.value === '' ? Number.NaN : positionSizingValue.value),
  ))
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
      這一份還沒存過，所以還沒有東西可以拿去重演。先存起來，再回來這裡。
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
        v-model:trading-mode="unpickedTradingMode"
        :trading-symbol-application="tradingSymbolApplication"
        :time-zone="timeZone"
        :aggregation-interval-options="[]"
        :aggregation-interval-note="'由這份交易策略的信號來源決定——這一版要求它們一致'"
        :position-sizing-mode-options="positionSizingModeOptions"
        :trading-mode-options="[]"
        :trading-mode-note="tradingModeNote"
        :running="backtestRun.running.value"
        :disabled="tradingStrategyId === null
          || backendUnreachable || backtestRun.backendUnreachable.value"
        :symbol-error="backtestRun.messageFor('symbol')"
        :time-range-error="backtestRun.messageFor('timeRange')"
        :initial-capital-error="backtestRun.messageFor('initialCapital')"
        :position-sizing-value-error="backtestRun.messageFor('positionSizingValue')"
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
      參數的問題（要改的是那個信號來源填的值，或算式裡取用它的那一行）：{{ backtestRun.parameterNotDeclaredMessage.value }}
    </AppAlert>

    <AppAlert
      v-if="backtestRun.scriptFailedMessage.value"
      tone="danger"
      data-testid="backtest-script-failed-alert"
    >
      算式的問題（要改的是那個信號來源指名的策略腳本）：{{ backtestRun.scriptFailedMessage.value }}
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
      重演中…每一根 K 線上每個信號來源都要各跑一次算式，一段長期間可能要等上數十秒。
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
