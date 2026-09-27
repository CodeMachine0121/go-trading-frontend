<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTextarea from '~/components/atoms/AppTextarea.vue'
import FormField from '~/components/molecules/FormField.vue'
import ContractTradeFillEditor from '~/components/molecules/ContractTradeFillEditor.vue'
import ContractTradePrefillBanner from '~/components/molecules/ContractTradePrefillBanner.vue'
import TradeTagPicker from '~/components/molecules/TradeTagPicker.vue'
import { useContractTradeDraft } from '~/composables/use-contract-trade-draft'
import type { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import type { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'

const CONFIDENCE_LEVELS = [1, 2, 3, 4, 5] as const
const PREFILLED_HINT = '預填'

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

const confidenceValue = computed({
  get: () => draft.confidence.value === null ? '' : String(draft.confidence.value),
  set: (value: string) => {
    draft.confidence.value = value === '' ? null : Number(value)
  },
})
</script>

<template>
  <form
    class="contract-trade-form"
    data-testid="contract-trade-form"
    @submit.prevent="draft.save().then(saved => saved && emit('saved', saved))"
  >
    <ContractTradePrefillBanner
      v-if="draft.prefill.value || draft.prefillMessage.value"
      :prefill="draft.prefill.value"
      :message="draft.prefillMessage.value"
      :time-zone-identifier="timeZoneIdentifier"
    />

    <p
      v-if="draft.prefillLoading.value"
      class="contract-trade-form__state"
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
      class="contract-trade-form__grid"
    >
      <FormField
        label="合約標的"
        :hint="draft.prefilledFields.value.has('symbol') ? PREFILLED_HINT : undefined"
        :error-message="draft.fieldError('symbol')"
      >
        <AppInput
          v-model="draft.symbol.value"
          autocapitalize="characters"
          placeholder="BTCUSDT"
          :invalid="draft.fieldError('symbol') !== null"
          data-testid="trade-symbol"
        />
      </FormField>

      <FormField
        label="方向"
        :hint="draft.prefilledFields.value.has('direction') ? PREFILLED_HINT : undefined"
      >
        <AppSelect
          v-model="draft.direction.value"
          data-testid="trade-direction"
        >
          <option value="long">
            做多
          </option>
          <option value="short">
            做空
          </option>
        </AppSelect>
      </FormField>

      <FormField
        label="槓桿倍數"
        :hint="draft.prefilledFields.value.has('leverage') ? PREFILLED_HINT : '留白即一倍'"
        :error-message="draft.fieldError('leverage')"
      >
        <AppInput
          v-model="draft.leverageText.value"
          inputmode="decimal"
          :invalid="draft.fieldError('leverage') !== null"
          data-testid="trade-leverage"
        />
      </FormField>

      <FormField
        label="關聯交易策略"
        :hint="draft.prefilledFields.value.has('tradingStrategy') ? PREFILLED_HINT : undefined"
        :error-message="draft.fieldError('tradingStrategy')"
      >
        <AppSelect
          v-model="tradingStrategyValue"
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
    </div>

    <section class="contract-trade-form__section">
      <h3 class="contract-trade-form__heading">
        成交
      </h3>
      <ContractTradeFillEditor
        :fills="draft.fills.value"
        :fees="draft.preview.value.fees"
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
        尚未設定手續費率，手續費先記為 0。
        <NuxtLink to="/settings#settings-trade-journal">
          前往設定
        </NuxtLink>
      </p>
      <dl
        class="contract-trade-form__preview"
        data-testid="draft-preview"
      >
        <div>
          <dt>持倉</dt>
          <dd data-testid="preview-position">
            {{ draft.preview.value.positionText }}
          </dd>
        </div>
        <div>
          <dt>進場均價</dt>
          <dd data-testid="preview-average-entry">
            {{ draft.preview.value.averageEntryPriceText ?? '—' }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      v-if="!addingToExistingTrade"
      class="contract-trade-form__section"
    >
      <h3 class="contract-trade-form__heading">
        進場計畫
      </h3>
      <div class="contract-trade-form__grid">
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
            :invalid="draft.fieldError('plannedStopLossPrice') !== null"
            data-testid="trade-planned-stop-loss"
          />
        </FormField>
        <FormField
          label="計畫止盈"
          :hint="draft.prefilledFields.value.has('plannedTakeProfitPrice') ? PREFILLED_HINT : undefined"
          :error-message="draft.fieldError('plannedTakeProfitPrice')"
        >
          <AppInput
            v-model="draft.plannedTakeProfitText.value"
            inputmode="decimal"
            :invalid="draft.fieldError('plannedTakeProfitPrice') !== null"
            data-testid="trade-planned-take-profit"
          />
        </FormField>
        <FormField
          label="信心"
          :error-message="draft.fieldError('confidence')"
        >
          <AppSelect
            v-model="confidenceValue"
            data-testid="trade-confidence"
          >
            <option value="">
              不填
            </option>
            <option
              v-for="level in CONFIDENCE_LEVELS"
              :key="level"
              :value="String(level)"
            >
              {{ level }} / 5
            </option>
          </AppSelect>
        </FormField>
      </div>
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
          :to="`/contract-trade-journal/${draft.conflictingTradeId.value ?? draft.recordedTradeId.value}`"
          data-testid="form-rejection-go"
        >
          前往 #{{ draft.conflictingTradeId.value ?? draft.recordedTradeId.value }}
          {{ draft.conflictingTradeId.value !== null ? '加成交' : '' }}
        </AppButton>
      </template>
    </AppAlert>

    <div class="contract-trade-form__actions">
      <AppButton
        type="submit"
        :disabled="draft.saving.value || draft.prefillLoading.value"
        data-testid="trade-save"
      >
        {{ draft.saving.value ? '儲存中…' : '儲存' }}
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
    display: flex;
    flex-wrap: wrap;
    gap: spacing('lg');
    margin: 0;

    dt {
      color: color('text-faint');
      font-size: font-size('2xs');
    }

    dd {
      margin: 0;
      color: color('text-strong');
      font-size: font-size('md');

      @include numeric;
    }
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
  }
}
</style>
