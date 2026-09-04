<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'
import AppliedIndicatorParameterFields from '~/components/molecules/AppliedIndicatorParameterFields.vue'
import AppliedIndicatorDialog from '~/components/molecules/AppliedIndicatorDialog.vue'

/**
 * 分子：圖表上「已套用的指標」這一塊——挑一支、調它的旋鈕、加進來、
 * 看它算得怎麼樣、換線的顏色、移除它。
 *
 * 它一個業務判斷都不做，**也不逐列查表**：每一列拿到手上就已經知道自己是什麼樣子——
 * 有沒有在算、算不出來的原因、畫出哪幾條線、那幾格長什麼樣。
 * 連「是非畫不成線」都是策略自己說的，「這一筆要不要先停下來調」也是。
 *
 * **清單上的每一把鑰匙都是「這一次套用」的序號，不是策略識別碼**——
 * 同一支策略可以擺好幾筆，用後者當鍵會讓移除一筆時兩筆一起消失。
 */
const { selectableStrategies, appliedIndicatorRows, colorOptions } = defineProps<{
  /** 還可以挑的策略。**已經在圖上的那幾支仍然在裡面**——同一支可以擺好幾次。 */
  selectableStrategies: readonly StrategyDto[]
  appliedIndicatorRows: readonly AppliedIndicatorRowDto[]
  colorOptions: readonly ChartLineColorOptionDto[]
  /** 還沒上圖、正在調的那一筆。沒有就是 null。 */
  pendingAppliedIndicator: AppliedIndicatorDto | null
  pendingParameterFields: readonly StrategyParameterFieldDto[]
  pendingParametersMessage: string | null
}>()

const emit = defineEmits<{
  apply: [strategy: StrategyDto]
  changePendingParameterValue: [parameterName: string, value: number]
  confirmPending: []
  cancelPending: []
  changeAppliedParameterValue: [appliedIndicatorId: number, parameterName: string, value: number]
  remove: [appliedIndicatorId: number]
  changeLineColor: [lineKey: string, colorToken: string]
}>()

/** 選單永遠停在「挑一支加進來」——挑完就加進去了，它不代表任何持續的狀態。 */
const pickerValue = ref('')

/**
 * 正在設定哪一筆。**這是純粹的呈現狀態**——哪一個對話框開著不影響圖上任何東西，
 * 所以它住在這裡，不必一路傳到上面去。
 */
const openedAppliedIndicatorId = ref<number | null>(null)

/**
 * 對話框要顯示的那一筆，**每次都從清單裡重新找**。
 *
 * 不把那一筆存起來，是因為它會過期：重算之後線與狀態都是新的一份，
 * 而存起來的那一份會繼續顯示上一輪的顏色。順帶也處理掉「開著的時候被移除」——
 * 找不到就是沒有，對話框自己關上。
 */
