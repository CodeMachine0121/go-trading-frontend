<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import StepCard from '~/components/molecules/StepCard.vue'
import StepSettingsPanel from '~/components/molecules/StepSettingsPanel.vue'
import type { TradingStrategySignalSourceDto } from '~/domain/models/dto/trading-strategy-signal-source-dto'
import { readNumberInput } from '~/utilities/number-input-reading'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 有機體：步驟卡一——這份交易策略用哪幾支策略腳本讀盤。
//
// 卡上一列就是一個訊號來源：代號、它用哪一支策略腳本、看多粗的 K 線、
// 調過的參數。點一列，它的設定出現在卡旁邊（窄螢幕從下方拉出）——
// 代號、策略腳本、刻度與參數都在那裡改，刪也在那裡刪。
//
// 條件挑得到哪幾個來源，就是這張卡上列著的這幾個；那條連線住在表單那一層，不在這裡。
const {
  sources,
  strategyScriptOptions,
  strategyScriptLabels,
  parameterInputs,
  intervalOptions,
  usageWarnings,
} = defineProps<{
  sources: readonly TradingStrategySignalSourceDto[]
  /**
   * 挑得到的那幾支。存在、但當不了訊號來源的那幾支**不進選單**——挑得到就等於讓人
   * 拼出一份後端會拒絕的交易策略。但一個已經指著它們的來源仍然要說得出自己指著誰，
   * 見下面 strayOption。
   */
  strategyScriptOptions: readonly { value: number, label: string }[]
  /** 每一個來源用的那一支叫什麼（與 `sources` 同一個順序）；挑不得或認不得的那一句也在這裡。 */
  strategyScriptLabels: readonly LocalizedTextVo[]
  /** 每一個來源調過的參數讀成的那一行；沒調過的是空字串。 */
  parameterSummaries: readonly string[]
  /** 每一個來源的每一個參數欄該填著什麼；沒填過的是空白。 */
  parameterInputs: readonly Readonly<Record<string, string>>[]
  intervalOptions: readonly { value: string, label: LocalizedTextVo }[]
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
  usageWarnings: Readonly<Record<number, LocalizedTextVo>>
  /** 這張卡現在被選著——它的設定正開著。 */
  selected: boolean
  /** 設定擺在卡旁邊，還是從下方拉出。 */
  settingsPlacement: 'beside' | 'sheet'
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

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

/** 正在調的那一個來源的參數欄：參數名與它現在填著什麼。 */
const tuningParameterInputs = computed(
  () => (tuningIndex.value === null ? {} : parameterInputs[tuningIndex.value] ?? {}))

/**
 * 這個來源指著一支**選單裡沒有**的策略腳本時，那一支長什麼樣子。
 *
 * 選單的值不在它的選項裡，瀏覽器就什麼都不顯示——而一片空白看起來像「還沒選」。
 * 所以這種腳本補進選單裡，選著、但**按不下去**：它說得出是哪一支、為什麼用不了，
 * 又不會讓任何人真的挑它。
 */
const strayOption = computed(() => (tuning.value === null || tuningIndex.value === null
  || strategyScriptOptions.some(option => option.value === tuning.value?.strategyScriptId)
  ? null
  : {
      value: tuning.value.strategyScriptId,
      label: strategyScriptLabelOf(tuningIndex.value),
    }))

function strategyScriptLabelOf(index: number): string {
  const label = strategyScriptLabels[index]

  return label === undefined ? '' : localize(label)
}

function intervalLabelOf(interval: string): string {
  const option = intervalOptions.find(candidate => candidate.value === interval)

  return option === undefined ? interval : localize(option.label)
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
    :kicker="t('tradingStrategy.signalSourceCard.kicker')"
    :title="t('tradingStrategy.signalSourceCard.title')"
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
      {{ t('tradingStrategy.signalSourceCard.noStrategyScripts') }}
    </p>
    <p
      v-else-if="shortage === 'noSignalStrategyScripts'"
      class="signal-source-card__note"
      data-testid="no-signal-strategy-scripts"
    >
      {{ t('tradingStrategy.signalSourceCard.noSignalStrategyScripts') }}
    </p>
    <p
      v-else-if="sources.length === 0"
      class="signal-source-card__note"
      data-testid="no-sources"
    >
      {{ t('tradingStrategy.signalSourceCard.noSources') }}
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
            {{ strategyScriptLabelOf(index) }} · {{ intervalLabelOf(source.aggregationInterval) }}
          </span>
          <span
            v-if="parameterSummaries[index]"
            class="signal-source-card__parameters"
          >{{ parameterSummaries[index] }}</span>
        </button>

        <AppButton
          type="button"
          variant="danger-ghost"
          size="small"
          :label="t('tradingStrategy.signalSourceCard.removeSource', { label: source.label })"
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
      {{ t('tradingStrategy.signalSourceCard.addSource') }}
    </AppButton>
    <p
      v-else-if="shortage === null"
      class="signal-source-card__note"
      data-testid="signal-source-limit"
    >
      {{ t('tradingStrategy.signalSourceCard.sourceLimit', { limit: signalSourceLimit }) }}
    </p>

    <template #settings>
      <StepSettingsPanel
        :open="selected"
        :title="tuning === null
          ? t('tradingStrategy.signalSourceCard.settingsTitle')
          : t('tradingStrategy.signalSourceCard.namedSettingsTitle', { label: tuning.label })"
        :placement="settingsPlacement"
        @close="close"
      >
        <div
          v-if="tuning !== null && tuningIndex !== null"
          class="signal-source-card__settings"
          data-testid="strategy-script-settings-panel"
        >
          <FormField :label="t('tradingStrategy.signalSourceCard.labelField')">
            <AppInput
              :model-value="tuning.label"
              type="text"
              data-testid="strategy-script-label-input"
              @update:model-value="emit('changeLabel', tuningIndex, String($event))"
            />
          </FormField>

          <FormField :label="t('tradingStrategy.signalSourceCard.strategyScriptField')">
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
            >{{ t('tradingStrategy.signalSourceCard.strayStrategyScriptNote') }}</span>
          </FormField>

          <FormField :label="t('tradingStrategy.signalSourceCard.intervalField')">
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
                {{ localize(intervalOption.label) }}
              </option>
            </AppSelect>
          </FormField>

          <FormField
            v-for="(parameterInput, name) in tuningParameterInputs"
            :key="name"
            :label="name"
          >
            <AppInput
              :model-value="parameterInput"
              type="number"
              inputmode="decimal"
              :placeholder="t('tradingStrategy.signalSourceCard.parameterPlaceholder')"
              data-testid="strategy-script-parameter-input"
              @update:model-value="onParameterInput(name, $event)"
            />
          </FormField>

          <p
            v-if="usageWarnings[tuningIndex]"
            class="signal-source-card__warning"
            data-testid="strategy-script-usage-warning"
          >
            {{ localize(usageWarnings[tuningIndex]) }}
          </p>

          <AppButton
            type="button"
            variant="danger-ghost"
            block
            data-testid="strategy-script-settings-remove"
            @click="remove(tuningIndex)"
          >
            {{ t('tradingStrategy.signalSourceCard.removeThisSource') }}
          </AppButton>
        </div>

        <p
          v-else
          class="signal-source-card__note"
        >
          {{ t('tradingStrategy.signalSourceCard.settingsHint') }}
        </p>

        <template #actions>
          <AppButton
            type="button"
            data-testid="strategy-script-settings-done"
            @click="close"
          >
            {{ t('tradingStrategy.common.done') }}
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
