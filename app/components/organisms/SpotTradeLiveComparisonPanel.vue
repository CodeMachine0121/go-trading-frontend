<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { SpotTradeLiveComparisonDto } from '~/domain/models/dto/spot-trade-live-comparison-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { tradingStrategies, comparison = null, replaying = false, failureMessage = null } = defineProps<{
  tradingStrategies: readonly TradingStrategyDto[]
  comparison?: SpotTradeLiveComparisonDto | null
  replaying?: boolean
  failureMessage?: LocalizedTextVo | null
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const selectedTradingStrategyId = defineModel<number | null>('selectedTradingStrategyId', { required: true })

const selectedValue = computed({
  get: () => selectedTradingStrategyId.value === null ? '' : String(selectedTradingStrategyId.value),
  set: (value: string) => {
    selectedTradingStrategyId.value = value === '' ? null : Number(value)
  },
})
</script>

<template>
  <AppPanel :title="t('tradeJournal.liveComparison.title')">
    <div class="spot-trade-live-comparison-panel">
      <FormField
        :label="t('tradeJournal.liveComparison.strategyLabel')"
        :hint="t('tradeJournal.liveComparison.strategyHint')"
      >
        <AppSelect
          v-model="selectedValue"
          :disabled="replaying"
          data-testid="comparison-strategy"
        >
          <option value="">
            {{ t('tradeJournal.liveComparison.pickStrategy') }}
          </option>
          <option
            v-for="tradingStrategy in tradingStrategies"
            :key="tradingStrategy.id"
            :value="String(tradingStrategy.id)"
          >
            {{ tradingStrategy.name }}
          </option>
        </AppSelect>
      </FormField>

      <p
        v-if="replaying"
        class="spot-trade-live-comparison-panel__state"
        data-testid="comparison-replaying"
      >
        {{ t('tradeJournal.liveComparison.replaying') }}
      </p>

      <AppAlert
        v-else-if="failureMessage"
        tone="danger"
        data-testid="comparison-failure"
      >
        {{ localize(failureMessage) }}
      </AppAlert>

      <template v-else-if="comparison">
        <p
          class="spot-trade-live-comparison-panel__state"
          data-testid="comparison-cost-note"
        >
          {{ localize(comparison.costNote) }}
        </p>
        <p
          v-if="comparison.notice"
          class="spot-trade-live-comparison-panel__state"
          data-testid="comparison-notice"
        >
          {{ localize(comparison.notice) }}
        </p>
        <p
          v-if="comparison.strategyEntrySlippageText"
          class="spot-trade-live-comparison-panel__state"
          data-testid="comparison-strategy-slippage"
        >
          {{ localize(comparison.strategyEntrySlippageText) }}
        </p>
        <div
          v-if="comparison.rows.length > 0"
          class="spot-trade-live-comparison-panel__scroller"
        >
          <table
            class="spot-trade-live-comparison-panel__table"
            data-testid="comparison-table"
          >
            <thead>
              <tr>
                <th>{{ t('tradeJournal.liveComparison.headings.symbol') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.market') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.backtestWinRate') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.liveWinRate') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.backtestTradeCount') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.liveTradeCount') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.liveAverageSlippage') }}</th>
                <th>{{ t('tradeJournal.liveComparison.headings.verdict') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparison.rows"
                :key="row.symbol"
                :data-testid="`comparison-row-${row.symbol}`"
              >
                <td>{{ row.symbol }}</td>
                <td>{{ localize(row.marketLabel) }}</td>
                <template v-if="row.backtest">
                  <td>{{ localize(row.backtest.winRateText) }}</td>
                  <td :class="`spot-trade-live-comparison-panel__tone--${row.liveWinRateTone}`">
                    {{ localize(row.live.winRateText) }}
                  </td>
                  <td>{{ localize(row.backtest.closedTradeCountText) }}</td>
                  <td>{{ localize(row.live.closedTradeCountText) }}</td>
                </template>
                <template v-else>
                  <td class="spot-trade-live-comparison-panel__unavailable">
                    {{ row.backtestUnavailableMessage === null ? '' : localize(row.backtestUnavailableMessage) }}
                  </td>
                  <td>{{ localize(row.live.winRateText) }}</td>
                  <td>—</td>
                  <td>{{ localize(row.live.closedTradeCountText) }}</td>
                </template>
                <td>
                  {{ localize(row.live.entrySlippageText) }}
                  <small v-if="row.live.entrySlippageNote">{{ localize(row.live.entrySlippageNote) }}</small>
                </td>
                <td>
                  <AppBadge :variant="row.verdictTone">
                    {{ localize(row.verdictLabel) }}
                  </AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.spot-trade-live-comparison-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__state {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__scroller {
    overflow-x: auto;
  }

  &__table {
    @include time-series-table;

    td.spot-trade-live-comparison-panel__tone--danger {
      color: color('danger');
    }

    td.spot-trade-live-comparison-panel__unavailable {
      color: color('text-muted');
      text-align: left;
    }
  }
}
</style>
