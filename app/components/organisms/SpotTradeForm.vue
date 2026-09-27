<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppRating from '~/components/atoms/AppRating.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import SpotTradeFillEditor from '~/components/molecules/SpotTradeFillEditor.vue'
import SpotTradePrefillBanner from '~/components/molecules/SpotTradePrefillBanner.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import { useSpotTradeDraft } from '~/composables/use-spot-trade-draft'
import type { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { SpotTradeRecordDto } from '~/domain/models/dto/spot-trade-record-dto'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'

const PREFILLED_HINT = '預填'

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
    <SpotTradePrefillBanner
      v-if="draft.prefill.value || draft.prefillMessage.value"
      :prefill="draft.prefill.value"
      :message="draft.prefillMessage.value"
      :show-journal-link="draft.prefillNotFound.value"
      :time-zone-identifier="timeZoneIdentifier"
    />

    <p
      v-if="draft.prefillLoading.value"
      class="spot-trade-form__state"
      data-testid="prefill-loading"
    >
      讀取這一輪的建議…
    </p>

    <AppAlert
      v-if="draft.referenceFailureMessage.value"
      tone="warning"
      data-testid="reference-failure"
    >
      {{ draft.referenceFailureMessage.value }}
    </AppAlert>

    <div
      v-if="!addingToExistingTrade"
      class="spot-trade-form__grid"
    >
      <FormField
        label="標的"
        :hint="draft.prefilledFields.value.has('symbol') ? PREFILLED_HINT : '台股填代號（如 2330），加密貨幣填交易對（如 BTCUSDT）'"
        :error-message="draft.fieldError('symbol')"
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
        label="計畫止損"
        :hint="draft.preview.value.stopLossDistanceText
          ? `${draft.preview.value.stopLossDistanceText}・計畫風險 ${draft.preview.value.plannedRiskText}`
          : undefined"
        :error-message="draft.fieldError('plannedStopLossPrice')"
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
        label="計畫止盈"
        :hint="draft.preview.value.takeProfitDistanceText ?? undefined"
        :error-message="draft.fieldError('plannedTakeProfitPrice')"
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
        label="信心"
        grouped
        :error-message="draft.fieldError('confidence')"
      >
        <AppRating
          v-model="draft.confidence.value"
          label="信心"
          data-testid="trade-confidence"
        />
      </FormField>
    </div>

    <section class="spot-trade-form__section">
      <h3 class="spot-trade-form__heading">
        買進與賣出
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
        持有 <span data-testid="preview-holding">{{ draft.preview.value.holdingText }}</span>・買進均價
        <span data-testid="preview-average-buy">{{ draft.preview.value.averageBuyPriceText ?? '—' }}</span>
        <template v-if="draft.preview.value.entrySlippageText">
          ・<span data-testid="preview-entry-slippage">{{ draft.preview.value.entrySlippageText }}</span>
        </template>
      </p>
    </section>

    <section
      v-if="!addingToExistingTrade"
      class="spot-trade-form__section"
    >
      <FormField
        label="關聯交易策略"
        :hint="draft.prefilledFields.value.has('tradingStrategy') ? PREFILLED_HINT : '只列出現貨（K 線）交易策略；不關聯即自行判斷'"
        :error-message="draft.fieldError('tradingStrategy')"
      >
        <AppSelect
          v-model="tradingStrategyValue"
          :highlighted="draft.prefilledFields.value.has('tradingStrategy')"
          data-testid="trade-trading-strategy"
        >
          <option value="">
            不關聯（自行判斷）
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
      <FormField label="進場理由（平倉後鎖定）">
        <AppTextarea
          v-model="draft.entryReason.value"
          data-testid="trade-entry-reason"
        />
      </FormField>
      <FormField
        label="型態標籤"
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
      {{ draft.rejectionMessage.value }}
      <template
        v-if="draft.conflictingTradeId.value !== null || draft.recordedTradeId.value !== null"
        #action
      >
        <AppButton
          variant="ghost"
          :to="`/spot-trade-journal/${draft.conflictingTradeId.value ?? draft.recordedTradeId.value}${draft.conflictingTradeId.value !== null ? '?addFill=buy' : ''}`"
          data-testid="form-rejection-go"
        >
          前往 #{{ draft.conflictingTradeId.value ?? draft.recordedTradeId.value }}
          {{ draft.conflictingTradeId.value !== null ? '加一筆買進' : '' }}
        </AppButton>
      </template>
    </AppAlert>

    <div class="spot-trade-form__actions">
      <AppButton
        type="submit"
        :disabled="draft.saving.value || draft.prefillLoading.value"
        data-testid="trade-save"
      >
        {{ draft.saving.value ? '儲存中…' : (addingToExistingTrade ? '儲存' : '儲存（持有中）') }}
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
