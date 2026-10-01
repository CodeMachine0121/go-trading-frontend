<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { ContractTradeRecordDto } from '~/domain/models/dto/contract-trade-record-dto'
import type { ContractTradeFillDto } from '~/domain/models/dto/contract-trade-fill-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { record, busy = false, timeZoneIdentifier } = defineProps<{
  record: ContractTradeRecordDto
  busy?: boolean
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{
  amendFill: [fill: ContractTradeFillDto, priceText: string, quantityText: string, feeText: string]
  removeFill: [fillId: number]
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const editingFillId = ref<number | null>(null)
const fillPriceText = ref('')
const fillQuantityText = ref('')
const fillFeeText = ref('')

watch(() => JSON.stringify(record.fills.map(fill => [fill.id, fill.kind, fill.filledAt, fill.priceText, fill.quantityText, fill.liquidity, fill.fee.toString()])), () => {
  editingFillId.value = null
})
</script>

<template>
  <AppPanel :title="t('contractTradeJournal.fillLedger.title')">
    <ul class="contract-trade-fill-ledger-panel__fills">
      <li
        v-for="fill in record.fills"
        :key="fill.id"
        class="contract-trade-fill-ledger-panel__fill"
        :data-testid="`detail-fill-${fill.id}`"
      >
        <template v-if="editingFillId === fill.id">
          <AppInput
            v-model="fillPriceText"
            inputmode="decimal"
            data-testid="detail-fill-price"
          />
          <AppInput
            v-model="fillQuantityText"
            inputmode="decimal"
            data-testid="detail-fill-quantity"
          />
          <AppInput
            v-model="fillFeeText"
            inputmode="decimal"
            data-testid="detail-fill-fee"
          />
          <AppButton
            size="small"
            :disabled="busy"
            data-testid="detail-fill-save"
            @click="emit('amendFill', fill, fillPriceText, fillQuantityText, fillFeeText)"
          >
            {{ t('contractTradeJournal.common.save') }}
          </AppButton>
          <AppButton
            size="small"
            variant="ghost"
            data-testid="detail-fill-cancel"
            @click="editingFillId = null"
          >
            {{ t('contractTradeJournal.common.cancel') }}
          </AppButton>
        </template>
        <template v-else>
          <span
            class="contract-trade-fill-ledger-panel__kind"
            :class="`contract-trade-fill-ledger-panel__kind--${fill.kind}`"
          >{{ localize(fill.kindLabel) }}</span>
          <span>{{ formatDateTimeInTimeZone(fill.filledAt, timeZoneIdentifier) }}</span>
          <span class="contract-trade-fill-ledger-panel__number">{{ fill.priceText }} × {{ fill.quantityText }} {{ record.quantityUnit }}</span>
          <span class="contract-trade-fill-ledger-panel__number">{{ t('contractTradeJournal.fillLedger.fee', { liquidity: localize(fill.liquidityLabel), fee: fill.feeText }) }}</span>
          <small
            v-if="fill.feeNote"
            class="contract-trade-fill-ledger-panel__note"
          >{{ localize(fill.feeNote) }}</small>
          <template v-if="record.canEditFills">
            <AppButton
              size="small"
              variant="ghost"
              :disabled="busy"
              data-testid="detail-fill-edit"
              @click="editingFillId = fill.id; fillPriceText = fill.price.toString(); fillQuantityText = fill.quantity.toString(); fillFeeText = fill.fee.toString()"
            >
              {{ t('contractTradeJournal.fillLedger.edit') }}
            </AppButton>
            <AppButton
              size="small"
              variant="danger-ghost"
              :disabled="busy"
              data-testid="detail-fill-remove"
              @click="emit('removeFill', fill.id)"
            >
              {{ t('contractTradeJournal.common.delete') }}
            </AppButton>
          </template>
        </template>
      </li>
    </ul>
  </AppPanel>
</template>

<style scoped lang="scss">
.contract-trade-fill-ledger-panel {
  &__fills {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__fill {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding-bottom: spacing('xs');
    color: color('text');
    font-size: font-size('xs');

    &:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
  }

  &__kind {
    font-weight: font-weight('medium');

    &--entry {
      color: color('success');
    }

    &--exit {
      color: color('primary');
    }
  }

  &__number {
    @include numeric;
  }

  &__note {
    color: color('text-faint');
    font-size: font-size('2xs');
  }
}
</style>
