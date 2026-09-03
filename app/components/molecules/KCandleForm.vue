<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：一根 K 線的輸入表單。
// 欄位合不合法是業務規則，這裡只負責把外部傳進來的錯誤標在對應欄位旁。
const { timeZone, identityReadonly = false, submitting = false, fieldError = null } = defineProps<{
  /** 起始時間要用哪一個時區填與呈現。 */
  timeZone: TimeZoneDto
  /** 修改既有的 K 線時，交易標的與起始時間不得更換。 */
  identityReadonly?: boolean
  submitting?: boolean
  fieldError?: { field: KCandleWriteField, message: string } | null
  submitLabel: string
}>()

const emit = defineEmits<{ submit: [], cancel: [] }>()

const symbol = defineModel<string>('symbol', { required: true })
const openTime = defineModel<string>('openTime', { required: true })
const open = defineModel<string>('open', { required: true })
const high = defineModel<string>('high', { required: true })
const low = defineModel<string>('low', { required: true })
const close = defineModel<string>('close', { required: true })
const volume = defineModel<string>('volume', { required: true })
const quoteVolume = defineModel<string>('quoteVolume', { required: true })
const takerBuyBaseVolume = defineModel<string>('takerBuyBaseVolume', { required: true })
const takerBuyQuoteVolume = defineModel<string>('takerBuyQuoteVolume', { required: true })

/** 八個價量欄位長得一模一樣，逐欄複製一份 template 只會讓加欄位變成八處修改。 */
const FIGURE_FIELDS: { field: KCandleWriteField, label: string, model: Ref<string> }[] = [
  { field: 'open', label: '開盤價', model: open },
  { field: 'high', label: '最高價', model: high },
  { field: 'low', label: '最低價', model: low },
  { field: 'close', label: '收盤價', model: close },
  { field: 'volume', label: '成交量', model: volume },
  { field: 'quoteVolume', label: '成交額', model: quoteVolume },
  { field: 'takerBuyBaseVolume', label: '主動買入量', model: takerBuyBaseVolume },
  { field: 'takerBuyQuoteVolume', label: '主動買入額', model: takerBuyQuoteVolume },
]

function messageFor(field: KCandleWriteField): string | null {
  return fieldError?.field === field ? fieldError.message : null
}
</script>

<template>
  <form
    class="k-candle-form"
    @submit.prevent="emit('submit')"
  >
    <p
      v-if="!identityReadonly"
      class="k-candle-form__notice"
      data-testid="overwrite-notice"
    >
      相同的交易標的與起始時間會覆蓋既有的那一根 K 線，不會多出第二根。
    </p>

    <div class="k-candle-form__grid">
      <FormField
        label="交易標的"
        :hint="identityReadonly ? '修改時不得更換' : '例如 BTCUSDT'"
        :error-message="messageFor('symbol')"
      >
        <AppInput
          v-model="symbol"
          type="text"
          :disabled="identityReadonly"
          :invalid="Boolean(messageFor('symbol'))"
          data-testid="form-symbol"
        />
      </FormField>

      <FormField
        label="起始時間"
        :hint="identityReadonly ? '修改時不得更換' : `${timeZone.label}，須落在五分鐘刻度`"
        :error-message="messageFor('openTime')"
      >
        <AppInput
          v-model="openTime"
          type="datetime-local"
          :disabled="identityReadonly"
          :invalid="Boolean(messageFor('openTime'))"
          data-testid="form-open-time"
        />
      </FormField>

      <FormField
        v-for="figureField in FIGURE_FIELDS"
        :key="figureField.field"
        :label="figureField.label"
        :error-message="messageFor(figureField.field)"
      >
        <AppInput
          v-model="figureField.model.value"
          type="text"
          inputmode="decimal"
          :invalid="Boolean(messageFor(figureField.field))"
          :data-testid="`form-${figureField.field}`"
        />
      </FormField>
    </div>

    <div class="k-candle-form__actions">
      <AppButton
        type="submit"
        :disabled="submitting"
        data-testid="form-submit"
      >
        {{ submitting ? '處理中…' : submitLabel }}
      </AppButton>
      <AppButton
        type="button"
        variant="ghost"
        :disabled="submitting"
        data-testid="form-cancel"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <slot name="extra-actions" />
    </div>
  </form>
</template>

<style scoped lang="scss">
.k-candle-form {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notice {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  // 十個欄位攤成一片密集的格子。窄螢幕兩欄、寬螢幕五欄，
  // 於是「身分（標的、時間）」剛好一列、「價量」剛好兩列，讀起來是三組而不是十個。
  &__grid {
    display: grid;
    gap: spacing('xs') spacing('sm');
    grid-template-columns: repeat(2, minmax(0, 1fr));

    @include respond-to('md') {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    @include respond-to('xl') {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }
}
</style>
