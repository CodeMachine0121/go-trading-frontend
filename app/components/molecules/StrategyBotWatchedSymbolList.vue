<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { StrategyBotWatchedSymbolDto } from '~/domain/models/dto/strategy-bot-watched-symbol-dto'

defineProps<{ watchedSymbols: readonly StrategyBotWatchedSymbolDto[] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <ul class="watched-symbol-list">
    <li
      v-for="watchedSymbol in watchedSymbols"
      :key="watchedSymbol.symbol"
      class="watched-symbol-list__row"
      data-testid="watched-symbol-row"
    >
      <div class="watched-symbol-list__headline">
        <span class="watched-symbol-list__symbol">{{ localize(watchedSymbol.symbolLabel) }}</span>
        <AppBadge
          v-if="watchedSymbol.isHalted"
          variant="danger"
          data-testid="watched-symbol-halted"
        >
          {{ localize(watchedSymbol.stateLabel) }}
        </AppBadge>
        <AppBadge
          v-if="watchedSymbol.isConflicting"
          variant="warning"
          data-testid="watched-symbol-conflicting"
        >
          {{ t('strategyBot.watchedSymbolList.conflicting') }}
        </AppBadge>
      </div>

      <p
        v-if="watchedSymbol.haltReasonLabel !== null"
        class="watched-symbol-list__halt-reason"
        data-testid="watched-symbol-halt-reason"
      >
        {{ localize(watchedSymbol.haltReasonLabel) }}
      </p>

      <p
        class="watched-symbol-list__fact"
        data-testid="watched-symbol-last-signal"
      >
        {{ t('strategyBot.watchedSymbolList.lastSignal') }}{{ localize(watchedSymbol.lastSentSignalLabel) }}
      </p>

      <p
        class="watched-symbol-list__fact"
        data-testid="watched-symbol-allocation"
      >
        {{ localize(watchedSymbol.allocationLabel) }}
        <span
          v-if="watchedSymbol.allocatedCapitalLabel !== null"
          class="watched-symbol-list__allocated-capital"
          data-testid="watched-symbol-allocated-capital"
        >· {{ localize(watchedSymbol.allocatedCapitalLabel) }}</span>
      </p>

      <p
        v-if="watchedSymbol.autoOrderPositionLabel !== null"
        class="watched-symbol-list__fact"
        data-testid="watched-symbol-position"
      >
        {{ t('strategyBot.watchedSymbolList.position') }}<span class="watched-symbol-list__position">{{ localize(watchedSymbol.autoOrderPositionLabel) }}</span>
      </p>
    </li>
  </ul>
</template>

<style scoped lang="scss">
.watched-symbol-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;

  &__row {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border-bottom: 1px solid color('border');
    padding: spacing('xs') 0;

    &:last-child {
      border-bottom: none;
    }
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__symbol {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');

    @include numeric;
  }

  &__halt-reason {
    margin: 0;
    color: color('danger');
    font-size: font-size('xs');
  }

  &__fact {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__position,
  &__allocated-capital {
    color: color('text');

    @include numeric;
  }
}
</style>
