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
        <div class="strategy-parameter-list__name">
          <AppInput
            :model-value="field.parameter.name"
            type="text"
            placeholder="名稱"
            :invalid="field.isInvalid"
            data-testid="parameter-name-input"
            @update:model-value="emit('rename', index, $event)"
          />

          <AppButton
            type="button"
            variant="ghost"
            size="small"
            label="移除"
            :data-testid="`remove-parameter-${index}`"
            @click="emit('remove', index)"
          >
            <AppIcon name="delete" />
          </AppButton>
        </div>

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

  // 旋鈕橫著排開，一格一個。
  //
  // 它們曾經是一列一個、每列四個控制項橫跨整個寬度——那讓「名稱」與「值」兩個
  // 各佔掉半個版面，而它們裝的通常是「期數」與「20」。
  // 一個旋鈕是一個小東西，就給它一個小格子；格子裝不下才換行。
  &__rows {
    display: grid;
    gap: spacing('xs');
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    gap: spacing('3xs');
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    border: 1px solid color('border');
    border-radius: radius('sm');
    padding: spacing('2xs');
  }

  // 名稱是這一格的標題，所以獨佔上面一整行；移除跟著它，因為刪掉的是「這個名字」。
  &__name {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: spacing('3xs');
    align-items: center;
  }
}
</style>
