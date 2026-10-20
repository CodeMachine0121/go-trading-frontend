<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppInput from '~/components/atoms/AppInput.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { StrategyBotCapitalAllocationSummaryDto } from '~/domain/models/dto/strategy-bot-capital-allocation-summary-dto'

const { summary, percentageTexts } = defineProps<{
  summary: StrategyBotCapitalAllocationSummaryDto
  percentageTexts: ReadonlyMap<string, string>
}>()

const emit = defineEmits<{
  changePercentage: [symbol: string, text: string]
  splitEqually: []
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <FormField
    grouped
    :label="t('strategyBot.capitalAllocation.label')"
    class="capital-allocation-field"
  >
    <ul class="capital-allocation-field__rows">
      <li
        v-for="row in summary.rows"
        :key="row.symbol"
        class="capital-allocation-field__row"
        data-testid="bot-capital-allocation-row"
      >
        <span class="capital-allocation-field__symbol">{{ row.symbol }}</span>
        <span class="capital-allocation-field__percentage">
          <AppInput
            :model-value="percentageTexts.get(row.symbol) ?? ''"
            class="capital-allocation-field__input"
            type="number"
            inputmode="decimal"
            :aria-label="t('strategyBot.capitalAllocation.percentageOf', { symbol: row.symbol })"
            data-testid="bot-capital-allocation-input"
            @update:model-value="emit('changePercentage', row.symbol, String($event))"
          />
          %
        </span>
        <span
          v-if="row.allocatedCapital !== null"
          class="capital-allocation-field__allocated"
          data-testid="bot-capital-allocation-allocated"
        >
          {{ t('strategyBot.capitalAllocation.allocated', { amount: row.allocatedCapital.toString() }) }}
        </span>
        <span
          v-if="row.shortfallLabel !== null"
          class="capital-allocation-field__shortfall"
          data-testid="bot-capital-allocation-shortfall"
        >
          {{ localize(row.shortfallLabel) }}
        </span>
      </li>
    </ul>

    <div class="capital-allocation-field__footer">
      <span
        class="capital-allocation-field__total"
        :class="{ 'capital-allocation-field__total--over': summary.isOverAllocated }"
        data-testid="bot-capital-allocation-total"
      >
        {{ t('strategyBot.capitalAllocation.total', { percentage: summary.totalPercentage.toString() }) }}<template v-if="!summary.isOverAllocated"> · {{ t('strategyBot.capitalAllocation.unallocated', { percentage: summary.unallocatedPercentage.toString() }) }}</template>
      </span>
      <AppButton
        type="button"
        variant="ghost"
        size="small"
        data-testid="bot-capital-allocation-split-equally"
        @click="emit('splitEqually')"
      >
        {{ t('strategyBot.capitalAllocation.splitEqually') }}
      </AppButton>
    </div>
  </FormField>
</template>

<style scoped lang="scss">
.capital-allocation-field {
  min-width: 0;

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('xs');
  }

  &__symbol {
    flex: 0 0 7rem;
    color: color('text-strong');
    font-size: font-size('sm');

    @include numeric;
  }

  &__percentage {
    display: inline-flex;
    align-items: center;
    gap: spacing('3xs');
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__input {
    width: 6rem;
  }

  &__allocated {
    color: color('text');
    font-size: font-size('xs');

    @include numeric;
  }

  &__shortfall {
    color: color('warning');
    font-size: font-size('xs');
  }

  &__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: spacing('xs');
  }

  &__total {
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;

    &--over {
      color: color('warning');
    }
  }
}
</style>
