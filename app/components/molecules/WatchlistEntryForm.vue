<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { MARKETS, type MarketValue } from '~/domain/models/vo/market-vo'

/**
 * 分子：把一檔加進觀察清單的那一組輸入。
 *
 * 代號**不邊打邊查**。打字途中的每一個前綴在市場那邊都是「找不到」，
 * 畫面會一路閃紅字；而且每按一次鍵就向行情來源問一次，會撞上它的用量上限。
 * 所以只在送出時問一次。
 */
const { submitting = false, errorMessage = null } = defineProps<{
  submitting?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{ add: [entry: WatchlistEntryDto] }>()

/**
 * 打進去的代號住在使用端，不住在這裡。
 *
 * 因為「什麼時候該清掉它」的答案是「加成功之後」，而只有使用端知道那件事。
 * 送出當下就清的話，「請確認之後再送出」這句話便無從遵守——要確認的東西已經不在了；
 * 而他再按一次加入，擋下空白的規則會把畫面換成「請填入代號」，把真正的原因蓋掉。
 */
const symbol = defineModel<string>('symbol', { required: true })

const firstMarket = MARKETS[0]!
const market = ref<MarketValue>(firstMarket.value)
const blankSymbol = ref(false)

function submit() {
  const trimmedSymbol = symbol.value.trim()

  // 空白就地擋下。付一趟往返來發現什麼都沒填，是白付的。
  blankSymbol.value = trimmedSymbol === ''
  if (blankSymbol.value) {
    return
  }

  emit('add', new WatchlistEntryDto(trimmedSymbol, market.value))
}
</script>

<template>
  <form
    class="watchlist-entry-form"
    @submit.prevent="submit"
  >
    <FormField label="市場">
      <AppSelect
        v-model="market"
        data-testid="watchlist-market"
      >
        <option
          v-for="option in MARKETS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </AppSelect>
    </FormField>

    <FormField label="代號">
      <AppInput
        v-model="symbol"
        placeholder="2330"
        :invalid="blankSymbol || Boolean(errorMessage)"
        data-testid="watchlist-symbol"
      />
    </FormField>

    <AppButton
      type="submit"
      :disabled="submitting"
      data-testid="watchlist-add"
    >
      {{ submitting ? '確認中…' : '加入' }}
    </AppButton>

    <!--
      訊息自己一整列，不擠在代號那一欄底下。
      擠進去的話它會把那一欄撐高，整排跟著被拉開，市場選單與按鈕就與輸入框錯開——
      而這幾句本來就長（「請稍後再試，這與代號對不對無關」），窄欄位裝不下。
    -->
    <p
      v-if="blankSymbol || errorMessage"
      class="watchlist-entry-form__error"
      data-testid="field-error"
    >
      {{ blankSymbol ? '請填入代號' : errorMessage }}
    </p>
  </form>
</template>

<style scoped lang="scss">
.watchlist-entry-form {
  display: flex;
  align-items: flex-end;
  gap: spacing('sm');
  flex-wrap: wrap;

  &__error {
    flex-basis: 100%;
    margin: 0;
    color: color('danger');
    font-size: font-size('2xs');
    line-height: line-height('normal');
  }
}
</style>
