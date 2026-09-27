<script setup lang="ts">
import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'

const { figures, layout = 'strip' } = defineProps<{
  figures: readonly ContractTradeFigureVo[]
  layout?: 'strip' | 'list'
}>()
</script>

<template>
  <dl
    class="contract-trade-summary-strip"
    :class="`contract-trade-summary-strip--${layout}`"
  >
    <div
      v-for="figure in figures"
      :key="figure.label"
      class="contract-trade-summary-strip__figure"
      :data-testid="`figure-${figure.label}`"
    >
      <dt class="contract-trade-summary-strip__label">
        {{ figure.label }}
      </dt>
      <dd
        class="contract-trade-summary-strip__value"
        :class="`contract-trade-summary-strip__value--${figure.tone}`"
      >
        {{ figure.text }}
        <small
          v-if="figure.note"
          class="contract-trade-summary-strip__note"
        >{{ figure.note }}</small>
      </dd>
    </div>
  </dl>
</template>

<style scoped lang="scss">
.contract-trade-summary-strip {
  display: grid;
  gap: 1px;
  margin: 0;
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('border');
  overflow: hidden;

  &--strip {
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  }

  &--list {
    grid-template-columns: minmax(0, 1fr);
  }

  &__figure {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    background-color: color('surface');
    padding: spacing('xs') spacing('sm');
  }

  &--list &__figure {
    flex-direction: row;
    justify-content: space-between;
    align-items: baseline;
  }

  &__label {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__value {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('3xs');
    align-items: baseline;
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('medium');
    font-size: font-size('sm');

    @include numeric;

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }

    &--muted {
      color: color('text-muted');
      font-weight: font-weight('regular');
    }
  }

  &__note {
    color: color('text-faint');
    font-weight: font-weight('regular');
    font-size: font-size('2xs');
  }
}
</style>
