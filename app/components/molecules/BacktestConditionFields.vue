<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：回測要問使用者的那幾件事。
//
// 它一條規則都不判斷：哪一格出了問題、押注模式旁邊要不要出現一格，都由外面告訴它。
// 「只有全押不用填」寫進這裡，多一種不必填的模式時它會安靜地繼續要求填數字。
const {
  tradingSymbolApplication,
  timeZone,
  aggregationIntervalOptions,
  positionSizingModeOptions,
  running = false,
  disabled = false,
  symbolError = null,
  timeRangeError = null,
  initialCapitalError = null,
  positionSizingValueError = null,
} = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
  positionSizingModeOptions: readonly PositionSizingModeOptionDto[]
  running?: boolean
  /** 按了也沒用的時候（例如後端連不上）就不要讓他按。 */
  disabled?: boolean
  symbolError?: string | null
  timeRangeError?: string | null
  initialCapitalError?: string | null
  positionSizingValueError?: string | null
}>()

const symbol = defineModel<string>('symbol', { required: true })
const aggregationInterval = defineModel<string>('aggregationInterval', { required: true })
const startTime = defineModel<string>('startTime', { required: true })
const endTime = defineModel<string>('endTime', { required: true })
const initialCapital = defineModel<string>('initialCapital', { required: true })
const positionSizingMode = defineModel<string>('positionSizingMode', { required: true })
const positionSizingValue = defineModel<string>('positionSizingValue', { required: true })

/**
 * 目前這個模式旁邊要不要出現一格，以及那一格叫什麼。
 *
 * 那一格的**數字留在自己的 ref 裡**，不隨模式切換清掉：使用者在百分比填了 50、
 * 切去全押看一眼、再切回來，50 還在——他本來就沒有改過它。
 */
const selectedPositionSizingMode = computed(
  () => positionSizingModeOptions.find(option => option.value === positionSizingMode.value))
</script>

<template>
  <div class="backtest-condition-fields">
    <SymbolField
      v-model="symbol"
      :trading-symbol-application="tradingSymbolApplication"
      :error-message="symbolError"
    />

    <FormField
      label="彙總刻度"
    >
      <AppSelect
        v-model="aggregationInterval"
        data-testid="backtest-aggregation-interval-select"
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

    <!-- 起訖兩格共用一則說明：起點不能晚於終點是關於這一對，不是關於其中一格。 -->
    <FormField
      label="從哪裡開始"
      :hint="timeZone.cityLabel"
      :error-message="timeRangeError"
    >
      <AppInput
        v-model="startTime"
        type="datetime-local"
        :invalid="Boolean(timeRangeError)"
        data-testid="backtest-start-time-input"
      />
    </FormField>

    <FormField
      label="到哪裡為止"
      :hint="timeZone.cityLabel"
    >
      <AppInput
        v-model="endTime"
        type="datetime-local"
        :invalid="Boolean(timeRangeError)"
        data-testid="backtest-end-time-input"
      />
    </FormField>

    <FormField
      label="一開始有多少錢"
      :error-message="initialCapitalError"
    >
      <AppInput
        v-model="initialCapital"
        type="number"
        inputmode="decimal"
        :invalid="Boolean(initialCapitalError)"
        data-testid="backtest-initial-capital-input"
      />
    </FormField>

    <FormField label="每次開倉押多少">
      <AppSelect
        v-model="positionSizingMode"
        data-testid="backtest-position-sizing-mode-select"
      >
        <option
          v-for="modeOption in positionSizingModeOptions"
          :key="modeOption.value"
          :value="modeOption.value"
        >
          {{ modeOption.label }}
        </option>
      </AppSelect>
    </FormField>

    <FormField
      v-if="selectedPositionSizingMode?.requiresValue"
      :label="selectedPositionSizingMode.valueLabel"
      :error-message="positionSizingValueError"
    >
      <AppInput
        v-model="positionSizingValue"
        type="number"
        inputmode="decimal"
        :invalid="Boolean(positionSizingValueError)"
        data-testid="backtest-position-sizing-value-input"
      />
    </FormField>

    <AppButton
      type="submit"
      class="backtest-condition-fields__action"
      :disabled="running || disabled"
      data-testid="run-backtest-button"
    >
      {{ running ? '重演中…' : '執行回測' }}
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.backtest-condition-fields {
  display: grid;

  // 一整排條件自動排開：寬的時候一列擺完，窄的時候自己折行，
  // 而不是固定欄數然後在筆電上把時間選擇器擠成兩行。
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  align-items: start;
  gap: spacing('xs') spacing('sm');

  // 按鈕與欄位同一列時要對齊到輸入框，而不是對齊到欄位標籤。
  &__action {
    align-self: end;
  }
}
</style>
