<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ConditionMatrixDto } from '~/domain/models/dto/condition-matrix-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { CONDITION_OPERATORS, CONDITION_OPERATOR_LABELS } from '~/domain/models/vo/condition-operator-vo'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：一台機器人怎麼判斷，畫成**一張表**。
//
// 一列是一支策略，兩欄是買入與賣出，交叉的那一格說「這一支要是什麼，才算數」。
// 這個形狀不是為了好看——它就是這件事本來的樣子：幾個來源各說一句話，
// 整體用且或或串起來。
//
// 它取代的是一個由「來源清單 ＋ 積木抽屜 ＋ 兩棵可拖拉的樹」組成的頁面。
// 那個頁面的每一個抱怨都來自同一件事：**東西被切成好幾塊，而它們之間的關係要用記的。**
// 一張表裡沒有第二塊，所以沒有東西可以被推走、沒有東西需要拖、
// 也沒有哪一欄說不出自己是誰。
//
// 代價講在明處：一張表說不出「且與或交錯」的巢狀條件。那種條件真的出現時
// （多半是舊資料），這裡照實說它畫不出來，而不是默默壓平成一個意思不同的東西。
const {
  sources, buyMatrix, sellMatrix, strategyOptions, intervalOptions,
  parameterNamesByStrategyId, canAdd, signalSourceLimit, hasNoStrategies,
} = defineProps<{
  sources: readonly StrategyBotSignalSourceDto[]
  buyMatrix: ConditionMatrixDto
  sellMatrix: ConditionMatrixDto
  strategyOptions: readonly { value: number, label: string }[]
  intervalOptions: readonly { value: string, label: string }[]
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  canAdd: boolean
  signalSourceLimit: number
  hasNoStrategies: boolean
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategy: [index: number, strategyId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
  toggleSignal: [side: 'buy' | 'sell', sourceLabel: string, signal: string]
  changeOperator: [side: 'buy' | 'sell', operator: ConditionOperatorVo]
}>()

/** 一格裡的三個鍵。買賣持各一個，按下去就是「這個也算」。 */
const SIGNAL_KEYS = [
  { value: 'buy', short: '買', full: '買入' },
  { value: 'sell', short: '賣', full: '賣出' },
  { value: 'hold', short: '持', full: '持有' },
] as const

const SIDES = [
  { key: 'buy', heading: '什麼算買入', matrix: () => buyMatrix },
  { key: 'sell', heading: '什麼算賣出', matrix: () => sellMatrix },
] as const

const operatorOptions = CONDITION_OPERATORS.map(operator => ({
  value: operator,
  label: CONDITION_OPERATOR_LABELS[operator],
}))

/** 哪幾支策略正打開著它的設定。用**代號**記而不是位置——刪掉中間一支之後位置會挪。 */
const expandedLabels = ref<string[]>([])

function toggleSettings(label: string) {
  expandedLabels.value = expandedLabels.value.includes(label)
    ? expandedLabels.value.filter(expanded => expanded !== label)
    : [...expandedLabels.value, label]
}

function isOn(matrix: ConditionMatrixDto, sourceLabel: string, signal: string): boolean {
  return matrix.rows.find(row => row.sourceLabel === sourceLabel)
    ?.acceptedSignals.includes(signal) ?? false
}

function parameterNamesOf(strategyId: number): readonly string[] {
  return parameterNamesByStrategyId[strategyId] ?? []
}

/** 沒填過的旋鈕顯示空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(source: StrategyBotSignalSourceDto, name: string): string {
  return source.parameterValues.find(candidate => candidate.name === name)?.value.toString() ?? ''
}

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onParameterInput(index: number, name: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeParameterValue', index, name, value)
  }
}

function onOperatorChange(side: 'buy' | 'sell', chosen: string) {
  const operator = CONDITION_OPERATORS.find(candidate => candidate === chosen)
  if (operator !== undefined) {
    emit('changeOperator', side, operator)
  }
}
</script>

<template>
  <section class="decision-table">
    <AppAlert
      v-for="side in SIDES.filter(candidate => !candidate.matrix().representable)"
      :key="`unrepresentable-${side.key}`"
      tone="warning"
      :data-testid="`matrix-unrepresentable-${side.key}`"
    >
      「{{ side.heading }}」存的是一個且與或交錯的條件，這張表畫不出它。
      在這裡重新勾一次會**換掉**原本那一個。
    </AppAlert>

    <p
      v-if="hasNoStrategies"
      class="decision-table__empty"
      data-testid="no-strategies"
    >
      還沒有任何會吐訊號的策略。先去策略庫建一支，這台機器人才有東西可以聽。
    </p>

    <div
      v-else
      class="decision-table__scroll"
    >
      <table class="decision-table__grid">
        <thead>
          <tr>
            <th
              scope="col"
              class="decision-table__strategy-head"
            >
              它聽哪幾支策略
            </th>
            <th
              v-for="side in SIDES"
              :key="side.key"
              scope="col"
              class="decision-table__side-head"
            >
              {{ side.heading }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-if="sources.length === 0"
            data-testid="no-sources"
          >
            <td
              colspan="3"
              class="decision-table__empty"
            >
              還沒有任何策略。加一支之後，這一列就會出現在兩邊讓你勾。
            </td>
          </tr>

          <template
            v-for="(source, index) in sources"
            :key="source.label + index"
          >
            <tr data-testid="strategy-row">
              <th
                scope="row"
                class="decision-table__strategy"
              >
                <!--
                  列首就是**那支策略的名字**。它是這一整列在說的東西，
                  所以不需要另外一個地方解釋 A 是誰。
                -->
                <span class="decision-table__strategy-name">{{ source.label }}</span>
                <span class="decision-table__strategy-interval">{{
                  intervalOptions.find(option => option.value === source.aggregationInterval)?.label
                    ?? source.aggregationInterval
                }}</span>
                <AppButton
                  type="button"
                  variant="ghost"
                  size="small"
                  label="這一支的設定"
                  :data-testid="`strategy-settings-${index}`"
                  @click="toggleSettings(source.label)"
                >
                  ⚙
                </AppButton>
                <AppButton
                  type="button"
                  variant="danger-ghost"
                  size="small"
                  label="移除這一支"
                  data-testid="strategy-remove"
                  @click="emit('remove', index)"
                >
                  ✕
                </AppButton>
              </th>

              <td
                v-for="side in SIDES"
                :key="side.key"
                class="decision-table__cell"
              >
                <!--
                  一格是三個鍵而不是一個下拉：「買入或持有都算」是真的有人要說的話，
                  而一個下拉說不出它。一個都沒按 = 這一支不參與這一邊。
                -->
                <div
                  class="decision-table__keys"
                  role="group"
                  :aria-label="`${source.label} 在${side.heading}裡要是什麼`"
                >
                  <button
                    v-for="signalKey in SIGNAL_KEYS"
                    :key="signalKey.value"
                    type="button"
                    class="decision-table__key"
                    :class="{
                      'decision-table__key--on': isOn(side.matrix(), source.label, signalKey.value),
                    }"
                    :aria-pressed="isOn(side.matrix(), source.label, signalKey.value)"
                    :title="`${source.label} 是${signalKey.full}時也算`"
                    :data-testid="`cell-${side.key}-${source.label}-${signalKey.value}`"
                    @click="emit('toggleSignal', side.key, source.label, signalKey.value)"
                  >
                    {{ signalKey.short }}
                  </button>
                </div>
              </td>
            </tr>

            <!--
              設定收在它自己那一列底下，按齒輪才打開：收起來時一支策略就是一列，
              十支也還是十列。
            -->
            <tr
              v-if="expandedLabels.includes(source.label)"
              :data-testid="`strategy-settings-panel-${index}`"
            >
              <td
                colspan="3"
                class="decision-table__settings"
              >
                <label class="decision-table__field">
                  <span class="decision-table__field-name">這一支在表上叫什麼</span>
                  <AppInput
                    :model-value="source.label"
                    type="text"
                    data-testid="strategy-label-input"
                    @update:model-value="emit('changeLabel', index, String($event))"
                  />
                </label>

                <label class="decision-table__field">
                  <span class="decision-table__field-name">用哪一支策略</span>
                  <AppSelect
                    :model-value="String(source.strategyId)"
                    data-testid="strategy-select"
                    @update:model-value="emit('changeStrategy', index, Number($event))"
                  >
                    <option
                      v-for="strategyOption in strategyOptions"
                      :key="strategyOption.value"
                      :value="String(strategyOption.value)"
                    >
                      {{ strategyOption.label }}
                    </option>
                  </AppSelect>
                </label>

                <label class="decision-table__field">
                  <span class="decision-table__field-name">看多粗的 K 線</span>
                  <AppSelect
                    :model-value="source.aggregationInterval"
                    data-testid="strategy-interval-select"
                    @update:model-value="emit('changeInterval', index, String($event))"
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
                  v-for="name in parameterNamesOf(source.strategyId)"
                  :key="name"
                  class="decision-table__field"
                >
                  <span class="decision-table__field-name">{{ name }}</span>
                  <AppInput
                    :model-value="parameterValueOf(source, name)"
                    type="number"
                    inputmode="decimal"
                    placeholder="用它的預設值"
                    data-testid="strategy-parameter-input"
                    @update:model-value="onParameterInput(index, name, $event)"
                  />
                </label>
              </td>
            </tr>
          </template>
        </tbody>

        <tfoot>
          <tr>
            <th
              scope="row"
              class="decision-table__operator-head"
            >
              上面勾起來的那幾列要…
            </th>
            <td
              v-for="side in SIDES"
              :key="side.key"
              class="decision-table__cell"
            >
              <AppSelect
                :model-value="side.matrix().operator"
                :data-testid="`operator-${side.key}`"
                @update:model-value="onOperatorChange(side.key, $event)"
              >
                <option
                  v-for="option in operatorOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </AppSelect>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <AppButton
      v-if="canAdd && !hasNoStrategies"
      type="button"
      variant="secondary"
      size="small"
      data-testid="strategy-add"
      @click="emit('add')"
    >
      ＋ 加一支策略
    </AppButton>
    <p
      v-else-if="!hasNoStrategies"
      class="decision-table__empty"
      data-testid="strategy-limit"
    >
      一台機器人最多 {{ signalSourceLimit }} 支策略。
    </p>
  </section>
</template>

<style scoped lang="scss">
.decision-table {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');
  align-items: flex-start;

  &__scroll {
    // 表可以比畫面寬——該捲的是表，不是整頁。
    width: 100%;
    overflow-x: auto;
  }

  &__grid {
    border-collapse: collapse;
    width: 100%;
  }

  th,
  td {
    border-bottom: 1px solid color('border');
    padding: spacing('2xs') spacing('xs');
    text-align: left;
    vertical-align: middle;
  }

  thead th {
    color: color('text-faint');
    font-size: font-size('2xs');
    font-weight: font-weight('medium');
  }

  &__side-head {
    // 兩欄一樣寬，好讓左右對照——這張表存在的理由就是那個對照。
    width: 14ch;
  }

  &__strategy {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    font-weight: font-weight('regular');
  }

  &__strategy-name {
    color: color('text-strong');
    font-size: font-size('xs');
  }

  &__strategy-interval {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__keys {
    display: flex;
    gap: spacing('3xs');
  }

  &__key {
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: transparent;
    cursor: pointer;
    padding: spacing('3xs') spacing('2xs');
    min-width: 2.25rem;
    color: color('text-faint');
    font-size: font-size('2xs');
    font-family: inherit;

    &:hover {
      border-color: color('primary');
      color: color('text');
    }

    // 按下去的那一格要一眼看得出來——這張表的全部資訊就是哪幾格亮著。
    &--on {
      border-color: color('primary');
      background-color: color('primary-soft');
      color: color('primary-strong');
      font-weight: font-weight('semibold');
    }
  }

  &__settings {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('sm');
    background-color: color('surface-muted');
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 10rem;
  }

  &__field-name {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__operator-head {
    color: color('text-faint');
    font-size: font-size('2xs');
    font-weight: font-weight('regular');
  }

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
  }
}
</style>
