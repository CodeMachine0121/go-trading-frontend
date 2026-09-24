<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import StepCard from '~/components/molecules/StepCard.vue'
import StepSettingsPanel from '~/components/molecules/StepSettingsPanel.vue'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { readNumberInput } from '~/utilities/number-input-reading'

// 有機體：步驟卡一——這份交易策略用哪幾支策略腳本讀盤。
//
// 卡上一列就是一個訊號來源（也就是一塊零件）：代號、它用哪一支策略腳本、看多粗的 K 線、
// 調過的參數。點一列，它的設定出現在卡旁邊（窄螢幕從下方拉出）——
// 代號、策略腳本、刻度與參數都在那裡改，刪也在那裡刪。
//
// 條件挑得到哪幾個來源，就是這張卡上列著的這幾個；那條連線住在表單那一層，不在這裡。
const {
  sources,
  strategyScriptOptions,
  unusableStrategyScripts,
  intervalOptions,
  parameterNamesByStrategyScriptId,
  usageWarnings,
} = defineProps<{
  sources: readonly TradingStrategySignalSourceDto[]
  strategyScriptOptions: readonly { value: number, label: string }[]
  /**
   * 存在、但當不了訊號來源的那幾支，以及原因。
   *
   * 它們**不進選單**——挑得到就等於讓人拼出一份後端會拒絕的交易策略。但一個
   * 已經指著它們的來源仍然要說得出自己指著誰，見下面 strayOption。
   */
  unusableStrategyScripts: Readonly<Record<number, string>>
  intervalOptions: readonly { value: string, label: string }[]
  /** 每一支策略腳本宣告了哪幾個旋鈕。挑了策略腳本才知道有哪幾格要填。 */
  parameterNamesByStrategyScriptId: Readonly<Record<number, readonly string[]>>
  /** 還加不加得動——到了上限時新增鍵**不存在**，而不是按了才被拒。 */
  canAdd: boolean
  signalSourceLimit: number
  /**
   * 一支挑得到的策略腳本都沒有，而且是哪一種沒有。挑得到就是 `null`。
   *
   * 原因有兩種，下一步完全不同：一支都沒建過的人要去建一支；
   * 建了好幾支卻沒有一支吐訊號的人要去改它們的指標值種類。
   */
  shortage: 'noStrategyScripts' | 'noSignalStrategyScripts' | null
  /** 哪幾個來源被條件用著（以它在清單上的位置記），刪之前先說一聲。 */
  usageWarnings: Readonly<Record<number, string>>
  /** 這張卡現在被選著——它的設定正開著。 */
  selected: boolean
  /** 設定擺在卡旁邊，還是從下方拉出。 */
  settingsPlacement: 'beside' | 'sheet'
}>()

const emit = defineEmits<{
  select: []
  close: []
  add: []
  remove: [index: number]
  changeLabel: [index: number, label: string]
  changeStrategyScript: [index: number, strategyScriptId: number]
  changeInterval: [index: number, interval: string]
  changeParameterValue: [index: number, name: string, value: number]
}>()

/**
 * 正在調的那一個來源，用它在清單上的位置記。
 *
 * 不用代號記：代號正是設定裡改得動的東西之一，用代號記的話一改名設定就自己關掉。
 */
const tuningIndex = ref<number | null>(null)

const tuning = computed(
  () => (tuningIndex.value === null ? null : sources[tuningIndex.value] ?? null))

const tuningParameterNames = computed(() => (tuning.value === null
  ? []
  : parameterNamesByStrategyScriptId[tuning.value.strategyScriptId] ?? []))

/**
 * 這個來源指著一支**選單裡沒有**的策略腳本時，那一支長什麼樣子。
 *
 * 選單的值不在它的選項裡，瀏覽器就什麼都不顯示——而一片空白看起來像「還沒選」。
 * 所以這種腳本補進選單裡，選著、但**按不下去**：它說得出是哪一支、為什麼用不了，
 * 又不會讓任何人真的挑它。認不得那個識別碼時（腳本被刪了、或那份採用被收回）也照樣說一句。
 */
function strayOptionOf(source: TradingStrategySignalSourceDto | null) {
  if (source === null
    || strategyScriptOptions.some(option => option.value === source.strategyScriptId)) {
    return null
  }

  return {
    value: source.strategyScriptId,
    label: unusableStrategyScripts[source.strategyScriptId]
      ?? `這支策略腳本（編號 ${source.strategyScriptId}）已經不在了`,
  }
}

const strayOption = computed(() => strayOptionOf(tuning.value))

