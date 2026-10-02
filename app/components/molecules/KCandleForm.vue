<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { KCandleWriteField } from '~/domain/errors/k-candle-field-error'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

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
  fieldError?: { field: KCandleWriteField, message: LocalizedTextVo } | null
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

const { t } = useI18n()
const { localize } = useLocalizedText()

/**
 * 不是每個市場都報這三項。留白就是「這個市場沒有這一項」，存進去仍然是沒有。
 * 說出來是必要的：欄位空著而不解釋，看的人只會以為自己漏填了。
 */
const optionalFigureHint = computed(() => t('marketData.kCandleForm.optionalFigureHint'))

/**
 * 八個價量欄位長得一模一樣，逐欄複製一份 template 只會讓加欄位變成八處修改。
 * 它們分成兩組：開高低收是讀一根 K 線時第一眼要看、也最常要改的；成交量那一組次之。
 */
const figureFields = computed<{
  field: KCandleWriteField
  label: string
  model: Ref<string>
  group: 'price' | 'volume'
  hint?: string
}[]>(() => [
  { field: 'open', label: t('marketData.kCandleForm.openLabel'), model: open, group: 'price' },
  { field: 'high', label: t('marketData.kCandleForm.highLabel'), model: high, group: 'price' },
  { field: 'low', label: t('marketData.kCandleForm.lowLabel'), model: low, group: 'price' },
  { field: 'close', label: t('marketData.kCandleForm.closeLabel'), model: close, group: 'price' },
  { field: 'volume', label: t('marketData.kCandleForm.volumeLabel'), model: volume, group: 'volume' },
  {
    field: 'quoteVolume',
    label: t('marketData.kCandleForm.quoteVolumeLabel'),
    model: quoteVolume,
    group: 'volume',
    hint: optionalFigureHint.value,
  },
  {
    field: 'takerBuyBaseVolume',
    label: t('marketData.kCandleForm.takerBuyBaseVolumeLabel'),
    model: takerBuyBaseVolume,
    group: 'volume',
    hint: optionalFigureHint.value,
  },
  {
    field: 'takerBuyQuoteVolume',
    label: t('marketData.kCandleForm.takerBuyQuoteVolumeLabel'),
    model: takerBuyQuoteVolume,
    group: 'volume',
    hint: optionalFigureHint.value,
  },
])

const figureGroups = computed(() => [
  {
    group: 'price',
    title: t('marketData.kCandleForm.priceGroupTitle'),
    fields: figureFields.value.filter(figureField => figureField.group === 'price'),
  },
  {
    group: 'volume',
    title: t('marketData.kCandleForm.volumeGroupTitle'),
    fields: figureFields.value.filter(figureField => figureField.group === 'volume'),
  },
])

/** 訊息在渲染當下才挑語言，所以換語言時已經標在那一格的說明跟著換。 */
function messageFor(field: KCandleWriteField): string | null {
  return fieldError?.field === field ? localize(fieldError.message) : null
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
      {{ t('marketData.kCandleForm.overwriteNotice') }}
    </p>

    <div class="k-candle-form__group">
      <div class="k-candle-form__grid">
        <FormField
          :label="t('marketData.kCandleForm.symbolLabel')"
          :hint="identityReadonly ? undefined : t('marketData.kCandleForm.symbolHint')"
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
          :label="t('marketData.kCandleForm.openTimeLabel', { cityName: localize(timeZone.cityName) })"
          :hint="identityReadonly ? undefined : t('marketData.kCandleForm.openTimeHint')"
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

      <!--
        身分唯讀時的說明。兩格一起說一次，而不是各自掛一句「不得更換」——
        看的人要知道的不只是改不動，還有真的要改的話該怎麼做。
      -->
      <p
        v-if="identityReadonly"
        class="k-candle-form__notice"
        data-testid="identity-readonly-hint"
      >
        {{ t('marketData.kCandleForm.identityReadonlyHint') }}
      </p>
    </div>

    <fieldset
      v-for="figureGroup in figureGroups"
      :key="figureGroup.group"
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
        {{ t('marketData.common.cancel') }}
      </AppButton>
      <AppButton
        type="submit"
        :disabled="submitting || !savable"
        data-testid="form-submit"
      >
        {{ submitting ? t('marketData.kCandleForm.submitting') : submitLabel }}
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