const openedRow = computed(() => appliedIndicatorRows.find(
  row => row.appliedIndicator.id === openedAppliedIndicatorId.value) ?? null)

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
        v-if="selectableStrategies.length === 0"
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

    <!-- 挑了一支有旋鈕的：先停在這裡讓使用者調，調好才上圖。
         一個旋鈕都沒有的策略不會走到這裡——那個判斷不在畫面上。 -->
    <section
      v-if="pendingAppliedIndicator"
      class="chart-indicator-panel__pending"
      data-testid="pending-indicator"
    >
      <p class="chart-indicator-panel__pending-title">
        {{ pendingAppliedIndicator.strategy.name }}
      </p>

      <AppliedIndicatorParameterFields
        :fields="pendingParameterFields"
        @change-value="(name, value) => emit('changePendingParameterValue', name, value)"
      />

      <AppAlert
        v-if="pendingParametersMessage"
        tone="danger"
        data-testid="pending-parameters-alert"
      >
        {{ pendingParametersMessage }}
      </AppAlert>

      <div class="chart-indicator-panel__pending-actions">
        <AppButton
          type="button"
          variant="primary"
          size="small"
          data-testid="confirm-pending-indicator"
          @click="emit('confirmPending')"
        >
          加進來
        </AppButton>
        <AppButton
          type="button"
          variant="ghost"
          size="small"
          data-testid="cancel-pending-indicator"
          @click="emit('cancelPending')"
        >
          取消
        </AppButton>
      </div>
    </section>

    <ul
      v-if="appliedIndicatorRows.length > 0"
      class="chart-indicator-panel__applied"
    >
      <li
        v-for="row in appliedIndicatorRows"
        :key="row.appliedIndicator.id"
        class="chart-indicator-panel__item"
        data-testid="applied-indicator"
      >
        <!--
          一筆就是一列：它畫了哪幾條線（顏色）、它是誰、這一次的值是多少。
          **要改東西就點這一列**——參數與線色都在後面那個對話框裡。
          它們是偶爾才動一次的東西，攤在清單上會讓每一筆長高好幾倍，
          而使用者多數時候只是在看「圖上現在有哪幾條」。
        -->
        <div class="chart-indicator-panel__item-row">
          <button
            type="button"
            class="chart-indicator-panel__open"
            :data-testid="`open-indicator-${row.appliedIndicator.id}`"
            @click="openedAppliedIndicatorId = row.appliedIndicator.id"
          >
            <span
              v-if="row.lines.length > 0"
              class="chart-indicator-panel__swatches"
            >
              <span
                v-for="line in row.lines"
                :key="line.lineKey"
                class="chart-indicator-panel__swatch"
                :style="{ backgroundColor: `var(${line.colorToken})` }"
              />
            </span>

            <span class="chart-indicator-panel__name">
              {{ row.appliedIndicator.strategy.name }}
              <!-- 同一支擺好幾筆時靠這一句分辨：值本身就是它們唯一的差別。 -->
              <span
                v-if="row.appliedIndicator.parameterSummary"
                class="chart-indicator-panel__summary"
                data-testid="applied-indicator-summary"
              >{{ row.appliedIndicator.parameterSummary }}</span>
            </span>

            <AppBadge
              v-if="row.isCalculating"
              variant="info"
            >
              計算中
            </AppBadge>
          </button>

          <AppButton
            type="button"
            variant="ghost"
            size="small"
            label="移除"
            :data-testid="`remove-indicator-${row.appliedIndicator.id}`"
            @click="emit('remove', row.appliedIndicator.id)"
          >
            <AppIcon name="delete" />
          </AppButton>
        </div>

        <!--
          這三則留在清單上，不進對話框：它們講的是「這一筆現在怎麼了」，
          而那是使用者掃過清單時就該看到的事，不是點開才發現的事。
        -->
        <!--
          填的東西用不了時，清單上也要說——對話框關著的時候，
          那一列寫的值與圖上那條線就對不起來了，而使用者看不到任何理由。
        -->
        <AppAlert
          v-if="row.parameterMessage"
          tone="danger"
          :data-testid="`indicator-parameters-error-${row.appliedIndicator.id}`"
        >
          {{ row.parameterMessage }}
        </AppAlert>

        <p
          v-else-if="row.isCalculating"
          class="chart-indicator-panel__note"
          data-testid="indicator-calculating"
        >
          計算中…
        </p>

        <AppAlert
          v-else-if="row.failureMessage"
          tone="danger"
          :data-testid="`indicator-error-${row.appliedIndicator.id}`"
        >
          {{ row.failureMessage }}
        </AppAlert>

        <p
          v-else-if="row.drawsNothing"
          class="chart-indicator-panel__note"
          data-testid="indicator-draws-nothing"
        >
          算完了，但這支算式沒有放進任何指標，所以圖上沒有線。
        </p>
      </li>
    </ul>

    <AppliedIndicatorDialog
      :row="openedRow"
      :color-options="colorOptions"
      @close="openedAppliedIndicatorId = null"
      @change-parameter-value="(name, value) => openedRow
        && emit('changeAppliedParameterValue', openedRow.appliedIndicator.id, name, value)"
      @change-line-color="(lineKey, token) => emit('changeLineColor', lineKey, token)"
    />
  </div>
</template>

<style scoped lang="scss">
.chart-indicator-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__pending {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 1px solid color('border-strong');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding: spacing('xs');
  }

  &__pending-title {
    margin: 0;
    color: color('text-strong');
    font-weight: 600;
    font-size: font-size('sm');
  }

  &__pending-actions {
    display: flex;
    gap: spacing('2xs');
  }

  &__summary {
    margin-left: spacing('3xs');
    color: color('text-muted');
    font-size: font-size('xs');
  }

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
    padding-bottom: spacing('3xs');

    // 沒有狀態要說的時候，那一列自己就是整筆——不留一條空的下緣。
    &:not(:has(.chart-indicator-panel__note, .app-alert)) {
      padding-bottom: 0;
    }
  }

  &__item-row {
    display: flex;
    gap: spacing('2xs');
    align-items: center;
    padding: spacing('2xs');
  }

  // 整列都可以點——要改東西的人不必去瞄準一顆小按鈕。
  // 它是一顆按鈕而不是一個掛了 click 的 div：鍵盤走得到，讀螢幕的人也聽得出它可以按。
  &__open {
    display: flex;
    flex: 1;
    gap: spacing('2xs');
    align-items: center;
    cursor: pointer;
    border: 0;
    background: none;
    padding: 0;
    min-width: 0;
    text-align: left;

    @include focus-ring;
  }

  // 名字吃掉中間所有剩下的寬度，右邊那幾樣（狀態、移除）才會貼齊右緣。
  &__name {
    flex: 1;
    min-width: 0;
    color: color('text-strong');
    font-size: font-size('xs');
  }

  // 收起來也看得到它畫了哪幾條線——顏色是這幾筆之間唯一的視覺分別。
  &__swatches {
    display: flex;
    flex: none;
    gap: spacing('3xs');
    align-items: center;
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
