<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { SymbolScreeningTermsDto } from '~/domain/models/dto/symbol-screening-terms-dto'

// Molecule: the figures one screening judges by, shared by a profile and a run's snapshot.
const { terms } = defineProps<{ terms: SymbolScreeningTermsDto }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <ul
    class="symbol-screening-terms-list"
    data-testid="symbol-screening-terms"
  >
    <li>{{ localize(terms.aggregationIntervalLabel) }}</li>
    <li>{{ localize(terms.tradingModeLabel) }}</li>
    <li data-testid="symbol-screening-terms-history-days">
      {{ t('symbolScreening.terms.historyDays', { days: terms.historyDays }) }}
    </li>
    <li>{{ t('symbolScreening.terms.segmentCount', { count: terms.segmentCount }) }}</li>
    <li>{{ t('symbolScreening.terms.minimumTradeCount', { count: terms.minimumTradeCount }) }}</li>
    <li>{{ t('symbolScreening.terms.minimumAverageDailyQuoteVolume', { volume: terms.minimumAverageDailyQuoteVolume.toString() }) }}</li>
    <li>{{ t('symbolScreening.terms.leverage', { leverage: terms.leverage.toString() }) }}</li>
    <li>{{ t('symbolScreening.terms.entryCostPercentage', { percent: terms.entryCostPercentage.toString() }) }}</li>
    <li>{{ t('symbolScreening.terms.slippagePercentage', { percent: terms.slippagePercentage.toString() }) }}</li>
    <li data-testid="symbol-screening-terms-baseline">
      {{ terms.baselineSymbols.length === 0
        ? t('symbolScreening.terms.noBaselineSymbols')
        : t('symbolScreening.terms.baselineSymbols', { symbols: terms.baselineSymbols.join(', ') }) }}
    </li>
  </ul>
</template>

<style scoped lang="scss">
.symbol-screening-terms-list {
  display: flex;
  flex-wrap: wrap;
  gap: spacing('3xs') spacing('xs');
  margin: 0;
  padding: 0;
  list-style: none;
  color: color('text-muted');
  font-size: font-size('xs');

  @include numeric;
}
</style>
