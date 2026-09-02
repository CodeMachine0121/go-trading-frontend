<script setup lang="ts">
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'

/** 後端觀察清單上的常用標的，只是快速選取，使用者仍可自行輸入其他標的。 */
const SUGGESTED_SYMBOLS = ['BTCUSDT', 'ETHUSDT']

/**
 * 分子：輸入一個交易標的。
 *
 * 「怎麼輸入交易標的」在這個操作台上只有一種樣子——同一組建議標的、同一句提示、
 * 同一個錯誤呈現方式——所以它是一個元件，不是每個畫面各抄一份。
 * 有沒有錯由外部傳入：標的合不合法是業務規則，不在元件裡判斷。
 */
const { errorMessage = null } = defineProps<{ errorMessage?: string | null }>()

const symbol = defineModel<string>({ required: true })

// 同一頁可能同時出現兩個輸入框，建議清單的 id 因此要各自獨立。
const suggestionsId = useId()
</script>

<template>
  <FormField
    label="交易標的"
    hint="例如 BTCUSDT"
    :error-message="errorMessage"
  >
    <AppInput
      v-model="symbol"
      type="text"
      :list="suggestionsId"
      placeholder="BTCUSDT"
      :invalid="Boolean(errorMessage)"
      data-testid="symbol-input"
    />

    <datalist :id="suggestionsId">
      <option
        v-for="suggestedSymbol in SUGGESTED_SYMBOLS"
        :key="suggestedSymbol"
        :value="suggestedSymbol"
      />
    </datalist>
  </FormField>
</template>
