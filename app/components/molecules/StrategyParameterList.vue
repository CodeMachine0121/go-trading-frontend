<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyParameterKind } from '~/domain/models/dto/strategy-parameter-dto'
import type { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 分子：一支算式的旋鈕這一整塊——宣告、值、新增與移除。
//
// 它是**一個** UI 概念，不是「一列」加「一塊」兩個：一列脫離了它所在的那一份
// 就答不出「名稱有沒有重複」，而那正是這一塊要回答的事情之一。
//
// 每一列該長什麼樣子由那一列自己帶著，這裡不判斷種類——
// 「回看根數要整數鍵盤」是業務規則，不是版面問題。
const { fields, kindOptions } = defineProps<{
  /** 每一列：旋鈕本身，加上它該長什麼樣子。 */
  fields: readonly StrategyParameterFieldDto[]
  kindOptions: readonly { value: StrategyParameterKind, label: string }[]
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  rename: [index: number, name: string]
  changeKind: [index: number, kind: StrategyParameterKind]
  changeValue: [index: number, value: number]
}>()

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onValueInput(index: number, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeValue', index, value)
  }
}
</script>

<template>
  <div class="strategy-parameter-list">
    <p
      v-if="fields.length === 0"
      class="strategy-parameter-list__empty"
      data-testid="parameters-empty"
    >
      這支算式沒有可調的東西。加一個之後，算式就能用它的名字取用它。
    </p>

    <ul
      v-else
      class="strategy-parameter-list__rows"
    >
      <li
        v-for="(field, index) in fields"
        :key="index"
        class="strategy-parameter-list__row"
        data-testid="parameter-row"
      >
        <AppInput
          :model-value="field.parameter.name"
          type="text"
          placeholder="名稱"
          :invalid="field.isInvalid"
          data-testid="parameter-name-input"
          @update:model-value="emit('rename', index, $event)"
        />

        <AppSelect
          :model-value="field.parameter.kind"
          data-testid="parameter-kind-select"
          @update:model-value="emit('changeKind', index, $event as StrategyParameterKind)"
        >
          <option
            v-for="kindOption in kindOptions"
            :key="kindOption.value"
            :value="kindOption.value"
          >
            {{ kindOption.label }}
          </option>
        </AppSelect>

        <AppInput
          :model-value="String(field.parameter.value)"
          type="number"
          :inputmode="field.inputMode"
          :step="field.step"
          :invalid="field.isInvalid"
          data-testid="parameter-value-input"
          @update:model-value="onValueInput(index, $event)"
        />

        <AppButton
          type="button"
          variant="ghost"
          :data-testid="`remove-parameter-${index}`"
          @click="emit('remove', index)"
        >
          <AppIcon name="delete" />
        </AppButton>
      </li>
    </ul>

    <AppButton
      type="button"
      variant="secondary"
      block
      data-testid="add-parameter-button"
      @click="emit('add')"
    >
      新增參數
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.strategy-parameter-list {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto;
    gap: spacing('xs');
    align-items: center;
  }
}
</style>
