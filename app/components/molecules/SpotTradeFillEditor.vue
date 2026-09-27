<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import type { SpotTradeDraftFillInputDto } from '~/domain/models/dto/spot-trade-draft-fill-input-dto'
import type { SpotTradeFillKind } from '~/domain/models/vo/spot-trade-fill-kind-vo'
import type { TradeFormField } from '~/domain/models/vo/trade-form-field-vo'

const CONFIRM_ACTUAL_FILL_HINT = '請改成實際成交'

const {
  prefilledFields = new Set<TradeFormField>(),
  rejectedField = null,
  rejectionMessage = null,
  wholeSharesMessage = null,
  kinds = ['buy', 'sell'],
} = defineProps<{
  prefilledFields?: ReadonlySet<TradeFormField>
  rejectedField?: TradeFormField | null
  rejectionMessage?: string | null
  wholeSharesMessage?: string | null
  kinds?: readonly SpotTradeFillKind[]
}>()

const fills = defineModel<SpotTradeDraftFillInputDto[]>('fills', { required: true })

const emit = defineEmits<{
  add: [kind: SpotTradeFillKind]
  remove: [key: number]
}>()

const FIELD_OF_COLUMN: Readonly<Record<'price' | 'quantity' | 'time' | 'fee', readonly TradeFormField[]>> = {
  price: ['fillPrice'],
  quantity: ['fillQuantity', 'exitQuantity'],
  time: ['fillTime'],
  fee: ['fillFee'],
}
</script>

<template>
  <div class="spot-trade-fill-editor">
    <div
      v-for="(fill, index) in fills"
      :key="fill.key"
      class="spot-trade-fill-editor__card"
      :data-testid="`fill-${index}`"
    >
      <label class="spot-trade-fill-editor__field">
        <span class="spot-trade-fill-editor__label">動作</span>
        <AppSelect
          v-model="fill.kind"
          data-testid="fill-kind"
        >
          <option
            v-for="kind in kinds"
            :key="kind"
            :value="kind"
          >
            {{ kind === 'buy' ? '買進' : '賣出' }}
          </option>
        </AppSelect>
      </label>

      <label class="spot-trade-fill-editor__field">
        <span class="spot-trade-fill-editor__label">時間</span>
        <AppInput
          v-model="fill.filledAtText"
          type="datetime-local"
          :invalid="FIELD_OF_COLUMN.time.includes(rejectedField ?? 'symbol')"
          data-testid="fill-time"
        />
      </label>

      <label class="spot-trade-fill-editor__field">
        <span class="spot-trade-fill-editor__label">{{ fill.kind === 'buy' ? '買進價' : '賣出價' }}</span>
        <AppInput
          v-model="fill.priceText"
          inputmode="decimal"
          :highlighted="index === 0 && prefilledFields.has('fillPrice')"
          :invalid="FIELD_OF_COLUMN.price.includes(rejectedField ?? 'symbol')"
          data-testid="fill-price"
        />
        <span
          v-if="index === 0 && prefilledFields.has('fillPrice')"
          class="spot-trade-fill-editor__confirm"
          data-testid="fill-price-confirm"
        >{{ CONFIRM_ACTUAL_FILL_HINT }}</span>
      </label>

      <label class="spot-trade-fill-editor__field">
        <span class="spot-trade-fill-editor__label">數量</span>
        <AppInput
          v-model="fill.quantityText"
          inputmode="decimal"
          :highlighted="index === 0 && prefilledFields.has('fillQuantity')"
          :invalid="FIELD_OF_COLUMN.quantity.includes(rejectedField ?? 'symbol')"
          data-testid="fill-quantity"
        />
        <span
          v-if="index === 0 && prefilledFields.has('fillQuantity')"
          class="spot-trade-fill-editor__confirm"
          data-testid="fill-quantity-confirm"
        >{{ CONFIRM_ACTUAL_FILL_HINT }}</span>
      </label>

      <label class="spot-trade-fill-editor__field">
        <span class="spot-trade-fill-editor__label">手續費</span>
        <AppInput
          v-model="fill.feeText"
          inputmode="decimal"
          placeholder="0"
          :invalid="FIELD_OF_COLUMN.fee.includes(rejectedField ?? 'symbol')"
          data-testid="fill-fee"
        />
      </label>

      <AppButton
        variant="danger-ghost"
        size="small"
        class="spot-trade-fill-editor__remove"
        :disabled="fills.length === 1"
        data-testid="fill-remove"
        @click="emit('remove', fill.key)"
      >
        移除
      </AppButton>
    </div>

    <p
      v-if="wholeSharesMessage"
      class="spot-trade-fill-editor__error"
      data-testid="fill-whole-shares"
    >
      {{ wholeSharesMessage }}
    </p>
    <p
      v-else-if="rejectedField !== null && Object.values(FIELD_OF_COLUMN).flat().includes(rejectedField)"
      class="spot-trade-fill-editor__error"
      data-testid="fill-error"
    >
      {{ rejectionMessage }}
    </p>

    <p class="spot-trade-fill-editor__hint">
      手續費每筆自己填，留白即 0；台股賣出的證交稅請併入手續費。
    </p>

    <div class="spot-trade-fill-editor__actions">
      <AppButton
        v-for="kind in kinds"
        :key="kind"
        variant="secondary"
        size="small"
        :data-testid="`fill-add-${kind}`"
        @click="emit('add', kind)"
      >
        ＋ 加一筆{{ kind === 'buy' ? '買進' : '賣出' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.spot-trade-fill-editor {
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
      grid-template-columns: 6rem minmax(0, 11rem) repeat(2, minmax(0, 1fr)) minmax(0, 1fr) auto;
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

  &__confirm {
    color: color('primary');
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

  &__hint {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
  }
}
</style>
