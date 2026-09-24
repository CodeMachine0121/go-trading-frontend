<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { StrategyScriptParameterKind } from '~/domain/models/dto/strategy-script-parameter-dto'
import type { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 分子：一支算式的旋鈕這一整塊——宣告、值、新增與移除。
// 它常駐在工作台的參數那一欄（手機上是「參數」那一段），不再收在對話框後面：
// 旋鈕的值正是回測時一再回頭調的東西，而它們與回測條件擺在同一欄才對得上。
//
// 它是**一個** UI 概念，不是「一列」加「一塊」兩個：一列脫離了它所在的那一份
// 就答不出「名稱有沒有重複」，而那正是這一塊要回答的事情之一。
//
// 每一列該長什麼樣子由那一列自己帶著，這裡不判斷種類——
// 「回看根數要整數鍵盤」是業務規則，不是版面問題。
const { fields, kindOptions, readOnly = false } = defineProps<{
  /** 每一列：旋鈕本身，加上它該長什麼樣子。 */
  fields: readonly StrategyScriptParameterFieldDto[]
  kindOptions: readonly { value: StrategyScriptParameterKind, label: string }[]
  /**
   * 只看、不改：一支從市集加入來的策略腳本，旋鈕是分享者宣告的。
   * 每一格照樣顯示（那是分享者公開的東西），但改不動，也沒有新增與移除。
   */
  readOnly?: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  rename: [index: number, name: string]
  changeKind: [index: number, kind: StrategyScriptParameterKind]
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
  <div class="strategy-script-parameter-list">
    <p
      v-if="fields.length === 0"
      class="strategy-script-parameter-list__empty"
      data-testid="parameters-empty"
    >
      <template v-if="readOnly">
        這支策略腳本沒有可調的東西。
      </template>
      <template v-else>
        這支算式沒有可調的東西。加一個之後，算式就能用它的名字取用它。
      </template>
    </p>

    <template v-else>
      <ul class="strategy-script-parameter-list__rows">
        <li
          v-for="(field, index) in fields"
          :key="index"
          class="strategy-script-parameter-list__row"
          data-testid="parameter-row"
        >
          <AppInput
            :model-value="field.parameter.name"
            type="text"
            placeholder="名稱"
            aria-label="名稱"
            class="strategy-script-parameter-list__name"
            :invalid="field.isInvalid"
            :disabled="readOnly"
            data-testid="parameter-name-input"
            @update:model-value="emit('rename', index, $event)"
          />

          <AppSelect
            :model-value="field.parameter.kind"
            aria-label="種類"
            class="strategy-script-parameter-list__kind"
            :disabled="readOnly"
            data-testid="parameter-kind-select"
            @update:model-value="emit('changeKind', index, $event as StrategyScriptParameterKind)"
          >
            <option
              v-for="kindOption in kindOptions"
              :key="kindOption.value"
              :value="kindOption.value"
            >
              {{ kindOption.label }}
            </option>
          </AppSelect>

          <!-- 是非用挑的：一個「填 0 或 1」的數字框是把系統內部的約定漏到畫面上。 -->
          <AppSelect
            v-if="field.control === 'options'"
            :model-value="String(field.parameter.value)"
            aria-label="預設值"
            class="strategy-script-parameter-list__value"
            :disabled="readOnly"
            data-testid="parameter-value-input"
            @update:model-value="emit('changeValue', index, Number($event))"
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
            aria-label="預設值"
            class="strategy-script-parameter-list__value"
            :inputmode="field.inputMode"
            :step="field.step"
            :invalid="field.isInvalid"
            :disabled="readOnly"
            data-testid="parameter-value-input"
            @update:model-value="onValueInput(index, $event)"
          />

          <AppButton
            v-if="!readOnly"
            type="button"
            variant="ghost"
            size="small"
            label="移除"
            class="strategy-script-parameter-list__remove"
            :data-testid="`remove-parameter-${index}`"
            @click="emit('remove', index)"
          >
            <AppIcon name="delete" />
          </AppButton>
        </li>
      </ul>
    </template>

    <AppButton
      v-if="!readOnly"
      type="button"
      variant="secondary"
      size="small"
      class="strategy-script-parameter-list__add"
      data-testid="add-parameter-button"
      @click="emit('add')"
    >
      新增參數
    </AppButton>
  </div>
</template>

<style scoped lang="scss">
.strategy-script-parameter-list {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  // 加一個是偶爾才做一次的事，不必是一顆橫跨整個寬度的按鈕。
  &__add {
    align-self: start;
  }

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // 一列一個旋鈕，兩行：名稱獨佔一行（它是算式取用它的那個字，要讀得完整），
  // 種類與預設值並排在下面一行。
  //
  // 這一塊住在工作台最右邊那一欄、也住在手機上「參數」那一段——兩處都只有
  // 一支手機寬。四欄排成一行在那個寬度裡每一格都讀不出值；兩行則在哪裡都排得下。
  &__row {
    display: grid;
    gap: spacing('2xs');
    grid-template-areas:
      'name name remove'
      'kind value value';
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
    align-items: center;
    padding: spacing('xs') 0;

    &:not(:last-child) {
      border-bottom: 1px solid color('border');
    }
  }

  &__name {
    grid-area: name;
  }

  &__kind {
    grid-area: kind;
  }

  &__value {
    grid-area: value;
  }

  &__remove {
    grid-area: remove;
  }
}
</style>
