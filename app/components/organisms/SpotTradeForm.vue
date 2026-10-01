<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import SpotTradeFillEditor from '~/components/molecules/SpotTradeFillEditor.vue'
import TradePrefillBanner from '~/components/molecules/TradePrefillBanner.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import { useSpotTradeDraft } from '~/composables/use-spot-trade-draft'
import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'

const {
  existingRecord = null,
  journalLinkIdentifier = null,
  initialFillKind = 'buy',
  timeZoneIdentifier,
  spotTradeJournalApplication,
  tradeJournalSettingApplication,
  tradingStrategyApplication,
} = defineProps<{
  existingRecord?: SpotTradeRecordDto | null
  journalLinkIdentifier?: string | null
  initialFillKind?: SpotTradeFillKind
  timeZoneIdentifier: string
  spotTradeJournalApplication: SpotTradeJournalApplication
  tradeJournalSettingApplication: TradeJournalSettingApplication
  tradingStrategyApplication: TradingStrategyApplication
}>()

const emit = defineEmits<{
  saved: [record: SpotTradeRecordDto]
  dirtyChange: [dirty: boolean]
  redirect: [path: string]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const draft = useSpotTradeDraft(
  {
    timeZoneIdentifier: () => timeZoneIdentifier,
    existingRecord: () => existingRecord,
    initialFillKind: () => initialFillKind,
  },
  spotTradeJournalApplication,
  tradeJournalSettingApplication,
  tradingStrategyApplication,
)
const addingToExistingTrade = computed(() => existingRecord !== null)

watch(draft.dirty, dirty => emit('dirtyChange', dirty))

onMounted(async () => {
  await draft.loadReferenceData()
  if (journalLinkIdentifier === null) {
    return
  }

  const prefill = await draft.applyJournalLink(journalLinkIdentifier)
  if (prefill?.targetPath && !addingToExistingTrade.value) {
    emit('redirect', `${prefill.targetPath}&journalLink=${encodeURIComponent(journalLinkIdentifier)}`)
  }
})

function fieldErrorText(field: TradeFormField): string | null {
  const fieldError = draft.fieldError(field)

  return fieldError === null ? null : localize(fieldError)
}

const tradingStrategyValue = computed({
  get: () => draft.tradingStrategyId.value === null ? '' : String(draft.tradingStrategyId.value),
  set: (value: string) => {
    draft.tradingStrategyId.value = value === '' ? null : Number(value)
  },
})
</script>

<template>
  <form
    class="spot-trade-form"
    data-testid="spot-trade-form"
    @submit.prevent="draft.save().then(saved => saved && emit('saved', saved))"
  >
    <TradePrefillBanner
      v-if="draft.prefill.value || draft.prefillMessage.value"
      :source="draft.prefill.value?.toSourceDto() ?? null"
      journal-path="/spot-trade-journal"
      :message="draft.prefillMessage.value"
      :show-journal-link="draft.prefillNotFound.value"
      :time-zone-identifier="timeZoneIdentifier"
    />

    <p
      v-if="draft.prefillLoading.value"
      class="spot-trade-form__state"
      data-testid="prefill-loading"
    >
      {{ t('tradeJournal.spotForm.loadingPrefill') }}
    </p>

    <AppAlert
      v-if="draft.referenceFailureMessage.value"
      tone="warning"
      data-testid="reference-failure"
    >
      {{ localize(draft.referenceFailureMessage.value) }}
    </AppAlert>

    <div
      v-if="!addingToExistingTrade"
      class="spot-trade-form__grid"
    >
      <FormField
        :label="t('tradeJournal.spotForm.symbol')"
        :hint="draft.prefilledFields.value.has('symbol') ? t('tradeJournal.spotForm.prefilled') : t('tradeJournal.spotForm.symbolHint')"
        :error-message="fieldErrorText('symbol')"
      >
        <AppInput
          v-model="draft.symbol.value"
          autocapitalize="characters"
          placeholder="2330"
          :highlighted="draft.prefilledFields.value.has('symbol')"
          :invalid="draft.fieldError('symbol') !== null"
          data-testid="trade-symbol"
        />
      </FormField>

      <FormField
        :label="t('tradeJournal.planPanel.plannedStopLoss')"
        :hint="draft.preview.value.stopLossDistanceText
          ? t('tradeJournal.spotForm.stopLossHint', {
            distance: localize(draft.preview.value.stopLossDistanceText),
            risk: draft.preview.value.plannedRiskText ?? '',
          })
          : undefined"
        :error-message="fieldErrorText('plannedStopLossPrice')"
      >
        <AppInput
          v-model="draft.plannedStopLossText.value"
          inputmode="decimal"
          :highlighted="draft.prefilledFields.value.has('plannedStopLossPrice')"
          :invalid="draft.fieldError('plannedStopLossPrice') !== null"
          data-testid="trade-planned-stop-loss"
        />
      </FormField>

      <FormField
        :label="t('tradeJournal.planPanel.plannedTakeProfit')"
        :hint="draft.preview.value.takeProfitDistanceText ? localize(draft.preview.value.takeProfitDistanceText) : undefined"
        :error-message="fieldErrorText('plannedTakeProfitPrice')"
      >
        <AppInput
          v-model="draft.plannedTakeProfitText.value"
          inputmode="decimal"
          :highlighted="draft.prefilledFields.value.has('plannedTakeProfitPrice')"
          :invalid="draft.fieldError('plannedTakeProfitPrice') !== null"
          data-testid="trade-planned-take-profit"
        />
      </FormField>

      <FormField
        :label="t('tradeJournal.planPanel.confidence')"
        grouped
        :error-message="fieldErrorText('confidence')"
      >
        <AppRating
          v-model="draft.confidence.value"
          :label="t('tradeJournal.planPanel.confidence')"
          data-testid="trade-confidence"
        />
      </FormField>
    </div>

    <section class="spot-trade-form__section">
      <h3 class="spot-trade-form__heading">
        {{ t('tradeJournal.spotForm.fillsHeading') }}
      </h3>
      <SpotTradeFillEditor
        :fills="draft.fills.value"
        :prefilled-fields="draft.prefilledFields.value"
        :rejected-field="draft.rejectedField.value"
        :rejection-message="draft.rejectionMessage.value"
        :whole-shares-message="draft.preview.value.wholeSharesMessage"
        @add="draft.addFill"
        @remove="draft.removeFill"
      />
      <p
        class="spot-trade-form__preview"
        data-testid="draft-preview"
      >
        {{ t('tradeJournal.spotForm.previewHolding') }} <span data-testid="preview-holding">{{ draft.preview.value.holdingText }}</span>{{ t('tradeJournal.spotForm.previewAverageBuy') }}
        <span data-testid="preview-average-buy">{{ draft.preview.value.averageBuyPriceText ?? '—' }}</span>
        <template v-if="draft.preview.value.entrySlippageText">
          {{ t('tradeJournal.spotForm.previewSeparator') }}<span data-testid="preview-entry-slippage">{{ localize(draft.preview.value.entrySlippageText) }}</span>
        </template>
      </p>
    </section>

    <section
      v-if="!addingToExistingTrade"
      class="spot-trade-form__section"
    >
      <FormField
        :label="t('tradeJournal.spotForm.tradingStrategy')"
        :hint="draft.prefilledFields.value.has('tradingStrategy') ? t('tradeJournal.spotForm.prefilled') : t('tradeJournal.spotForm.tradingStrategyHint')"
        :error-message="fieldErrorText('tradingStrategy')"
      >
        <AppSelect
          v-model="tradingStrategyValue"
          :highlighted="draft.prefilledFields.value.has('tradingStrategy')"
          data-testid="trade-trading-strategy"
        >
          <option value="">
            {{ t('tradeJournal.spotForm.noTradingStrategy') }}
          </option>
          <option
            v-for="tradingStrategy in draft.tradingStrategies.value"
            :key="tradingStrategy.id"
            :value="String(tradingStrategy.id)"
          >
            {{ tradingStrategy.name }}
          </option>
        </AppSelect>
      </FormField>
      <FormField :label="t('tradeJournal.spotForm.entryReason')">
        <AppTextarea
          v-model="draft.entryReason.value"
          data-testid="trade-entry-reason"
        />
      </FormField>
      <FormField
        :label="t('tradeJournal.common.setupTags')"
        grouped
      >
        <TradeTagPicker
          v-model:selected-ids="draft.setupTagIds.value"
          :tags="draft.setupTags.value"
          @create="draft.createSetupTag"
        />
      </FormField>
    </section>

    <AppAlert
      v-if="draft.rejectionMessage.value && draft.rejectedField.value === null"
      tone="danger"
      data-testid="form-rejection"
    >
      {{ localize(draft.rejectionMessage.value) }}
      <template
        v-if="draft.conflictingTradeId.value !== null || draft.recordedTradeId.value !== null"
        #action
      >
        <AppButton
          variant="ghost"
          :to="`/spot-trade-journal/${draft.conflictingTradeId.value ?? draft.recordedTradeId.value}${draft.conflictingTradeId.value !== null ? '?addFill=buy' : ''}`"
          data-testid="form-rejection-go"
        >
          {{ draft.conflictingTradeId.value !== null
            ? t('tradeJournal.spotForm.goToTradeAddBuy', { id: draft.conflictingTradeId.value })
            : t('tradeJournal.spotForm.goToTrade', { id: draft.recordedTradeId.value ?? '' }) }}
        </AppButton>
      </template>
    </AppAlert>

    <div class="spot-trade-form__actions">
      <AppButton
        type="submit"
        :disabled="draft.saving.value || draft.prefillLoading.value"
        data-testid="trade-save"
      >
        {{ draft.saving.value ? t('tradeJournal.settingsPanel.saving') : (addingToExistingTrade ? t('tradeJournal.common.save') : t('tradeJournal.spotForm.saveAsOpen')) }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.spot-trade-form {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__state {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');

    @include respond-to('md') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include respond-to('lg') {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
  }

  &__preview {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
  }
}
</style>
