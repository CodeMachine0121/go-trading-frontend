<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

/**
 * 分子：圖表上「已套用的指標」這一塊——挑一支加進來、看它算得怎麼樣、換線的顏色、移除它。
 *
 * 它一個業務判斷都不做：哪些策略挑得到、每一支算得怎麼樣、線是什麼顏色，
 * 全部由上面傳進來。連「是非畫不成線」都是策略自己說的。
 */
const {
  selectableStrategies,
  appliedStrategies,
  chartIndicators,
  colorOptions,
  isCalculating,
  failureMessageOf,
} = defineProps<{
  /** 還可以挑的策略。已經在圖上的那幾支不在裡面。 */
  selectableStrategies: readonly StrategyDto[]
  appliedStrategies: readonly StrategyDto[]
  chartIndicators: readonly ChartIndicatorDto[]
  colorOptions: readonly ChartLineColorOptionDto[]
  isCalculating: (strategyId: number) => boolean
  failureMessageOf: (strategyId: number) => string | null
}>()

const emit = defineEmits<{
  apply: [strategy: StrategyDto]
  remove: [strategyId: number]
  changeLineColor: [lineKey: string, colorToken: string]
}>()

/** 選單永遠停在「挑一支加進來」——挑完就加進去了，它不代表任何持續的狀態。 */
const pickerValue = ref('')

/** 這一支算出來的每一條線，水平線與曲線攤成同一份清單：畫面上它們長得一樣。 */
function linesOf(strategyId: number) {
  const indicator = chartIndicators.find(candidate => candidate.strategyId === strategyId)
  if (indicator === undefined) {
    return []
  }

  return [
    ...indicator.levels.map(level => ({
      lineKey: level.lineKey, indicatorName: level.indicatorName, colorToken: level.colorToken,
    })),
    ...indicator.series.map(oneSeries => ({
      lineKey: oneSeries.lineKey,
      indicatorName: oneSeries.indicatorName,
      colorToken: oneSeries.colorToken,
    })),
  ]
}

function drawsNothing(strategyId: number): boolean {
  return chartIndicators.some(
    candidate => candidate.strategyId === strategyId && candidate.drawsNothing)
}

function applyPicked(value: string) {
  // 選單永遠停回「套用一支策略…」：挑完就加進去了，它不代表任何持續的狀態。
  pickerValue.value = ''

  // 選項本來就是從可挑清單長出來的，所以「找不到」到不了——
  // 走訪找到的那些（零個或一個），比寫一個永遠不成立的 else 誠實。
  selectableStrategies
    .filter(candidate => String(candidate.id) === value)
    .forEach(strategy => emit('apply', strategy))
}
</script>

<template>
  <div class="chart-indicator-panel">
    <label class="chart-indicator-panel__picker">
      <span class="chart-indicator-panel__label">指標</span>

      <p
        v-if="selectableStrategies.length === 0 && appliedStrategies.length === 0"
        class="chart-indicator-panel__empty"
        data-testid="chart-indicator-empty"
      >
        還沒有任何策略。到指標計算畫面寫一支存起來，就能套到圖上。
      </p>

      <AppSelect
        v-else
        :model-value="pickerValue"
        data-testid="chart-indicator-picker"
        @update:model-value="applyPicked"
      >
        <option value="">
          套用一支策略…
        </option>
        <!-- 畫不成線的那幾支照樣列出來但挑不到：直接消失會讓使用者以為策略不見了。 -->
        <option
          v-for="strategy in selectableStrategies"
          :key="strategy.id"
          :value="String(strategy.id)"
          :disabled="!strategy.drawableOnChart"
        >
          {{ strategy.drawableOnChart ? strategy.name : `${strategy.name}（是非，畫不成線）` }}
        </option>
      </AppSelect>
    </label>

    <ul
      v-if="appliedStrategies.length > 0"
      class="chart-indicator-panel__applied"
    >
      <li
        v-for="strategy in appliedStrategies"
        :key="strategy.id"
        class="chart-indicator-panel__item"
        data-testid="applied-indicator"
      >
        <div class="chart-indicator-panel__item-header">
          <span class="chart-indicator-panel__name">{{ strategy.name }}</span>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            label="移除"
            :data-testid="`remove-indicator-${strategy.id}`"
            @click="emit('remove', strategy.id)"
          >
            <AppIcon name="delete" />
          </AppButton>
        </div>

        <p
          v-if="isCalculating(strategy.id)"
          class="chart-indicator-panel__note"
          data-testid="indicator-calculating"
        >
          計算中…
        </p>

        <AppAlert
          v-else-if="failureMessageOf(strategy.id)"
          tone="danger"
          :data-testid="`indicator-error-${strategy.id}`"
        >
          {{ failureMessageOf(strategy.id) }}
        </AppAlert>

        <p
          v-else-if="drawsNothing(strategy.id)"
          class="chart-indicator-panel__note"
          data-testid="indicator-draws-nothing"
        >
          算完了，但這支算式沒有放進任何指標，所以圖上沒有線。
        </p>

        <div
          v-for="line in linesOf(strategy.id)"
          :key="line.lineKey"
          class="chart-indicator-panel__line"
          data-testid="indicator-line"
        >
          <span
            class="chart-indicator-panel__swatch"
            :style="{ backgroundColor: `var(${line.colorToken})` }"
          />
          <span class="chart-indicator-panel__line-name">{{ line.indicatorName }}</span>
          <AppSelect
            :model-value="line.colorToken"
            class="chart-indicator-panel__color-select"
            :data-testid="`line-color-${line.lineKey}`"
            @update:model-value="token => emit('changeLineColor', line.lineKey, token)"
          >
            <option
              v-for="colorOption in colorOptions"
              :key="colorOption.token"
              :value="colorOption.token"
            >
              {{ colorOption.label }}
            </option>
          </AppSelect>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.chart-indicator-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__picker {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__label {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__empty {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  // 套用得越多，這份清單越長。它自己捲，而不是一路把圖往下推——
  // 這個畫面是為了看圖而存在的。
  &__applied {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    max-height: 11rem;
    overflow-y: auto;
    list-style: none;
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('2xs');
  }

  &__item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: spacing('2xs');
  }

  &__name {
    color: color('text-strong');
    font-size: font-size('xs');
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__line {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
  }

  // 色票就是那條線在圖上的樣子，所以它必須用那條線的實際顏色——
  // 這是全站唯一由資料決定顏色的地方，值仍然來自 token，只是選哪一個由領域說了算。
  &__swatch {
    flex: none;
    border-radius: radius('sm');
    width: 0.75rem;
    height: 0.75rem;
  }

  // 指標名稱吃掉整列剩下的寬度，並且**不斷行**：一個兩個字的名稱被拆成兩行，
  // 只是因為旁邊那個選單貪掉了它不需要的寬度。
  &__line-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: color('text-muted');
    font-size: font-size('2xs');
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  // 換色的選單只裝得下一個顏色的名字，沒有理由更寬——
  // 它多佔的每一點寬度都是從指標名稱那裡拿走的。
  &__color-select {
    flex: none;
    width: 5rem;
  }
}
</style>
