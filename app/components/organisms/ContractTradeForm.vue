<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import ContractTradeFillEditor from '~/components/molecules/ContractTradeFillEditor.vue'
import TradePrefillBanner from '~/components/molecules/TradePrefillBanner.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import { useContractTradeDraft } from '~/composables/use-contract-trade-draft'
import type { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'

const {
  existingRecord = null,
  journalLinkIdentifier = null,
  timeZoneIdentifier,
  contractTradeJournalApplication,
  tradeJournalSettingApplication,
  tradingStrategyApplication,
} = defineProps<{
  existingRecord?: ContractTradeRecordDto | null
  journalLinkIdentifier?: string | null
  timeZoneIdentifier: string
  contractTradeJournalApplication: ContractTradeJournalApplication
  tradeJournalSettingApplication: TradeJournalSettingApplication
  tradingStrategyApplication: TradingStrategyApplication
}>()

const emit = defineEmits<{
  saved: [record: ContractTradeRecordDto]
  dirtyChange: [dirty: boolean]
  redirect: [path: string]
}>()

const draft = useContractTradeDraft(
  { timeZoneIdentifier: () => timeZoneIdentifier, existingRecord: () => existingRecord },
  contractTradeJournalApplication,
  tradeJournalSettingApplication,
  tradingStrategyApplication,
)
const addingToExistingTrade = computed(() => existingRecord !== null)

const { t } = useI18n()
const { localize } = useLocalizedText()

const prefilledHint = computed(() => t('contractTradeJournal.form.prefilled'))

function fieldErrorText(field: TradeFormField): string | null {
  const fieldError = draft.fieldError(field)

  return fieldError === null ? null : localize(fieldError)
}

watch(draft.dirty, dirty => emit('dirtyChange', dirty))

onMounted(async () => {
  await draft.loadReferenceData()
  if (journalLinkIdentifier === null) {
    return
  }

  const prefill = await draft.applyJournalLink(journalLinkIdentifier)
  if (prefill?.targetPath && !addingToExistingTrade.value) {
    emit('redirect', `${prefill.targetPath}?addFill=entry&journalLink=${encodeURIComponent(journalLinkIdentifier)}`)
  }
})

const tradingStrategyValue = computed({
  get: () => draft.tradingStrategyId.value === null ? '' : String(draft.tradingStrategyId.value),
  set: (value: string) => {
    draft.tradingStrategyId.value = value === '' ? null : Number(value)
  },
})
</script>

<template>
  <form
    class="contract-trade-form"
    data-testid="contract-trade-form"
    @submit.prevent="draft.save().then(saved => saved && emit('saved', saved))"
  >
    <TradePrefillBanner
      v-if="draft.prefill.value || draft.prefillMessage.value"
      :source="draft.prefill.value?.toSourceDto() ?? null"
      journal-path="/contract-trade-journal"
      :message="draft.prefillMessage.value"
      :show-journal-link="draft.prefillNotFound.value"
      :time-zone-identifier="timeZoneIdentifier"
    />

    <p
      v-if="draft.prefillLoading.value"
      class="contract-trade-form__state"
      data-testid="prefill-loading"
    >
      {{ t('contractTradeJournal.form.loadingPrefill') }}
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
      class="contract-trade-form__grid"
    >
      <FormField
        :label="t('contractTradeJournal.form.symbol')"
        :hint="draft.prefilledFields.value.has('symbol') ? prefilledHint : undefined"
        :error-message="fieldErrorText('symbol')"
      >
        <AppInput
          v-model="draft.symbol.value"
          autocapitalize="characters"
          placeholder="BTCUSDT"
          :highlighted="draft.prefilledFields.value.has('symbol')"
          :invalid="draft.fieldError('symbol') !== null"
          data-testid="trade-symbol"
        />
      </FormField>

      <FormField
        :label="t('contractTradeJournal.form.direction')"
        :hint="draft.prefilledFields.value.has('direction') ? prefilledHint : undefined"
      >
        <AppSelect
          v-model="draft.direction.value"
          :highlighted="draft.prefilledFields.value.has('direction')"
          data-testid="trade-direction"
        >
          <option value="long">
            {{ t('contractTradeJournal.form.long') }}
          </option>
          <option value="short">
            {{ t('contractTradeJournal.form.short') }}
          </option>
        </AppSelect>
      </FormField>

      <FormField
        :label="t('contractTradeJournal.form.leverage')"
        :hint="draft.prefilledFields.value.has('leverage') ? prefilledHint : t('contractTradeJournal.form.leverageHint')"
        :error-message="fieldErrorText('leverage')"
      >
        <AppInput
          v-model="draft.leverageText.value"
          inputmode="decimal"
          :highlighted="draft.prefilledFields.value.has('leverage')"
          :invalid="draft.fieldError('leverage') !== null"
          data-testid="trade-leverage"
        />
      </FormField>

      <FormField
        :label="t('contractTradeJournal.form.plannedStopLoss')"
        :hint="draft.preview.value.stopLossDistanceText
          ? t('contractTradeJournal.form.stopLossHint', { distance: localize(draft.preview.value.stopLossDistanceText), risk: draft.preview.value.plannedRiskText })
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
        :label="t('contractTradeJournal.form.plannedTakeProfit')"
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
        :label="t('contractTradeJournal.form.confidence')"
        grouped
        :error-message="fieldErrorText('confidence')"
      >
        <AppRating
          v-model="draft.confidence.value"
          :label="t('contractTradeJournal.form.confidence')"
          data-testid="trade-confidence"
        />
      </FormField>
    </div>

    <section class="contract-trade-form__section">
      <h3 class="contract-trade-form__heading">
        {{ t('contractTradeJournal.form.fillsHeading') }}
      </h3>
      <ContractTradeFillEditor
        :fills="draft.fills.value"
        :fees="draft.preview.value.fees"
        :fill-sizes="draft.preview.value.fillSizes"
        :quantity-label="draft.preview.value.quantityLabel"
        :prefilled-fields="draft.prefilledFields.value"
        :rejected-field="draft.rejectedField.value"
        :rejection-message="draft.rejectionMessage.value"
        @add="draft.addFill"
        @remove="draft.removeFill"
      />
      <p
        v-if="draft.preview.value.feeRateMissing"
        class="contract-trade-form__hint"
        data-testid="fee-rate-missing"
      >
        {{ t('contractTradeJournal.form.feeRateMissing') }}
        <NuxtLink to="/settings#settings-trade-journal">
          {{ t('contractTradeJournal.form.goToSettings') }}
        </NuxtLink>
      </p>
      <p
        class="contract-trade-form__preview"
        data-testid="draft-preview"
      >
        {{ t('contractTradeJournal.form.previewPosition') }} <span data-testid="preview-position">{{ draft.preview.value.positionText }}</span>{{ t('contractTradeJournal.form.previewAverage') }}
        <span data-testid="preview-average-entry">{{ draft.preview.value.averageEntryPriceText ?? '—' }}</span>
        <template v-if="draft.preview.value.entryNotionalText">
          {{ t('contractTradeJournal.form.previewNotional') }} <span data-testid="preview-entry-notional">{{ draft.preview.value.entryNotionalText }}</span>{{ t('contractTradeJournal.form.previewMargin') }}
          <span data-testid="preview-entry-margin">{{ draft.preview.value.entryMarginText }}</span>
        </template>
        <template v-if="draft.preview.value.entrySlippageText">
          {{ t('contractTradeJournal.common.separator') }}<span data-testid="preview-entry-slippage">{{ localize(draft.preview.value.entrySlippageText) }}</span>
        </template>
      </p>
    </section>

    <section
      v-if="!addingToExistingTrade"
      class="contract-trade-form__section"
    >
      <FormField
        :label="t('contractTradeJournal.form.linkedStrategy')"
        :hint="draft.prefilledFields.value.has('tradingStrategy') ? prefilledHint : t('contractTradeJournal.form.linkedStrategyHint')"
        :error-message="fieldErrorText('tradingStrategy')"
      >
        <AppSelect
          v-model="tradingStrategyValue"
          :highlighted="draft.prefilledFields.value.has('tradingStrategy')"
          data-testid="trade-trading-strategy"
        >
          <option value="">
            {{ t('contractTradeJournal.form.noLinkedStrategy') }}
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
      <FormField :label="t('contractTradeJournal.form.entryReason')">
        <AppTextarea
          v-model="draft.entryReason.value"
          data-testid="trade-entry-reason"
        />
      </FormField>
      <FormField
        :label="t('contractTradeJournal.form.setupTags')"
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
          :to="`/contract-trade-journal/${draft.conflictingTradeId.value ?? draft.recordedTradeId.value}`"
          data-testid="form-rejection-go"
        >
          {{ t('contractTradeJournal.form.goToTrade', { id: draft.conflictingTradeId.value ?? draft.recordedTradeId.value }) }}
          {{ draft.conflictingTradeId.value !== null ? t('contractTradeJournal.form.addToTrade') : '' }}
        </AppButton>
      </template>
    </AppAlert>

    <div class="contract-trade-form__actions">
      <AppButton
        type="submit"
        :disabled="draft.saving.value || draft.prefillLoading.value"
        data-testid="trade-save"
      >
        {{ draft.saving.value ? t('contractTradeJournal.form.saving') : (addingToExistingTrade ? t('contractTradeJournal.common.save') : t('contractTradeJournal.form.saveOpen')) }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.contract-trade-form {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__state,
  &__hint {
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
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
