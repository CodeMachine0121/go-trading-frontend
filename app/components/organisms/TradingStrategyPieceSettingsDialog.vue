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
const { piece, strategyScriptOptions, unusableStrategyScripts } = defineProps<{
  /** 正在調的那一塊。`null` 就是沒有人在調，彈窗關著。 */
  piece: TradingStrategySignalSourceDto | null
  strategyScriptOptions: readonly { value: number, label: string }[]
  /**
   * 存在、但當不了信號來源的那幾支，以及原因。
   *
   * 它們**不進選單**——挑得到就等於讓人拼出一份後端會拒絕的交易策略。但一塊
   * 已經指著它們的零件仍然要說得出自己指著誰，見下面 strayOption。
   */
  unusableStrategyScripts: Readonly<Record<number, string>>
  intervalOptions: readonly { value: string, label: string }[]
  /** 那支策略腳本宣告了哪幾個旋鈕。挑了策略腳本才知道有哪幾格要填。 */
  parameterNames: readonly string[]
}>()

const emit = defineEmits<{
  close: []
  changeLabel: [label: string]
  changeStrategyScript: [strategyScriptId: number]
  changeInterval: [interval: string]
  changeParameterValue: [name: string, value: number]
}>()

/**
 * 這塊零件指著一支**選單裡沒有**的策略腳本時，那一支長什麼樣子。
 *
 * 選單的值不在它的選項裡，瀏覽器就什麼都不顯示——而一片空白看起來像「還沒選」。
 * 使用者因此不知道自己正看著一塊壞掉的零件，更不知道它壞在哪裡；他會按下儲存，
 * 得到一句後端的拒絕，然後回來對著一個空白的選單。
 *
 * 所以這種腳本補進選單裡，選著、但**按不下去**：它說得出是哪一支、為什麼用不了，
 * 又不會讓任何人真的挑它。挑得到的那幾支就在它下面，換掉它就是換一支。
 *
 * 認不得那個識別碼時（腳本被刪了、或那份採用被收回）也照樣說一句——
 * 「不見了」與「不能用」對使用者是同一件事：這塊零件要重挑一支。
 */
const strayOption = computed(() => {
  const strategyScriptId = piece?.strategyScriptId
  if (strategyScriptId === undefined
    || strategyScriptOptions.some(option => option.value === strategyScriptId)) {
    return null
  }

  return {
    value: strategyScriptId,
    label: unusableStrategyScripts[strategyScriptId]
      ?? `這支策略腳本（編號 ${strategyScriptId}）已經不在了`,
  }
})

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
            v-if="strayOption !== null"
            :value="String(strayOption.value)"
            disabled
            data-testid="strategy-script-stray-option"
          >
            {{ strayOption.label }}
          </option>
          <option
            v-for="strategyScriptOption in strategyScriptOptions"
            :key="strategyScriptOption.value"
            :value="String(strategyScriptOption.value)"
          >
            {{ strategyScriptOption.label }}
          </option>
        </AppSelect>
        <span
          v-if="strayOption !== null"
          class="piece-settings__warning"
          data-testid="strategy-script-stray-note"
        >這塊零件現在用的那一支挑不得，換一支才存得起來。</span>
      </label>

      <label class="piece-settings__field">
        <span class="piece-settings__name">看多粗的 K 線</span>
        <AppSelect
          :model-value="piece.aggregationInterval"
          data-testid="strategy-script-interval-select"
          @update:model-value="emit('changeInterval', String($event))"
        >
          <option
            v-for="intervalOption in intervalOptions"
            :key="intervalOption.value"
            :value="intervalOption.value"
          >
            {{ intervalOption.label }}
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

  &__warning {
    color: color('warning');
    font-size: font-size('2xs');
  }
}
</style>
