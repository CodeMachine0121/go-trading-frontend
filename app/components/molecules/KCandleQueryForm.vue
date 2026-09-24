<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：查詢條件的輸入與送出。
// 欄位是否有錯由外部傳入——條件合不合法是業務規則，不在元件裡判斷。
// 結束時間不是欄位：查詢一律查到送出當下，因此表單只收開始時間。
//
// 挑標的那一格由使用端放進 `symbol` 插槽：現貨從現貨的清單挑、合約從合約的清單挑，
// 而「查詢條件」這張表單只有一張——開始時間與送出的規則兩條線一模一樣。
const { timeZone, loading = false, startTimeError = null } = defineProps<{
  timeZone: TimeZoneDto
  loading?: boolean
  startTimeError?: string | null
}>()

const emit = defineEmits<{ submit: [] }>()

defineSlots<{ symbol: () => unknown }>()

const startTime = defineModel<string>('startTime', { required: true })
</script>

<template>
  <form
    class="k-candle-query-form"
    @submit.prevent="emit('submit')"
  >
    <div class="k-candle-query-form__field">
      <slot name="symbol" />
    </div>

    <FormField
      label="開始時間"
      :hint="`${timeZone.cityLabel}；查到送出當下`"
      :error-message="startTimeError"
      class="k-candle-query-form__field"
    >
      <AppInput
        v-model="startTime"
        type="datetime-local"
        :invalid="Boolean(startTimeError)"
        data-testid="start-time-input"
      />
    </FormField>

    <AppButton
      type="submit"
      variant="secondary"
      :disabled="loading"
      class="k-candle-query-form__submit"
      data-testid="submit-button"
    >
      {{ loading ? '查詢中…' : '查詢' }}
    </AppButton>
  </form>
</template>

<style scoped lang="scss">
// 查詢列：一條橫跨結果卡片頂端的窄帶，條件與送出排成一行。
.k-candle-query-form {
  display: grid;
  gap: spacing('xs') spacing('sm');

  // 從上面對齊：欄位的標籤因此排成一條線，而按鈕自己補上那一行的高度（見下方）。
  align-items: start;
  grid-template-columns: minmax(0, 1fr);

  // 兩格條件並排、按鈕跟在後面；再寬也不把兩格拉長——
  // 一排跨滿整個寬度的輸入框只會讓兩個欄位看起來像八個。
  @include respond-to('sm') {
    grid-template-columns: minmax(0, 14rem) minmax(0, 16rem) auto;
    justify-content: start;
  }

  &__submit {
    @include respond-to('sm') {
      @include align-with-field-control;
    }
  }
}
</style>
