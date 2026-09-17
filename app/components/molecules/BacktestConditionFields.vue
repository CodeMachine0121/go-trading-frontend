<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppRadio from '~/components/atoms/AppRadio.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import type { TradingModeOptionDto } from '~/domain/models/dto/trading-mode-option-dto'
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
  tradingModeOptions,
  running = false,
  disabled = false,
  symbolError = null,
  timeRangeError = null,
  initialCapitalError = null,
  positionSizingValueError = null,
  tradingModeError = null,
} = defineProps<{
  tradingSymbolApplication: TradingSymbolApplication
  timeZone: TimeZoneDto
  aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
  positionSizingModeOptions: readonly PositionSizingModeOptionDto[]
  /** 交易模式可以挑的每一個，各自帶著一句話說它做什麼。 */
  tradingModeOptions: readonly TradingModeOptionDto[]
  running?: boolean
  /** 按了也沒用的時候（例如後端連不上）就不要讓他按。 */
  disabled?: boolean
  symbolError?: string | null
  timeRangeError?: string | null
  initialCapitalError?: string | null
  positionSizingValueError?: string | null
  tradingModeError?: string | null
  /**
   * 彙總刻度不由填表的人挑時，要在那一格說的話。
   *
   * 給了它就不畫選單。重演一份交易策略時刻度是那幾個信號來源自己說的——
   * 畫一個挑得動的選單，等於在畫面上放第二個答案而沒有規則說哪一個贏。
   */
  aggregationIntervalNote?: string | null
}>()

const symbol = defineModel<string>('symbol', { required: true })
const aggregationInterval = defineModel<string>('aggregationInterval', { required: true })
const startTime = defineModel<string>('startTime', { required: true })
const endTime = defineModel<string>('endTime', { required: true })
const initialCapital = defineModel<string>('initialCapital', { required: true })
const positionSizingMode = defineModel<string>('positionSizingMode', { required: true })
const positionSizingValue = defineModel<string>('positionSizingValue', { required: true })
const tradingMode = defineModel<string>('tradingMode', { required: true })

/**
 * 同一組單選鈕共用的名字。
 *
 * 它必須每個實例各不相同：兩張表單若同時在頁面上（工作檯的兩個分頁就是），
 * 共用一個名字會讓兩邊的選項彼此互斥——挑了這一張的現貨，另一張的選擇會被清掉。
 */
const tradingModeGroupName = `trading-mode-${useId()}`

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
        v-if="!aggregationIntervalNote"
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
      <p
        v-else
        class="backtest-condition-fields__note"
        data-testid="backtest-aggregation-interval-note"
      >
        {{ aggregationIntervalNote }}
      </p>
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

    <FormField
      label="交易模式"
      class="backtest-condition-fields__trading-mode"
      :error-message="tradingModeError"
      grouped
    >
      <!--
        並排而不是下拉選單：多數使用者根本不知道現在這一種在幫他放空，
        而一個要點開才看得到的選單，救不了一個不知道要去點的人。
      -->
      <div class="backtest-condition-fields__trading-mode-options">
        <AppRadio
          v-for="modeOption in tradingModeOptions"
          :key="modeOption.value"
          v-model="tradingMode"
          :value="modeOption.value"
          :label="modeOption.label"
          :description="modeOption.description"
          :name="tradingModeGroupName"
          :disabled="running"
          :data-testid="`backtest-trading-mode-${modeOption.value}-radio`"
        />
      </div>
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
  &__note {
    // 不是一格可以動的東西，所以它讀起來也不該像：比欄位淡一階，沒有邊框。
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  display: grid;

  // 一整排條件自動排開：寬的時候一列擺完，窄的時候自己折行，
  // 而不是固定欄數然後在筆電上把時間選擇器擠成兩行。
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  align-items: start;
  gap: spacing('xs') spacing('sm');

  // 兩個選項要同時看得見，所以這一格佔滿整列——擠在一個 11rem 的格子裡，
  // 那兩句說明會被折成一疊，而它們正是這一格存在的理由。
  &__trading-mode {
    grid-column: 1 / -1;
  }

  // 排的是自己這一層的盒子，不是裡面那幾顆按鈕：靠子元件的 class 名來排版，
  // 哪天那個名字改了，版面會在沒有人收到任何錯誤的情況下垮掉。
  &__trading-mode-options {
    // 兩顆並排；窄到擺不下時自己折成上下兩顆，仍然同時看得見。
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: spacing('2xs');
  }

  // 按鈕與欄位同一列時要對齊到輸入框，而不是對齊到欄位標籤。
  &__action {
    align-self: end;
  }
}
</style>