function strategyScriptNameOf(source: TradingStrategySignalSourceDto): string {
  return strategyScriptOptions.find(option => option.value === source.strategyScriptId)?.label
    ?? strayOptionOf(source)?.label ?? ''
}

function intervalLabelOf(interval: string): string {
  return intervalOptions.find(option => option.value === interval)?.label ?? interval
}

/** 卡上那一行的參數：調過的才列，沒調的就是用那支策略腳本自己的預設值。 */
function parameterSummaryOf(source: TradingStrategySignalSourceDto): string {
  return source.parameterValues.map(parameter => `${parameter.name}=${parameter.value}`).join(' · ')
}

/** 沒填過的旋鈕顯示空白，而不是一個假的 0——0 是一個值，空白是還沒決定。 */
function parameterValueOf(name: string): string {
  return tuning.value?.parameterValues.find(candidate => candidate.name === name)?.value.toString() ?? ''
}

function tune(index: number) {
  tuningIndex.value = index
  emit('select')
}

/** 加一個就直接打開它的設定：加了之後的下一件事幾乎一定是挑它用哪一支。 */
function add() {
  const addedAt = sources.length
  emit('add')
  tune(addedAt)
}

function remove(index: number) {
  if (tuningIndex.value === index) {
    tuningIndex.value = null
  }
  else if (tuningIndex.value !== null && tuningIndex.value > index) {
    tuningIndex.value -= 1
  }
  emit('remove', index)
}

function close() {
  tuningIndex.value = null
  emit('close')
}

/** 打到一半的東西不往下送——讀不成數字就當作使用者還沒打完。 */
function onParameterInput(name: string, raw: string | number) {
  const value = readNumberInput(raw)
  if (value !== null && tuningIndex.value !== null) {
    emit('changeParameterValue', tuningIndex.value, name, value)
  }
}
</script>

