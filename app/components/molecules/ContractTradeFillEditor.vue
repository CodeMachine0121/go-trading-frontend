<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ContractTradeDraftFillInputDto } from '~/domain/models/dto/contract-trade-draft-fill-input-dto'
import type { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import type { ContractTradeDraftFillSizePreviewDto } from '~/domain/models/dto/contract-trade-draft-fill-size-preview-dto'
import type { ContractTradeSizeMode } from '~/domain/models/vo/contract-trade-size-mode-vo'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'

const CONFIRM_ACTUAL_FILL_HINT = '請改成實際開倉的價格與數量'

const {
  fees,
  fillSizes = [],
  quantityLabel = '數量',
  prefilledFields = new Set<TradeFormField>(),
  rejectedField = null,
  rejectionMessage = null,
  kinds = ['entry', 'exit'],
} = defineProps<{
  fees: readonly ContractTradeDraftFeePreviewDto[]
  fillSizes?: readonly ContractTradeDraftFillSizePreviewDto[]
  quantityLabel?: string
  prefilledFields?: ReadonlySet<TradeFormField>
  rejectedField?: TradeFormField | null
  rejectionMessage?: string | null
  kinds?: readonly ContractTradeFillKind[]
}>()

const fills = defineModel<ContractTradeDraftFillInputDto[]>('fills', { required: true })

const emit = defineEmits<{
  add: [kind: ContractTradeFillKind]
  remove: [key: number]
}>()

const SIZE_MODE_LABELS: Readonly<Record<ContractTradeSizeMode, string>> = {
  quantity: '數量',
  notional: '名目 USDT',
  margin: '保證金 USDT',
}

const FIELD_OF_COLUMN: Readonly<Record<'price' | 'quantity' | 'time' | 'fee', readonly TradeFormField[]>> = {
  price: ['fillPrice'],
  quantity: ['fillQuantity', 'exitQuantity'],
  time: ['fillTime'],
  fee: ['fillFee'],
}
</script>

<template>
  <div class="contract-trade-fill-editor">
    <div
      v-for="(fill, index) in fills"
      :key="fill.key"
      class="contract-trade-fill-editor__card"
      :data-testid="`fill-${index}`"
    >
      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">動作</span>
        <AppSelect
          v-model="fill.kind"
          data-testid="fill-kind"
        >
          <option
            v-for="kind in kinds"
            :key="kind"
            :value="kind"
          >
            {{ kind === 'entry' ? '開倉／加倉' : '減倉／平倉' }}
          </option>
        </AppSelect>
      </label>

      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">時間</span>
        <AppInput
          v-model="fill.filledAtText"
          type="datetime-local"
          :invalid="FIELD_OF_COLUMN.time.includes(rejectedField ?? 'symbol')"
          data-testid="fill-time"
        />
      </label>

      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">{{ fill.kind === 'entry' ? '開倉價' : '平倉價' }}</span>
        <AppInput
          v-model="fill.priceText"
          inputmode="decimal"
          :highlighted="index === 0 && prefilledFields.has('fillPrice')"
          :invalid="FIELD_OF_COLUMN.price.includes(rejectedField ?? 'symbol')"
          data-testid="fill-price"
        />
        <span
          v-if="index === 0 && prefilledFields.has('fillPrice')"
          class="contract-trade-fill-editor__confirm"
          data-testid="fill-price-confirm"
        >{{ CONFIRM_ACTUAL_FILL_HINT }}</span>
      </label>

      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">{{ fill.sizeMode === 'quantity' ? quantityLabel : SIZE_MODE_LABELS[fill.sizeMode] }}</span>
        <span class="contract-trade-fill-editor__size">
          <AppSelect
            v-model="fill.sizeMode"
            aria-label="輸入方式"
            data-testid="fill-size-mode"
          >
            <option
              v-for="(label, sizeMode) in SIZE_MODE_LABELS"
              :key="sizeMode"
              :value="sizeMode"
            >
              {{ label }}
            </option>
          </AppSelect>
          <AppInput
            v-model="fill.quantityText"
            inputmode="decimal"
            :highlighted="index === 0 && prefilledFields.has('fillQuantity')"
            :invalid="FIELD_OF_COLUMN.quantity.includes(rejectedField ?? 'symbol')"
            data-testid="fill-quantity"
          />
        </span>
        <span
          v-if="index === 0 && prefilledFields.has('fillQuantity')"
          class="contract-trade-fill-editor__confirm"
          data-testid="fill-quantity-confirm"
        >{{ CONFIRM_ACTUAL_FILL_HINT }}</span>
      </label>

      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">掛單／吃單</span>
        <AppSelect
          v-model="fill.liquidity"
          data-testid="fill-liquidity"
        >
          <option value="taker">吃單</option>
          <option value="maker">掛單</option>
        </AppSelect>
      </label>

      <label class="contract-trade-fill-editor__field">
        <span class="contract-trade-fill-editor__label">手續費</span>
        <AppInput
          v-model="fill.feeText"
          inputmode="decimal"
          :placeholder="fees[index]?.automaticFeeText ?? ''"
          :invalid="FIELD_OF_COLUMN.fee.includes(rejectedField ?? 'symbol')"
          data-testid="fill-fee"
        />
        <span
          v-if="fees[index]?.note"
          class="contract-trade-fill-editor__note"
          data-testid="fill-fee-note"
        >{{ fees[index]?.note }}</span>
      </label>

      <p
        v-if="fillSizes[index]?.sizeText"
        class="contract-trade-fill-editor__size-preview"
        data-testid="fill-size-preview"
      >
        {{ fillSizes[index]?.sizeText }}
        <template v-if="fillSizes[index]?.feeShareText">
          ・<span data-testid="fill-fee-share">{{ fillSizes[index]?.feeShareText }}</span>
        </template>
      </p>

      <AppButton
        variant="danger-ghost"
        size="small"
        class="contract-trade-fill-editor__remove"
        :disabled="fills.length === 1"
        data-testid="fill-remove"
        @click="emit('remove', fill.key)"
      >
        移除
      </AppButton>
    </div>

    <p
      v-if="rejectedField !== null && Object.values(FIELD_OF_COLUMN).flat().includes(rejectedField)"
      class="contract-trade-fill-editor__error"
      data-testid="fill-error"
    >
      {{ rejectionMessage }}
    </p>

    <div class="contract-trade-fill-editor__actions">
      <AppButton
        v-for="kind in kinds"
        :key="kind"
        variant="secondary"
        size="small"
        :data-testid="`fill-add-${kind}`"
        @click="emit('add', kind)"
      >
        ＋ {{ kind === 'entry' ? '加倉' : '減倉' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contract-trade-fill-editor {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__card {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface-raised');
    padding: spacing('sm');

    @include respond-to('lg') {
      grid-template-columns: 6rem minmax(0, 11rem) repeat(2, minmax(0, 1fr)) 6rem minmax(0, 1fr) auto;
      align-items: end;
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__label {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__card + &__card &__label {
    @include respond-to('lg') {
      @include visually-hidden;
    }
  }

  &__size {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
    gap: spacing('3xs');
  }

  &__size-preview {
    grid-column: 1 / -1;
    order: 1;
    margin: 0;
    color: color('text-muted');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__confirm {
    color: color('primary');
    font-size: font-size('2xs');
  }

  &__note {
    color: color('warning');
    font-size: font-size('2xs');
  }

  &__remove {
    align-self: end;
  }

  &__error {
    margin: 0;
    color: color('danger');
    font-size: font-size('xs');
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
  }
}
</style>
