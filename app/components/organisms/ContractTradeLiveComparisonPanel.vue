<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { tradingStrategies, comparison = null, replaying = false, failureMessage = null } = defineProps<{
  tradingStrategies: readonly TradingStrategyDto[]
  comparison?: ContractTradeLiveComparisonDto | null
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
  <AppPanel :title="t('contractTradeJournal.liveComparison.title')">
    <div class="contract-trade-live-comparison-panel">
      <FormField
        :label="t('contractTradeJournal.liveComparison.strategy')"
        :hint="t('contractTradeJournal.liveComparison.strategyHint')"
      >
        <AppSelect
          v-model="selectedValue"
          :disabled="replaying"
          data-testid="comparison-strategy"
        >
          <option value="">
            {{ t('contractTradeJournal.liveComparison.pickStrategy') }}
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
        class="contract-trade-live-comparison-panel__state"
        data-testid="comparison-replaying"
      >
        {{ t('contractTradeJournal.liveComparison.replaying') }}
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
          v-if="comparison.notice"
          class="contract-trade-live-comparison-panel__state"
          data-testid="comparison-notice"
        >
          {{ localize(comparison.notice) }}
        </p>
        <p
          v-if="comparison.strategyEntrySlippageText"
          class="contract-trade-live-comparison-panel__state"
          data-testid="comparison-strategy-slippage"
        >
          {{ localize(comparison.strategyEntrySlippageText) }}
        </p>
        <div
          v-if="comparison.rows.length > 0"
          class="contract-trade-live-comparison-panel__scroller"
        >
          <table
            class="contract-trade-live-comparison-panel__table"
            data-testid="comparison-table"
          >
            <thead>
              <tr>
                <th>{{ t('contractTradeJournal.liveComparison.columns.symbol') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.backtestWinRate') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.liveWinRate') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.backtestTradeCount') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.liveTradeCount') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.backtestLongShort') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.liveLongShort') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.liveAverageSlippage') }}</th>
                <th>{{ t('contractTradeJournal.liveComparison.columns.verdict') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparison.rows"
                :key="row.symbol"
                :data-testid="`comparison-row-${row.symbol}`"
              >
                <td>{{ row.symbol }}</td>
                <template v-if="row.backtest">
                  <td>{{ localize(row.backtest.winRateText) }}</td>
                  <td :class="`contract-trade-live-comparison-panel__tone--${row.liveWinRateTone}`">
                    {{ localize(row.live.winRateText) }}
                  </td>
                  <td>{{ localize(row.backtest.closedTradeCountText) }}</td>
                  <td>{{ localize(row.live.closedTradeCountText) }}</td>
                  <td>{{ localize(row.backtest.longWinRateText) }}{{ t('contractTradeJournal.common.slash') }}{{ localize(row.backtest.shortWinRateText) }}</td>
                  <td>{{ localize(row.live.longWinRateText) }}{{ t('contractTradeJournal.common.slash') }}{{ localize(row.live.shortWinRateText) }}</td>
                </template>
                <template v-else>
                  <td class="contract-trade-live-comparison-panel__unavailable">
                    {{ localize(row.backtestUnavailableMessage) }}
                  </td>
                  <td>{{ localize(row.live.winRateText) }}</td>
                  <td>—</td>
                  <td>{{ localize(row.live.closedTradeCountText) }}</td>
                  <td>—</td>
                  <td>{{ localize(row.live.longWinRateText) }}{{ t('contractTradeJournal.common.slash') }}{{ localize(row.live.shortWinRateText) }}</td>
                </template>
                <td data-testid="comparison-slippage">
                  {{ localize(row.live.entrySlippageText) }}
                  <small v-if="row.live.entrySlippageNote">{{ localize(row.live.entrySlippageNote) }}</small>
                </td>
                <td>
                  <AppBadge
                    :variant="row.verdictTone"
                    :data-testid="`comparison-verdict-${row.symbol}`"
                  >
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
.contract-trade-live-comparison-panel {
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

    td.contract-trade-live-comparison-panel__tone--danger {
      color: color('danger');
    }

    td.contract-trade-live-comparison-panel__unavailable {
      color: color('text-muted');
      text-align: left;
    }
  }
}
</style>
