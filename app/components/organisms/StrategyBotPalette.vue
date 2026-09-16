<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import type { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'
import type { StrategyBotSignalSourceDto } from '~/domain/models/dto/strategy-bot-signal-source-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：這台機器人手上有哪些積木——以及每一塊是什麼。
//
// **信號來源與積木是同一個東西。** 上一版把它們做成兩塊：上面宣告來源，
// 下面的抽屜顯示它們的影子（只有一個代號字母）。那帶來兩個問題，而它們是同一個病：
// 宣告那一塊愈長，拼的地方就被擠得愈下面；而影子說不出自己是哪一支策略。
//
// 合在一起之後，一個來源就是一塊積木：它寫著那支策略的名字，拖得動，
// 而它自己的設定（代號、刻度、旋鈕）收在它自己底下，要調才打開——
// 收起來的時候一個來源就是一行，十個來源也還是十行。
const {
  sources, blockDrawer, strategyOptions, intervalOptions, parameterNamesByStrategyId,
  canAdd, signalSourceLimit, hasNoStrategies, usageWarnings,
} = defineProps<{
  sources: readonly StrategyBotSignalSourceDto[]
  /** 這一刻每一塊放不放得進去，以及放不進去的話那句話是什麼。 */
  blockDrawer: ConditionBlockDrawerDto
  strategyOptions: readonly { value: number, label: string }[]
  intervalOptions: readonly { value: string, label: string }[]
  parameterNamesByStrategyId: Readonly<Record<number, readonly string[]>>
  canAdd: boolean
  signalSourceLimit: number
  hasNoStrategies: boolean
  /** 哪幾個來源正被條件用著。**只說一聲，不擋刪除。** */
  usageWarnings: Readonly<Record<number, string>>
}>()

const emit = defineEmits<{
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategy: [index: number, strategyId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
  pick: [option: ConditionBlockOptionDto]
  dragStart: [option: ConditionBlockOptionDto]
  dragEnd: []
}>()

/**
 * 哪幾個來源正打開著它的設定。
 *
 * 用**代號**記而不是用位置：刪掉中間一個之後，後面每一個的位置都往前挪一格，
 * 而使用者看到的會是「另一個來源的設定自己打開了」。
 */
const expandedLabels = ref<string[]>([])

function toggleSettings(label: string) {
  expandedLabels.value = expandedLabels.value.includes(label)
    ? expandedLabels.value.filter(expanded => expanded !== label)
    : [...expandedLabels.value, label]
}

/** 一個來源對應到抽屜裡的哪一塊——它們是同一個東西的兩種說法。 */
function blockFor(source: StrategyBotSignalSourceDto): ConditionBlockOptionDto | undefined {
  return blockDrawer.comparisons.find(option => option.block.sourceLabel === source.label)
}

function parameterNamesOf(strategyId: number): readonly string[] {
  return parameterNamesByStrategyId[strategyId] ?? []
}

/** 沒填過的旋鈕顯示它自己的空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(source: StrategyBotSignalSourceDto, name: string): string {
  const parameterValue = source.parameterValues.find(candidate => candidate.name === name)

  return parameterValue === undefined ? '' : String(parameterValue.value)
}

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onParameterInput(index: number, name: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null) {
    emit('changeParameterValue', index, name, value)
  }
}

/**
 * 瀏覽器的拖放通道要有東西才認得這是一次拖曳，但**沒有人會去讀它**——
 * 拖著的是哪一塊由工作台自己記著。
 */
function onDragStart(event: DragEvent, option: ConditionBlockOptionDto) {
  event.dataTransfer?.setData('text/plain', option.label)
  emit('dragStart', option)
}
</script>

<template>
  <div
    class="palette"
    data-testid="block-drawer"
  >
    <section class="palette__section">
      <header class="palette__head">
        <h3 class="palette__heading">
          信號來源
        </h3>
        <span class="palette__note">拖到右邊，或點一個空位再點它</span>
      </header>

      <p
        v-if="hasNoStrategies"
        class="palette__empty"
        data-testid="signal-sources-no-strategies"
      >
        還沒有任何會吐訊號的策略。先去策略庫建一支，這裡才挑得到。
      </p>
      <p
        v-else-if="sources.length === 0"
        class="palette__empty"
        data-testid="signal-sources-empty"
      >
        這台機器人還沒有任何信號來源。加一支策略之後，它就會變成一塊可以拼的積木。
      </p>

      <ul class="palette__blocks">
        <li
          v-for="(source, index) in sources"
          :key="source.label + index"
          data-testid="signal-source-row"
        >
          <div class="palette__block-line">
            <!--
              一塊積木寫的是**那支策略的名字**，不是一個代號字母。
              使用者記不住 A 是哪一支，而他同時在讀的是一棵三層深的樹。
            -->
            <button
              type="button"
              class="palette__block palette__block--source"
              :class="{ 'palette__block--unavailable': !(blockFor(source)?.enabled ?? false) }"
              :aria-disabled="!(blockFor(source)?.enabled ?? false)"
              :title="blockFor(source)?.enabled
                ? undefined : blockFor(source)?.disabledReason"
              :draggable="true"
              :data-testid="`block-comparison:${source.label}:`"
              @click="blockFor(source)?.enabled ? emit('pick', blockFor(source)!) : undefined"
              @dragstart="blockFor(source) ? onDragStart($event, blockFor(source)!) : undefined"
              @dragend="emit('dragEnd')"
            >
              <span
                class="palette__grip"
                aria-hidden="true"
              >⠿</span>
              <span class="palette__block-text">{{ source.label }}</span>
            </button>

            <AppButton
              type="button"
              variant="ghost"
              size="small"
              label="這個來源的設定"
              :data-testid="`signal-source-settings-${index}`"
              @click="toggleSettings(source.label)"
            >
              ⚙
            </AppButton>

            <AppButton
              type="button"
              variant="danger-ghost"
              size="small"
              label="移除這個來源"
              :title="usageWarnings[index]"
              data-testid="signal-source-remove"
              @click="emit('remove', index)"
            >
              ✕
            </AppButton>
          </div>

          <!--
            設定收在它自己底下，要調才打開：收起來時一個來源就是一行，
            十個來源也還是十行——而不是把拼的地方擠到畫面外。
          -->
          <div
            v-if="expandedLabels.includes(source.label)"
            class="palette__settings"
            :data-testid="`signal-source-settings-panel-${index}`"
          >
            <AppInput
              :model-value="source.label"
              type="text"
              placeholder="這一塊叫什麼"
              data-testid="signal-source-label-input"
              @update:model-value="emit('changeLabel', index, String($event))"
            />

            <AppSelect
              :model-value="String(source.strategyId)"
              data-testid="signal-source-strategy-select"
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

            <AppSelect
              :model-value="source.aggregationInterval"
              data-testid="signal-source-interval-select"
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

            <label
              v-for="name in parameterNamesOf(source.strategyId)"
              :key="name"
              class="palette__parameter"
            >
              <span class="palette__parameter-name">{{ name }}</span>
              <AppInput
                :model-value="parameterValueOf(source, name)"
                type="number"
                inputmode="decimal"
                placeholder="用它的預設值"
                data-testid="signal-source-parameter-input"
                @update:model-value="onParameterInput(index, name, $event)"
              />
            </label>

            <p
              v-if="usageWarnings[index] !== undefined"
              class="palette__warning"
              data-testid="signal-source-usage-warning"
            >
              {{ usageWarnings[index] }}
            </p>
          </div>
        </li>
      </ul>

      <AppButton
        v-if="canAdd"
        type="button"
        variant="secondary"
        size="small"
        block
        data-testid="signal-source-add"
        @click="emit('add')"
      >
        ＋ 加一支策略
      </AppButton>
      <p
        v-else
        class="palette__empty"
        data-testid="signal-source-limit"
      >
        一台機器人最多 {{ signalSourceLimit }} 個信號來源。
      </p>
    </section>

    <section class="palette__section">
      <h3 class="palette__heading">
        群組
      </h3>

      <ul class="palette__blocks">
        <li
          v-for="option in blockDrawer.groups"
          :key="option.key"
        >
          <button
            type="button"
            class="palette__block palette__block--group"
            :class="{ 'palette__block--unavailable': !option.enabled }"
            :aria-disabled="!option.enabled"
            :title="option.enabled ? undefined : option.disabledReason"
            :draggable="true"
            :data-testid="`block-${option.key}`"
            @click="option.enabled ? emit('pick', option) : undefined"
            @dragstart="onDragStart($event, option)"
            @dragend="emit('dragEnd')"
          >
            <span
              class="palette__grip"
              aria-hidden="true"
            >⠿</span>
            <span class="palette__block-text">{{ option.label }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.palette {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  padding: spacing('sm');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    min-width: 0;
  }

  &__head {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('xs');
    font-weight: font-weight('semibold');
  }

  &__note,
  &__empty,
  &__warning {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  &__warning {
    color: color('warning');
  }

  &__blocks {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__block-line {
    display: flex;
    align-items: center;
    gap: spacing('3xs');
  }

  &__block {
    display: flex;
    flex: 1;
    align-items: center;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-raised');

    // 抓得起來的東西要看起來抓得起來。
    cursor: grab;
    padding: spacing('3xs') spacing('2xs');
    min-width: 0;
    color: color('text');
    font-size: font-size('2xs');
    font-family: inherit;
    text-align: left;

    &:active {
      cursor: grabbing;
    }

    &:not(&--unavailable):hover {
      border-color: color('primary');
      color: color('text-strong');
    }

    // 兩類各給一個邊色：拖著的那一塊與它落下去之後的樣子要看得出是同一種東西。
    &--source {
      border-left: 2px solid color('info');
    }

    &--group {
      border-left: 2px solid color('primary');
    }

    &--unavailable {
      opacity: 0.45;
    }
  }

  &__block-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__grip {
    flex: none;
    color: color('text-faint');
    line-height: 1;
  }

  &__settings {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');

    // 縮排說明「這些是上面那一塊的事」，而不是清單上的另一個項目。
    margin: spacing('3xs') 0 spacing('2xs') spacing('sm');
    border-left: 2px solid color('border');
    padding-left: spacing('2xs');
  }

  &__parameter {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__parameter-name {
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
