<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import FormField from '~/components/molecules/FormField.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import type { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'

const { symbols, canAdd, maximum, page } = defineProps<{
  symbols: readonly string[]
  canAdd: boolean
  maximum: number
  page: StrategyBotPageDto
  tradingSymbolApplication: TradingSymbolApplication
}>()

const emit = defineEmits<{
  add: [symbol: string]
  remove: [symbol: string]
}>()

const { t } = useI18n()

const pickedSymbol = ref('')
</script>

<template>
  <FormField
    grouped
    :label="t('strategyBot.form.symbolsLabel', { maximum })"
    :hint="canAdd ? undefined : t('strategyBot.form.symbolsFull', { maximum })"
    class="watched-symbols-field"
  >
    <ul
      v-if="symbols.length > 0"
      class="watched-symbols-field__chosen"
      data-testid="bot-watched-symbols"
    >
      <li
        v-for="symbol in symbols"
        :key="symbol"
        class="watched-symbols-field__chip"
        data-testid="bot-watched-symbol"
      >
        <span class="watched-symbols-field__chip-symbol">{{ symbol }}</span>
        <AppButton
          type="button"
          variant="ghost"
          size="small"
          :label="t('strategyBot.form.removeSymbol', { symbol })"
          data-testid="bot-watched-symbol-remove"
          @click="emit('remove', symbol)"
        >
          <AppIcon
            name="close"
            size="small"
          />
        </AppButton>
      </li>
    </ul>
    <p
      v-else
      class="watched-symbols-field__empty"
      data-testid="bot-watched-symbols-empty"
    >
      {{ t('strategyBot.form.noSymbols') }}
    </p>

    <div
      v-if="canAdd"
      class="watched-symbols-field__picker"
    >
      <ContractSymbolField
        v-if="page.picksContractTradingSymbol"
        v-model="pickedSymbol"
        class="watched-symbols-field__picker-field"
        :trading-symbol-application="tradingSymbolApplication"
        watched-only
      />
      <SymbolField
        v-else
        v-model="pickedSymbol"
        class="watched-symbols-field__picker-field"
        :trading-symbol-application="tradingSymbolApplication"
      />
      <AppButton
        type="button"
        variant="secondary"
        :disabled="pickedSymbol === ''"
        data-testid="bot-watched-symbol-add"
        @click="emit('add', pickedSymbol)"
      >
        {{ t('strategyBot.form.addSymbol') }}
      </AppButton>
    </div>
  </FormField>
</template>

<style scoped lang="scss">
.watched-symbols-field {
  min-width: 0;

  &__chosen {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__chip {
    display: inline-flex;
    align-items: center;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('sm');
    background-color: color('surface-muted');
    padding-left: spacing('xs');
  }

  &__chip-symbol {
    color: color('text-strong');
    font-size: font-size('sm');

    @include numeric;
  }

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__picker {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: spacing('xs');
  }

  &__picker-field {
    flex: 1 1 12rem;
  }
}
</style>
