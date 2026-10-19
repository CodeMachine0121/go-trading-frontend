<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { AggregationIntervalOptionDto } from '~/domain/models/dto/aggregation-interval-option-dto'
import type { ContractTradingModeOptionDto } from '~/domain/models/dto/contract-trading-mode-option-dto'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'

// Organism: create or edit one screening profile; figures left blank fall back to the system defaults.
const { profile, screenableStrategyScripts, aggregationIntervalOptions, tradingModeOptions, saving, failureMessage }
  = defineProps<{
    profile: SymbolScreeningProfileDto | null
    screenableStrategyScripts: readonly StrategyScriptDto[]
    aggregationIntervalOptions: readonly AggregationIntervalOptionDto[]
    tradingModeOptions: readonly ContractTradingModeOptionDto[]
    saving: boolean
    failureMessage: LocalizedTextVo | null
  }>()

const emit = defineEmits<{ save: [writeDto: SymbolScreeningProfileWriteDto], cancel: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const terms = profile?.terms ?? null
const name = ref(profile?.name ?? '')
const strategyScriptId = ref(String(profile?.strategyScriptId ?? screenableStrategyScripts[0]?.id ?? ''))
const aggregationInterval = ref(terms?.aggregationInterval ?? aggregationIntervalOptions[0]?.value ?? '')
const tradingMode = ref(terms?.tradingMode ?? 'longOnly')
const leverage = ref(terms?.leverage.toString() ?? '')
const entryCostPercentage = ref(terms?.entryCostPercentage.toString() ?? '')
const slippagePercentage = ref(terms?.slippagePercentage.toString() ?? '')
const historyDays = ref(terms === null ? '' : String(terms.historyDays))
const segmentCount = ref(terms === null ? '' : String(terms.segmentCount))
const minimumTradeCount = ref(terms === null ? '' : String(terms.minimumTradeCount))
const minimumAverageDailyQuoteVolume = ref(terms?.minimumAverageDailyQuoteVolume.toString() ?? '')
const baselineSymbols = ref(terms?.baselineSymbols.join(', ') ?? '')

const hasScreenableStrategyScripts = computed(() => screenableStrategyScripts.length > 0)

function submit() {
  // Enter in a field submits the form even while the save button is disabled.
  if (!hasScreenableStrategyScripts.value) {
    return
  }

  emit('save', new SymbolScreeningProfileWriteDto(
    profile?.id ?? null,
    name.value,
    Number(strategyScriptId.value),
    aggregationInterval.value,
    tradingMode.value,
    leverage.value,
    entryCostPercentage.value,
    slippagePercentage.value,
    historyDays.value,
    segmentCount.value,
    minimumTradeCount.value,
    minimumAverageDailyQuoteVolume.value,
    baselineSymbols.value,
    profile?.parameterValues ?? [],
  ))
}
</script>

<template>
  <form
    class="symbol-screening-profile-form"
    data-testid="symbol-screening-profile-form"
    @submit.prevent="submit"
  >
    <AppAlert
      v-if="!hasScreenableStrategyScripts"
      tone="warning"
      data-testid="symbol-screening-no-screenable-scripts"
    >
      {{ t('symbolScreening.profileForm.noScreenableStrategyScripts') }}
    </AppAlert>

    <div class="symbol-screening-profile-form__fields">
      <FormField :label="t('symbolScreening.profileForm.name')">
        <AppInput
          v-model="name"
          data-testid="symbol-screening-profile-name"
        />
      </FormField>
      <FormField :label="t('symbolScreening.profileForm.strategyScript')">
        <AppSelect
          v-model="strategyScriptId"
          data-testid="symbol-screening-profile-strategy-script"
        >
          <option
            v-for="strategyScript in screenableStrategyScripts"
            :key="strategyScript.id"
            :value="String(strategyScript.id)"
          >
            {{ strategyScript.name }}
          </option>
        </AppSelect>
      </FormField>
      <FormField :label="t('symbolScreening.profileForm.aggregationInterval')">
        <AppSelect
          v-model="aggregationInterval"
          data-testid="symbol-screening-profile-aggregation-interval"
        >
          <option
            v-for="option in aggregationIntervalOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ localize(option.label) }}
          </option>
        </AppSelect>
      </FormField>
      <FormField :label="t('symbolScreening.profileForm.tradingMode')">
        <AppSelect
          v-model="tradingMode"
          data-testid="symbol-screening-profile-trading-mode"
        >
          <option
            v-for="option in tradingModeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ localize(option.label) }}
          </option>
        </AppSelect>
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.historyDays')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="historyDays"
          inputmode="numeric"
          data-testid="symbol-screening-profile-history-days"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.segmentCount')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="segmentCount"
          inputmode="numeric"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.minimumTradeCount')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="minimumTradeCount"
          inputmode="numeric"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.minimumAverageDailyQuoteVolume')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="minimumAverageDailyQuoteVolume"
          inputmode="decimal"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.leverage')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="leverage"
          inputmode="decimal"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.entryCostPercentage')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="entryCostPercentage"
          inputmode="decimal"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.slippagePercentage')"
        :hint="t('symbolScreening.profileForm.defaultHint')"
      >
        <AppInput
          v-model="slippagePercentage"
          inputmode="decimal"
        />
      </FormField>
      <FormField
        :label="t('symbolScreening.profileForm.baselineSymbols')"
        :hint="t('symbolScreening.profileForm.baselineSymbolsHint')"
      >
        <AppInput
          v-model="baselineSymbols"
          data-testid="symbol-screening-profile-baseline-symbols"
        />
      </FormField>
    </div>

    <p
      v-if="failureMessage !== null"
      class="symbol-screening-profile-form__failure"
      data-testid="symbol-screening-profile-failure"
    >
      {{ localize(failureMessage) }}
    </p>

    <div class="symbol-screening-profile-form__actions">
      <AppButton
        type="submit"
        size="small"
        :disabled="saving || !hasScreenableStrategyScripts"
        data-testid="symbol-screening-profile-save"
      >
        {{ t('symbolScreening.profileForm.save') }}
      </AppButton>
      <AppButton
        type="button"
        variant="ghost"
        size="small"
        data-testid="symbol-screening-profile-cancel"
        @click="emit('cancel')"
      >
        {{ t('symbolScreening.profileForm.cancel') }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.symbol-screening-profile-form {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: spacing('xs');

    @include respond-to('md') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__failure {
    margin: 0;
    color: color('danger');
    font-size: font-size('sm');
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
  }
}
</style>
