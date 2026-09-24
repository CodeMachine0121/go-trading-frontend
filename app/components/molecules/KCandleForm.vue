<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：一根 K 線的輸入表單。
// 欄位合不合法是業務規則，這裡只負責把外部傳進來的錯誤標在對應欄位旁。
const {
  timeZone, identityReadonly = false, submitting = false, fieldError = null, savable = true,
} = defineProps<{
  /** 起始時間要用哪一個時區填與呈現。 */
  timeZone: TimeZoneDto
  /** 修改既有的 K 線時，交易標的與起始時間不得更換。 */
  identityReadonly?: boolean
  submitting?: boolean
  fieldError?: { field: KCandleWriteField, message: string } | null
  /** 這份內容此刻存不存得進去。存不進去時儲存鍵是灰的——是哪一條規則由使用端判斷。 */
  savable?: boolean
  submitLabel: string
}>()

/** `touch`：使用者親手改了某一格。使用端據此決定那一格的訊息該不該說出來。 */
const emit = defineEmits<{ submit: [], cancel: [], touch: [KCandleWriteField] }>()

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

/**
 * 不是每個市場都報這三項。留白就是「這個市場沒有這一項」，存進去仍然是沒有。
 * 說出來是必要的：欄位空著而不解釋，看的人只會以為自己漏填了。
 */
const OPTIONAL_FIGURE_HINT = '這個市場不報就留白'

/**
 * 身分唯讀時的說明。兩格一起說一次，而不是各自掛一句「不得更換」——
 * 看的人要知道的不只是改不動，還有真的要改的話該怎麼做。
 */
const IDENTITY_READONLY_HINT = '交易標的與起始時間是這根 K 線的身分，不能改；要改請刪掉重建。'

/**
 * 八個價量欄位長得一模一樣，逐欄複製一份 template 只會讓加欄位變成八處修改。
 * 它們分成兩組：開高低收是讀一根 K 線時第一眼要看、也最常要改的；成交量那一組次之。
 */
const FIGURE_FIELDS: {
  field: KCandleWriteField
  label: string
  model: Ref<string>
  group: 'price' | 'volume'
  hint?: string
}[] = [
  { field: 'open', label: '開盤價', model: open, group: 'price' },
  { field: 'high', label: '最高價', model: high, group: 'price' },
  { field: 'low', label: '最低價', model: low, group: 'price' },
  { field: 'close', label: '收盤價', model: close, group: 'price' },
  { field: 'volume', label: '成交量', model: volume, group: 'volume' },
  {
    field: 'quoteVolume',
    label: '成交額',
    model: quoteVolume,
    group: 'volume',
    hint: OPTIONAL_FIGURE_HINT,
  },
  {
    field: 'takerBuyBaseVolume',
    label: '主動買入量',
    model: takerBuyBaseVolume,
    group: 'volume',
    hint: OPTIONAL_FIGURE_HINT,
  },
  {
    field: 'takerBuyQuoteVolume',
    label: '主動買入額',
    model: takerBuyQuoteVolume,
    group: 'volume',
    hint: OPTIONAL_FIGURE_HINT,
  },
]

const FIGURE_GROUPS = [
  { title: '價格', fields: FIGURE_FIELDS.filter(figureField => figureField.group === 'price') },
  {
    title: '成交量與主動買入',
    fields: FIGURE_FIELDS.filter(figureField => figureField.group === 'volume'),
  },
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

    <div class="k-candle-form__group">
      <div class="k-candle-form__grid">
        <FormField
          label="交易標的"
          :hint="identityReadonly ? undefined : '例如 BTCUSDT'"
          :error-message="messageFor('symbol')"
        >
          <AppInput
            v-model="symbol"
            type="text"
            :disabled="identityReadonly"
            :invalid="Boolean(messageFor('symbol'))"
            data-testid="form-symbol"
            @input="emit('touch', 'symbol')"
          />
        </FormField>

        <FormField
          :label="`起始時間（${timeZone.cityLabel}）`"
          :hint="identityReadonly ? undefined : '須落在一分鐘刻度'"
          :error-message="messageFor('openTime')"
        >
          <AppInput
            v-model="openTime"
            type="datetime-local"
            :disabled="identityReadonly"
            :invalid="Boolean(messageFor('openTime'))"
            data-testid="form-open-time"
            @input="emit('touch', 'openTime')"
          />
        </FormField>
      </div>

      <p
        v-if="identityReadonly"
        class="k-candle-form__notice"
        data-testid="identity-readonly-hint"
      >
        {{ IDENTITY_READONLY_HINT }}
      </p>
    </div>

    <fieldset
      v-for="figureGroup in FIGURE_GROUPS"
      :key="figureGroup.title"
      class="k-candle-form__group"
    >
      <legend class="k-candle-form__group-title">
        {{ figureGroup.title }}
      </legend>

      <div class="k-candle-form__grid">
        <FormField
          v-for="figureField in figureGroup.fields"
          :key="figureField.field"
          :label="figureField.label"
          :hint="figureField.hint"
          :error-message="messageFor(figureField.field)"
        >
          <AppInput
            v-model="figureField.model.value"
            type="text"
            inputmode="decimal"
            :invalid="Boolean(messageFor(figureField.field))"
            :data-testid="`form-${figureField.field}`"
            @input="emit('touch', figureField.field)"
          />
        </FormField>
      </div>
    </fieldset>

    <!-- 有任何一條規則不成立時儲存按不下去；訊息就在那一格底下。 -->
    <div class="k-candle-form__actions">
      <slot name="extra-actions" />
      <span class="k-candle-form__spacer" />
      <AppButton
        type="button"
        variant="secondary"
        :disabled="submitting"
        data-testid="form-cancel"
        @click="emit('cancel')"
      >
        取消
      </AppButton>
      <AppButton
        type="submit"
        :disabled="submitting || !savable"
        data-testid="form-submit"
      >
        {{ submitting ? '處理中…' : submitLabel }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped lang="scss">
.k-candle-form {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__notice {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }

  // 身分、價格、成交量三組，各自一個小標與一片兩欄的格子——
  // 這張表單住在表格旁那張窄卡裡，也住在手機底部那張紙上，兩處都只放得下兩欄。
  &__group {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    border: 0;
    padding: 0;
    min-width: 0;
  }

  &__group-title {
    margin-bottom: spacing('2xs');
    padding: 0;

    @include dense-label;
  }

  &__grid {
    display: grid;
    gap: spacing('xs') spacing('sm');
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }

  &__spacer {
    flex: 1;
  }
}
</style>
