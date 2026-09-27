<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import TradeSummaryStrip from '~/components/molecules/TradeSummaryStrip.vue'
import TradePricePathChart from '~/components/molecules/TradePricePathChart.vue'
import type { TradeOutcomeDto } from '~/domain/models/dto/trade-outcome-dto'
import type { TradeSourceDto } from '~/domain/models/dto/trade-source-dto'
import type { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

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
  pricePathFailureMessage?: string | null
  timeZone: TimeZoneDto
}>()

const pricePathMessage = computed(() => outcome.pricePathUnavailableMessage
  ?? pricePathFailureMessage
  ?? pricePath?.emptyMessage
  ?? null)
</script>

<template>
  <div class="trade-outcome-panel">
    <AppPanel title="價格路徑">
      <p
        v-if="pricePathMessage"
        class="trade-outcome-panel__state"
        data-testid="price-path-message"
      >
        {{ pricePathMessage }}
      </p>
      <p
        v-else-if="pricePathLoading || pricePath === null"
        class="trade-outcome-panel__state"
        data-testid="price-path-loading"
      >
        讀取行情…
      </p>
      <TradePricePathChart
        v-else
        :price-path="pricePath"
        :time-zone="timeZone"
      />
    </AppPanel>

    <AppPanel title="結果">
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
          <dt>{{ source.label }}</dt>
          <dd>參考價 {{ source.referencePriceText }}</dd>
          <dd>建議止損 {{ source.suggestedStopLossPriceText }}</dd>
          <dd>建議止盈 {{ source.suggestedTakeProfitPriceText }}</dd>
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
