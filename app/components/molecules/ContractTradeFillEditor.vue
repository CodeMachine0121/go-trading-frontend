<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { ContractTradeDraftFillInputDto } from '~/domain/models/dto/contract-trade-draft-fill-input-dto'
import type { ContractTradeDraftFeePreviewDto } from '~/domain/models/dto/contract-trade-draft-fee-preview-dto'
import type { ContractTradeFillKind } from '~/domain/models/vo/contract-trade-fill-kind-vo'
import type { ContractTradeFormField } from '~/domain/models/vo/contract-trade-form-field-vo'

const CONFIRM_ACTUAL_FILL_HINT = '請改成實際成交'

const {
  fees,
  prefilledFields = new Set<ContractTradeFormField>(),
  rejectedField = null,
  rejectionMessage = null,
  kinds = ['entry', 'exit'],
} = defineProps<{
  fees: readonly ContractTradeDraftFeePreviewDto[]
  prefilledFields?: ReadonlySet<ContractTradeFormField>
  rejectedField?: ContractTradeFormField | null
  rejectionMessage?: string | null
  kinds?: readonly ContractTradeFillKind[]
}>()

const fills = defineModel<ContractTradeDraftFillInputDto[]>('fills', { required: true })

const emit = defineEmits<{
  add: [kind: ContractTradeFillKind]
  remove: [key: number]
}>()

const FIELD_OF_COLUMN: Readonly<Record<'price' | 'quantity' | 'time' | 'fee', readonly ContractTradeFormField[]>> = {
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
            {{ kind === 'entry' ? '進場' : '出場' }}
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
        <span class="contract-trade-fill-editor__label">成交價</span>
        <AppInput
          v-model="fill.priceText"
          inputmode="decimal"
          :class="{ 'contract-trade-fill-editor__prefilled': index === 0 && prefilledFields.has('fillPrice') }"
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
        <span class="contract-trade-fill-editor__label">數量</span>
        <AppInput
          v-model="fill.quantityText"
          inputmode="decimal"
          :class="{ 'contract-trade-fill-editor__prefilled': index === 0 && prefilledFields.has('fillQuantity') }"
          :invalid="FIELD_OF_COLUMN.quantity.includes(rejectedField ?? 'symbol')"
          data-testid="fill-quantity"
        />
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
        ＋ 加一筆{{ kind === 'entry' ? '進場' : '出場' }}
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

  &__prefilled {
    border-color: color('primary');
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
