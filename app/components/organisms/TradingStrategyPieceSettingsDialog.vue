<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：一塊零件的設定——它叫什麼、用哪一支策略腳本、看多粗的 K 線、旋鈕調到多少。
//
// 它在**彈窗**裡，不是在架子上原地展開：展開會把架子撐長，而架子旁邊就是兩張墊子，
// 一塊零件五個參數的時候，墊子會被推到看不見的地方。而調參數是偶爾才做一次的事。
const { piece } = defineProps<{
  /** 正在調的那一塊。`null` 就是沒有人在調，彈窗關著。 */
  piece: TradingStrategySignalSourceDto | null
  strategyScriptOptions: readonly { value: number, label: string }[]
  /** 那支策略腳本宣告了哪幾個旋鈕。挑了策略腳本才知道有哪幾格要填。 */
  parameterNames: readonly string[]
}>()

const emit = defineEmits<{
  close: []
  changeLabel: [label: string]
  changeStrategyScript: [strategyScriptId: number]
  changeParameterValue: [name: string, value: number]
}>()

/** 沒填過的旋鈕顯示空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(name: string): string {
  return piece?.parameterValues.find(candidate => candidate.name === name)?.value.toString() ?? ''
}

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onParameterInput(name: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeParameterValue', name, value)
  }
}
</script>

<template>
  <AppModal
    :open="piece !== null"
    :title="`「${piece?.label ?? ''}」這塊零件`"
    @close="emit('close')"
  >
    <div
      v-if="piece !== null"
      class="piece-settings"
      data-testid="strategy-script-settings-panel"
    >
      <label class="piece-settings__field">
        <span class="piece-settings__name">這塊零件叫什麼</span>
        <AppInput
          :model-value="piece.label"
          type="text"
          data-testid="strategy-script-label-input"
          @update:model-value="emit('changeLabel', String($event))"
        />
      </label>

      <label class="piece-settings__field">
        <span class="piece-settings__name">用哪一支策略腳本</span>
        <AppSelect
          :model-value="String(piece.strategyScriptId)"
          data-testid="strategy-script-select"
          @update:model-value="emit('changeStrategyScript', Number($event))"
        >
          <option
            v-for="strategyScriptOption in strategyScriptOptions"
            :key="strategyScriptOption.value"
            :value="String(strategyScriptOption.value)"
          >
            {{ strategyScriptOption.label }}
          </option>
        </AppSelect>
      </label>

      <label
        v-for="name in parameterNames"
        :key="name"
        class="piece-settings__field"
      >
        <span class="piece-settings__name">{{ name }}</span>
        <AppInput
          :model-value="parameterValueOf(name)"
          type="number"
          inputmode="decimal"
          placeholder="用它的預設值"
          data-testid="strategy-script-parameter-input"
          @update:model-value="onParameterInput(name, $event)"
        />
      </label>
    </div>

    <template #actions>
      <AppButton
        type="button"
        data-testid="strategy-script-settings-done"
        @click="emit('close')"
      >
        好了
      </AppButton>
    </template>
  </AppModal>
</template>

<style scoped lang="scss">
.piece-settings {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__name {
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