<template>
  <StepCard
    class="signal-source-card"
    kicker="訊號來源"
    title="用哪幾支策略腳本讀盤"
    tone="accent"
    :selected="selected"
    :beside="settingsPlacement === 'beside'"
    data-testid="step-sources"
  >
    <template #badge>
      <AppIcon
        name="formula"
        size="small"
      />
    </template>

    <template #aside>
      <span class="signal-source-card__count">{{ sources.length }} / {{ signalSourceLimit }}</span>
    </template>

    <p
      v-if="shortage === 'noStrategyScripts'"
      class="signal-source-card__note"
      data-testid="no-strategy-scripts"
    >
      還沒有任何策略腳本。先去策略腳本庫建一支。
    </p>
    <p
      v-else-if="shortage === 'noSignalStrategyScripts'"
      class="signal-source-card__note"
      data-testid="no-signal-strategy-scripts"
    >
      你有策略腳本，但沒有一支吐訊號，所以一支都挑不到。
      條件比對的是買入／賣出／持有，只有指標值種類是「一個信號」的腳本說得出那三個值——
      去策略腳本庫把要用的那幾支改成「一個信號」（算式要回傳 indicator.Signal）。
    </p>
    <p
      v-else-if="sources.length === 0"
      class="signal-source-card__note"
      data-testid="no-sources"
    >
      還沒有訊號來源。加一個，底下兩張卡就能拿它來判斷買入與賣出。
    </p>

    <ul class="signal-source-card__rows">
      <li
        v-for="(source, index) in sources"
        :key="source.label + index"
        class="signal-source-card__row"
        :class="{ 'signal-source-card__row--tuning': selected && tuningIndex === index }"
        data-testid="strategy-script-row"
      >
        <button
          type="button"
          class="signal-source-card__source"
          :data-testid="`strategy-script-settings-${index}`"
          @click="tune(index)"
        >
          <span class="signal-source-card__label">{{ source.label }}</span>
          <span
            class="signal-source-card__meta"
            :data-testid="`signal-source-${source.label}`"
          >
            {{ strategyScriptNameOf(source) }} · {{ intervalLabelOf(source.aggregationInterval) }}
          </span>
          <span
            v-if="parameterSummaryOf(source) !== ''"
            class="signal-source-card__parameters"
          >{{ parameterSummaryOf(source) }}</span>
        </button>

        <AppButton
          type="button"
          variant="danger-ghost"
          size="small"
          :label="`刪掉「${source.label}」`"
          data-testid="strategy-script-remove"
          @click="remove(index)"
        >
          <AppIcon
            name="delete"
            size="small"
          />
        </AppButton>
      </li>
    </ul>

    <AppButton
      v-if="canAdd && shortage === null"
      type="button"
      variant="ghost"
      size="small"
      class="signal-source-card__add"
      data-testid="strategy-script-add"
      @click="add"
    >
      <AppIcon
        name="plus"
        size="small"
      />
      加一個訊號來源
    </AppButton>
    <p
      v-else-if="shortage === null"
      class="signal-source-card__note"
      data-testid="signal-source-limit"
    >
      一份交易策略最多 {{ signalSourceLimit }} 個訊號來源
    </p>

    <template #settings>
      <StepSettingsPanel
        :open="selected"
        :title="tuning === null ? '訊號來源' : `「${tuning.label}」這個訊號來源`"
        :placement="settingsPlacement"
        @close="close"
      >
        <div
          v-if="tuning !== null && tuningIndex !== null"
          class="signal-source-card__settings"
          data-testid="strategy-script-settings-panel"
        >
          <FormField label="代號（條件裡叫它什麼）">
            <AppInput
              :model-value="tuning.label"
              type="text"
              data-testid="strategy-script-label-input"
              @update:model-value="emit('changeLabel', tuningIndex, String($event))"
            />
          </FormField>

          <FormField label="用哪一支策略腳本">
            <AppSelect
              :model-value="String(tuning.strategyScriptId)"
              :invalid="strayOption !== null"
              data-testid="strategy-script-select"
              @update:model-value="emit('changeStrategyScript', tuningIndex, Number($event))"
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
              class="signal-source-card__warning"
              data-testid="strategy-script-stray-note"
            >這個來源現在用的那一支挑不得，換一支才存得起來。</span>
          </FormField>

          <FormField label="看多粗的 K 線">
            <AppSelect
              :model-value="tuning.aggregationInterval"
              data-testid="strategy-script-interval-select"
              @update:model-value="emit('changeInterval', tuningIndex, String($event))"
            >
              <option
                v-for="intervalOption in intervalOptions"
                :key="intervalOption.value"
                :value="intervalOption.value"
              >
                {{ intervalOption.label }}
              </option>
            </AppSelect>
          </FormField>

          <FormField
            v-for="name in tuningParameterNames"
            :key="name"
            :label="name"
          >
            <AppInput
              :model-value="parameterValueOf(name)"
              type="number"
              inputmode="decimal"
              placeholder="用它的預設值"
              data-testid="strategy-script-parameter-input"
              @update:model-value="onParameterInput(name, $event)"
            />
          </FormField>

          <p
            v-if="usageWarnings[tuningIndex]"
            class="signal-source-card__warning"
            data-testid="strategy-script-usage-warning"
          >
            {{ usageWarnings[tuningIndex] }}
          </p>

          <AppButton
            type="button"
            variant="danger-ghost"
            block
            data-testid="strategy-script-settings-remove"
            @click="remove(tuningIndex)"
          >
            刪掉這個訊號來源
          </AppButton>
        </div>

        <p
          v-else
          class="signal-source-card__note"
        >
          點卡上的一個訊號來源，這裡就能改它的代號、策略腳本、刻度與參數。
        </p>

        <template #actions>
          <AppButton
            type="button"
            data-testid="strategy-script-settings-done"
            @click="close"
          >
            好了
          </AppButton>
        </template>
      </StepSettingsPanel>
    </template>
  </StepCard>
</template>

<style scoped lang="scss">
.signal-source-card {
  &__count {
    color: color('text-faint');
    font-size: font-size('xs');

    @include numeric;
  }

  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
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
    display: flex;
    align-items: center;
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface-raised');
    padding-right: spacing('2xs');
  }

  &__row--tuning {
    border-color: color('primary');
  }

  // 整列都按得到，不是只有代號那一枚——手機上是用拇指點的。
  &__source {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs') spacing('xs');
    cursor: pointer;
    border: 0;
    border-radius: radius('md');
    background: none;
    padding: spacing('xs') spacing('sm');
    min-width: 0;
    color: inherit;
    font: inherit;
    text-align: left;

    @include tap-target;
    @include focus-ring;
  }

  &__label {
    border: 1px solid color('primary');
    border-radius: radius('sm');
    background-color: color('primary-soft');
    padding: spacing('3xs') spacing('xs');
    max-width: 100%;
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__parameters {
    flex-basis: 100%;
    color: color('text-faint');
    font-size: font-size('xs');

    @include numeric;
  }

  &__add {
    align-self: flex-start;
  }

  &__settings {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__warning {
    margin: 0;
    color: color('warning');
    font-size: font-size('xs');
  }
}
</style>
