<script setup lang="ts">
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

/**
 * 分子：**一次套用**的那幾格——這一次要把每個旋鈕轉到幾。
 *
 * 它與策略腳本畫面上那一份不是同一個 UI 概念，所以是另一個元件：
 * 那一個管的是**宣告**（改名、改種類、新增、刪除），這裡一格都不能動那些，
 * 只有值。同一個元件要服務兩者，就得長出「哪些欄位可以動」的開關，
 * 而那個開關會讓兩邊都變得更難讀。
 *
 * 一格都沒有時它整個不出現——那由使用端決定，這裡不判斷。
 * 每一格該長什麼樣子也由那一格自己帶著：「回看根數要整數鍵盤」是業務規則，
 * 不是版面問題，所以這裡不寫任何 `if (kind === ...)`。
 */
const { fields } = defineProps<{
  fields: readonly StrategyScriptParameterFieldDto[]
}>()

const emit = defineEmits<{
  changeValue: [parameterName: string, value: number]
}>()

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onValueInput(parameterName: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeValue', parameterName, value)
  }
}
</script>

<template>
  <ul class="applied-indicator-parameter-fields">
    <li
      v-for="field in fields"
      :key="field.parameter.name"
      class="applied-indicator-parameter-fields__row"
      data-testid="applied-parameter-row"
    >
      <span class="applied-indicator-parameter-fields__name">{{ field.parameter.name }}</span>
      <!-- 是非用挑的：一個「填 0 或 1」的數字框是把系統內部的約定漏到畫面上。 -->
      <AppSelect
        v-if="field.control === 'options'"
        :model-value="String(field.parameter.value)"
        :data-testid="`applied-parameter-${field.parameter.name}`"
        @update:model-value="value => emit('changeValue', field.parameter.name, Number(value))"
      >
        <option
          v-for="valueOption in field.valueOptions"
          :key="valueOption.value"
          :value="String(valueOption.value)"
        >
          {{ valueOption.label }}
        </option>
      </AppSelect>
      <AppInput
        v-else
        :model-value="String(field.parameter.value)"
        type="number"
        :inputmode="field.inputMode"
        :step="field.step"
        :invalid="field.isInvalid"
        :data-testid="`applied-parameter-${field.parameter.name}`"
        @update:model-value="raw => onValueInput(field.parameter.name, raw)"
      />
    </li>
  </ul>
</template>

<style scoped lang="scss">
.applied-indicator-parameter-fields {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  margin: 0;
  padding: 0;
  list-style: none;

  // 名字在左、值在右，一格一列：值那一欄固定寬，整排的輸入框才會上下切齊。
  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(5rem, 7rem);
    align-items: center;
    gap: spacing('xs');
  }

  &__name {
    overflow: hidden;
    color: color('text');
    font-size: font-size('xs');
    text-overflow: ellipsis;
    white-space: nowrap;

    @include numeric;
  }
}
</style>
