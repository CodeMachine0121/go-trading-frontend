<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'

// 分子：查詢條件的輸入與送出。
// 欄位是否有錯由外部傳入——條件合不合法是業務規則，不在元件裡判斷。
const { loading = false, symbolError = null, startTimeError = null, endTimeError = null } = defineProps<{
  loading?: boolean
  symbolError?: string | null
  startTimeError?: string | null
  endTimeError?: string | null
}>()

const emit = defineEmits<{ submit: [] }>()

const symbol = defineModel<string>('symbol', { required: true })
const startTime = defineModel<string>('startTime', { required: true })
const endTime = defineModel<string>('endTime', { required: true })
</script>

<template>
  <form
    class="k-candle-query-form"
    @submit.prevent="emit('submit')"
  >
    <SymbolField
      v-model="symbol"
      :error-message="symbolError"
      class="k-candle-query-form__field"
    />

    <FormField
      label="開始時間"
      hint="世界標準時間（UTC）"
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

    <FormField
      label="結束時間"
      hint="世界標準時間（UTC）"
      :error-message="endTimeError"
      class="k-candle-query-form__field"
    >
      <AppInput
        v-model="endTime"
        type="datetime-local"
        :invalid="Boolean(endTimeError)"
        data-testid="end-time-input"
      />
    </FormField>

    <AppButton
      type="submit"
      :disabled="loading"
      class="k-candle-query-form__submit"
      data-testid="submit-button"
    >
      {{ loading ? '查詢中…' : '查詢' }}
    </AppButton>
  </form>
</template>

<style scoped lang="scss">
.k-candle-query-form {
  display: grid;
  gap: spacing('md');
  align-items: end;
  grid-template-columns: 1fr;

  @include respond-to('md') {
    grid-template-columns: 1fr 1fr 1fr auto;
  }

  &__submit {
    height: fit-content;
  }
}
</style>
