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
  exitLevelsError = null,
  transactionCostsError = null,
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
  /**
   * 出場價位那一組旁邊要說的話。
   *
   * 一則訊息蓋住兩格，因為它們併排填成一組，
   * 而那句話已經說出是止損還是止盈那一格。
   */
  exitLevelsError?: string | null
  /**
   * 交易成本那一組旁邊要說的話。
   *
   * 一則訊息蓋住兩格，與出場價位同一個判斷：它們併排填成一組，
   * 而那句話已經說出是進場還是出場那一格。
   */
  transactionCostsError?: string | null
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
// 兩個出場距離。預設留白，而留白就是不模擬——這張表單上唯一
// 「不填也是一個意思」的兩格，所以那一組旁邊要把這件事說出來。
const stopLossPercentage = defineModel<string>('stopLossPercentage', { required: true })
const takeProfitPercentage = defineModel<string>(
  'takeProfitPercentage', { required: true })
// 兩個費率。預設留白，而留白就是不收費——與上面那一組一樣「不填也是一個意思」，
// 但**規則不同**：出場留白時沿用進場，而不是各自獨立。
// 兩組就擺在一起，所以那句話非說不可。
const entryCostPercentage = defineModel<string>('entryCostPercentage', { required: true })
const exitCostPercentage = defineModel<string>('exitCostPercentage', { required: true })
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

    <!--
      這一格上一次來的時候是四顆並排的按鈕。整組拿掉而不交代，
      使用者會以為是畫面壞了、或是自己記錯了——所以位置與標題留著，
      改說一句話：現在只有這一種，而它是哪一種。
    -->
    <FormField
      label="交易模式"
      class="backtest-condition-fields__trading-mode"
      grouped
    >
      <p
        class="backtest-condition-fields__note"
        data-testid="backtest-trading-mode-note"
      >
        只做現貨：買入時空手就開倉，賣出就平倉把錢收回來、之後空手等下一個買點；
        空手時聽到賣出什麼都不做。借錢與做空是合約帳戶的事，這裡不做。
      </p>
    </FormField>

    <!--
      兩格擺成一組佔滿整列，與交易模式同一個理由：
      「留白就不模擬」那句話被摺成一疊時，就沒有人會讀它。
    -->
    <FormField
      label="出場價位"
      class="backtest-condition-fields__exit-levels"
      hint="留白就不模擬。距離從進場價量起"
      :error-message="exitLevelsError"
      grouped
    >
      <div class="backtest-condition-fields__paired-inputs">
        <label class="backtest-condition-fields__paired-input">
          <span>止損距離（%）</span>
          <AppInput
            v-model="stopLossPercentage"
            type="number"
            inputmode="decimal"
            :invalid="Boolean(exitLevelsError)"
            data-testid="backtest-stop-loss-percentage-input"
          />
        </label>
        <label class="backtest-condition-fields__paired-input">
          <span>止盈距離（%）</span>
          <AppInput
            v-model="takeProfitPercentage"
            type="number"
            inputmode="decimal"
            :invalid="Boolean(exitLevelsError)"
            data-testid="backtest-take-profit-percentage-input"
          />
        </label>
      </div>
    </FormField>

    <!--
      與出場價位同一個做法：兩格擺成一組佔滿整列。
      那句提示有兩件事要說（留白就不計、出場留白時跟進場一樣），
      被摺成一疊時就沒有人會讀它。
    -->
    <FormField
      label="交易成本"
      class="backtest-condition-fields__transaction-costs"
      hint="留白就不計。出場留白時跟進場一樣"
      :error-message="transactionCostsError"
      grouped
    >
      <div class="backtest-condition-fields__paired-inputs">
        <label class="backtest-condition-fields__paired-input">
          <span>進場成本率（%）</span>
          <AppInput
            v-model="entryCostPercentage"
            type="number"
            inputmode="decimal"
            :invalid="Boolean(transactionCostsError)"
            data-testid="backtest-entry-cost-percentage-input"
          />
        </label>
        <label class="backtest-condition-fields__paired-input">
          <span>出場成本率（%）</span>
          <AppInput
            v-model="exitCostPercentage"
            type="number"
            inputmode="decimal"
            :invalid="Boolean(transactionCostsError)"
            data-testid="backtest-exit-cost-percentage-input"
          />
        </label>
      </div>
    </FormField>

    <AppButton
      type="submit"
      class="backtest-condition-fields__action"
      :disabled="running || disabled"
      data-testid="run-backtest-button"
    >
      {{ running ? '回測中…' : '執行回測' }}
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

  // 兩格也佔滿整列：那句「留白就不模擬」是這一組存在的一半理由，
  // 而它被摺成一疊時沒有人會讀。
  &__exit-levels {
    grid-column: 1 / -1;
  }

  // 與出場價位那一組同一個理由，而這一組的提示還多說一句
  // 「出場留白時跟進場一樣」——那一句正是它與隔壁那組的差別。
  &__transaction-costs {
    grid-column: 1 / -1;
  }

  // 兩組併排的輸入框長得一樣，所以排版只寫一次。
  //
  // 它們**看起來**一樣是刻意的：兩組都是「一個概念、兩個數字、留白有意思」，
  // 而使用者掃過去時應該認得出那是同一種東西。抄第二份的那一天，
  // 兩組會在某一次調整之後開始長得不一樣，而沒有人是故意的。
  //
  // 它們的**規則**仍然不同（出場距離各自獨立；費率的出場留白時沿用進場），
  // 那個差別由各自的提示文字說，不由排版說。
  &__paired-inputs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: spacing('2xs');
  }

  &__paired-input {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }

  // 排的是自己這一層的盒子，不是裡面那幾顆按鈕：靠子元件的 class 名來排版，
  // 哪天那個名字改了，版面會在沒有人收到任何錯誤的情況下垮掉。
  // 按鈕與欄位同一列時要對齊到輸入框，而不是對齊到欄位標籤。
  &__action {
    align-self: end;
  }
}
</style>
