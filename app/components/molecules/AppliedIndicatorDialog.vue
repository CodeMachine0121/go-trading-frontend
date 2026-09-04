<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppliedIndicatorParameterFields from '~/components/molecules/AppliedIndicatorParameterFields.vue'
import type { AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'
import type { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'

/**
 * 分子：圖上這一筆的設定——它這一次的旋鈕值，與它畫出來那幾條線的顏色。
 *
 * 兩樣東西收在同一個地方，因為它們是同一句話的兩半：「**這一筆**要怎麼算、怎麼畫」。
 * 攤在清單上會讓每一筆長高好幾倍，而使用者多數時候只是在看圖上現在有哪幾條——
 * 改值與換色都是偶爾才做一次的事。
 *
 * 它一個業務判斷都不做：每一格長什麼樣、線是什麼顏色，全部由上面傳進來。
 */
const { row } = defineProps<{
  row: AppliedIndicatorRowDto | null
  colorOptions: readonly ChartLineColorOptionDto[]
}>()

const emit = defineEmits<{
  close: []
  changeParameterValue: [parameterName: string, value: number]
  changeLineColor: [lineKey: string, colorToken: string]
}>()
</script>

<template>
  <AppModal
    :open="row !== null"
    :title="row?.appliedIndicator.strategy.name ?? ''"
    @close="emit('close')"
  >
    <div
      v-if="row"
      class="applied-indicator-dialog"
    >
      <section
        v-if="row.parameterFields.length > 0"
        class="applied-indicator-dialog__section"
      >
        <h3 class="applied-indicator-dialog__heading">
          這一次的參數
        </h3>
        <AppliedIndicatorParameterFields
          :fields="row.parameterFields"
          @change-value="(name, value) => emit('changeParameterValue', name, value)"
        />
        <AppAlert
          v-if="row.parameterMessage"
          tone="danger"
          data-testid="applied-parameters-alert"
        >
          {{ row.parameterMessage }}
        </AppAlert>

        <p class="applied-indicator-dialog__note">
          改了就重算這一筆，圖上其他線不動。這裡填的值只屬於這一次套用，
          策略記著的預設值不會被動到。
        </p>
      </section>

      <section
        v-if="row.lines.length > 0"
        class="applied-indicator-dialog__section"
      >
        <h3 class="applied-indicator-dialog__heading">
          線的顏色
        </h3>
        <div
          v-for="line in row.lines"
          :key="line.lineKey"
          class="applied-indicator-dialog__line"
          data-testid="indicator-line"
        >
          <span
            class="applied-indicator-dialog__swatch"
            :style="{ backgroundColor: `var(${line.colorToken})` }"
          />
          <span class="applied-indicator-dialog__line-name">{{ line.indicatorName }}</span>
          <AppSelect
            :model-value="line.colorToken"
            class="applied-indicator-dialog__color-select"
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
      </section>

      <p
        v-if="row.parameterFields.length === 0 && row.lines.length === 0"
        class="applied-indicator-dialog__note"
        data-testid="applied-indicator-nothing-to-set"
      >
        這一筆沒有可以調的東西：它沒有宣告旋鈕，這一輪也還沒畫出線。
      </p>
    </div>

    <template #actions>
      <AppButton
        data-testid="close-applied-indicator-button"
        @click="emit('close')"
      >
        完成
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.applied-indicator-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('md');
  min-width: 22rem;

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('xs');
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__line {
    display: grid;
    gap: spacing('2xs');
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
  }

  &__swatch {
    display: inline-block;
    border-radius: radius('pill');
    width: 0.625rem;
    height: 0.625rem;
  }

  &__line-name {
    color: color('text-muted');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__color-select {
    width: auto;
  }
}
</style>
