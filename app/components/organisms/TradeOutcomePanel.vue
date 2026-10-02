<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppPanel from '~/components/atoms/AppPanel.vue'
import TradeSummaryStrip from '~/components/molecules/TradeSummaryStrip.vue'
import TradePricePathChart from '~/components/molecules/TradePricePathChart.vue'
import type { TradeOutcomeDto } from '~/domain/models/dto/trade-outcome-dto'
import type { TradeSourceDto } from '~/domain/models/dto/trade-source-dto'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const {
  outcome,
  source = null,
  pricePath = null,
  pricePathLoading = false,
  pricePathFailureMessage = null,
  timeZone,
} = defineProps<{
  outcome: TradeOutcomeDto
  source?: TradeSourceDto | null
  pricePath?: TradePricePathDto | null
  pricePathLoading?: boolean
  pricePathFailureMessage?: LocalizedTextVo | null
  timeZone: TimeZoneDto
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const pricePathMessage = computed(() => outcome.pricePathUnavailableMessage
  ?? pricePathFailureMessage
  ?? pricePath?.emptyMessage
  ?? null)
</script>

<template>
  <div class="trade-outcome-panel">
    <AppPanel :title="t('tradeJournal.outcomePanel.pricePathTitle')">
      <p
        v-if="pricePathMessage"
        class="trade-outcome-panel__state"
        data-testid="price-path-message"
      >
        {{ localize(pricePathMessage) }}
      </p>
      <p
        v-else-if="pricePathLoading || pricePath === null"
        class="trade-outcome-panel__state"
        data-testid="price-path-loading"
      >
        {{ t('tradeJournal.outcomePanel.loadingMarketData') }}
      </p>
      <TradePricePathChart
        v-else
        :price-path="pricePath"
        :time-zone="timeZone"
      />
    </AppPanel>

    <AppPanel :title="t('tradeJournal.outcomePanel.resultTitle')">
      <div class="trade-outcome-panel__result">
        <TradeSummaryStrip
          v-for="(group, index) in outcome.figureGroups"
          :key="index"
          :figures="group"
          layout="list"
          :data-testid="`outcome-group-${index}`"
        />
        <dl
          v-if="source"
          class="trade-outcome-panel__source"
          data-testid="trade-source"
        >
          <dt>{{ localize(source.label) }}</dt>
          <dd>{{ t('tradeJournal.outcomePanel.referencePrice', { price: localize(source.referencePriceText) }) }}</dd>
          <dd>{{ t('tradeJournal.outcomePanel.suggestedStopLoss', { price: localize(source.suggestedStopLossPriceText) }) }}</dd>
          <dd>{{ t('tradeJournal.outcomePanel.suggestedTakeProfit', { price: localize(source.suggestedTakeProfitPriceText) }) }}</dd>
        </dl>
      </div>
    </AppPanel>
  </div>
</template>

<style scoped lang="scss">
.trade-outcome-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: spacing('md');

  @include respond-to('lg') {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  }

  &__state {
    margin: 0;
    padding: spacing('lg') 0;
    color: color('text-faint');
    font-size: font-size('sm');
    text-align: center;
  }

  &__result {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
  }

  &__source {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');

    dt {
      color: color('text-strong');
      font-weight: font-weight('medium');
    }

    dd {
      margin: 0;

      @include numeric;
    }
  }
}
</style>
