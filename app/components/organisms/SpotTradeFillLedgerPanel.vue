<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import type { SpotTradeFillDto } from '~/domain/models/dto/spot-trade-fill-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { fills, canEditFills, busy = false, timeZoneIdentifier } = defineProps<{
  fills: readonly SpotTradeFillDto[]
  canEditFills: boolean
  busy?: boolean
  timeZoneIdentifier: string
}>()

const emit = defineEmits<{
  amendFill: [fill: SpotTradeFillDto, priceText: string, quantityText: string, feeText: string]
  removeFill: [fillId: number]
}>()

const editingFillId = ref<number | null>(null)
const fillPriceText = ref('')
const fillQuantityText = ref('')
const fillFeeText = ref('')

watch(() => fills, () => {
  editingFillId.value = null
})
</script>

<template>
  <AppPanel title="買進與賣出紀錄">
    <ul class="spot-trade-fill-ledger-panel__fills">
      <li
        v-for="fill in fills"
        :key="fill.id"
        class="spot-trade-fill-ledger-panel__fill"
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
            儲存
          </AppButton>
          <AppButton
            size="small"
            variant="ghost"
            data-testid="detail-fill-cancel"
            @click="editingFillId = null"
          >
            取消
          </AppButton>
        </template>
        <template v-else>
          <span
            class="spot-trade-fill-ledger-panel__kind"
            :class="`spot-trade-fill-ledger-panel__kind--${fill.kind}`"
          >{{ fill.kindLabel }}</span>
          <span>{{ formatDateTimeInTimeZone(fill.filledAt, timeZoneIdentifier) }}</span>
          <span class="spot-trade-fill-ledger-panel__number">{{ fill.priceText }} × {{ fill.quantityText }}</span>
          <span class="spot-trade-fill-ledger-panel__number">手續費 {{ fill.feeText }}</span>
          <template v-if="canEditFills">
            <AppButton
              size="small"
              variant="ghost"
              :disabled="busy"
              data-testid="detail-fill-edit"
              @click="editingFillId = fill.id; fillPriceText = fill.price.toString(); fillQuantityText = fill.quantity.toString(); fillFeeText = fill.fee.toString()"
            >
              修改
            </AppButton>
            <AppButton
              size="small"
              variant="danger-ghost"
              :disabled="busy"
              data-testid="detail-fill-remove"
              @click="emit('removeFill', fill.id)"
            >
              刪除
            </AppButton>
          </template>
        </template>
      </li>
    </ul>
  </AppPanel>
</template>

<style scoped lang="scss">
.spot-trade-fill-ledger-panel {
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

    &--buy {
      color: color('success');
    }

    &--sell {
      color: color('primary');
    }
  }

  &__number {
    @include numeric;
  }
}
</style>
