<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import TradeStatusBadge from '~/components/molecules/TradeStatusBadge.vue'
import TradeSummaryStrip from '~/components/molecules/TradeSummaryStrip.vue'
import type { SpotTradeListDto } from '~/domain/models/dto/spot-trade-list-dto'
import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'
import type { SpotTradeMarketFilter } from '~/domain/models/vo/spot-trade-market-filter-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { list = null, loading = false, failureMessage = null } = defineProps<{
  list?: SpotTradeListDto | null
  loading?: boolean
  failureMessage?: LocalizedTextVo | null
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const statusOptions = computed(() => [
  { value: 'all', label: t('tradeJournal.spotList.statusAll') },
  { value: 'open', label: t('tradeJournal.spotList.statusOpen') },
  { value: 'closed', label: t('tradeJournal.spotList.statusClosed') },
  { value: 'reviewed', label: t('tradeJournal.spotList.statusReviewed') },
])

const sourceOptions = computed(() => [
  { value: 'all', label: t('tradeJournal.spotList.sourceAll') },
  { value: 'linked', label: t('tradeJournal.spotList.sourceLinked') },
  { value: 'selfJudged', label: t('tradeJournal.spotList.sourceSelfJudged') },
])

const marketOptions = computed(() => [
  { value: 'all', label: t('tradeJournal.spotList.marketAll') },
  { value: 'taiwanStock', label: t('tradeJournal.spotList.marketTaiwanStock') },
  { value: 'crypto', label: t('tradeJournal.spotList.marketCrypto') },
])

const statusFilter = defineModel<TradeStatusFilter>('statusFilter', { required: true })
const sourceFilter = defineModel<TradeSourceFilter>('sourceFilter', { required: true })
const marketFilter = defineModel<SpotTradeMarketFilter>('marketFilter', { required: true })
const symbolFilter = defineModel<string>('symbolFilter', { required: true })

const emit = defineEmits<{ retry: [], showPendingReview: [] }>()

const statusTab = computed({
  get: () => statusFilter.value,
  set: (value: string) => {
    statusFilter.value = value as TradeStatusFilter
  },
})

const sourceTab = computed({
  get: () => sourceFilter.value,
  set: (value: string) => {
    sourceFilter.value = value as TradeSourceFilter
  },
})

const marketTab = computed({
  get: () => marketFilter.value,
  set: (value: string) => {
    marketFilter.value = value as SpotTradeMarketFilter
  },
})
</script>

<template>
  <div class="spot-trade-list-panel">
    <header class="spot-trade-list-panel__toolbar">
      <p
        v-if="list"
        class="spot-trade-list-panel__counts"
        data-testid="trade-list-counts"
      >
        {{ t('tradeJournal.common.joined', { first: localize(list.periodLabel), second: localize(list.tradeCountsLabel) }) }}
      </p>
      <AppButton
        v-if="list && list.pendingReviewCount > 0"
        variant="secondary"
        data-testid="pending-review"
        @click="emit('showPendingReview')"
      >
        {{ t('tradeJournal.spotList.pendingReview') }} <span class="spot-trade-list-panel__pending-count">{{ list.pendingReviewCount }}</span>
      </AppButton>
      <AppButton
        variant="secondary"
        to="/spot-trade-journal/statistics"
        data-testid="open-statistics"
      >
        {{ t('tradeJournal.spotList.openStatistics') }}
      </AppButton>
      <AppButton
        to="/spot-trade-journal/new"
        data-testid="record-trade"
      >
        {{ t('tradeJournal.spotList.recordTrade') }}
      </AppButton>
    </header>

    <p
      v-if="loading && !list"
      class="spot-trade-list-panel__state"
      data-testid="trade-list-loading"
    >
      {{ t('tradeJournal.common.loading') }}
    </p>

    <AppAlert
      v-else-if="failureMessage"
      tone="danger"
      data-testid="trade-list-failure"
    >
      {{ localize(failureMessage) }}
      <template #action>
        <AppButton
          variant="ghost"
          data-testid="trade-list-retry"
          @click="emit('retry')"
        >
          {{ t('tradeJournal.common.retry') }}
        </AppButton>
      </template>
    </AppAlert>

    <template v-else-if="list">
      <section
        v-for="summary in list.marketSummaries"
        :key="summary.marketLabel.traditionalChinese"
        class="spot-trade-list-panel__market"
        :data-testid="`trade-list-summary-${summary.marketLabel.traditionalChinese}`"
      >
        <h3 class="spot-trade-list-panel__market-label">
          {{ localize(summary.marketLabel) }}
        </h3>
        <TradeSummaryStrip :figures="summary.figures" />
      </section>

      <div class="spot-trade-list-panel__filters">
        <AppTabs
          v-model="statusTab"
          :options="statusOptions"
          variant="segmented"
          data-testid="status-filter"
        />
        <AppTabs
          v-model="sourceTab"
          :options="sourceOptions"
          variant="segmented"
          data-testid="source-filter"
        />
        <AppTabs
          v-model="marketTab"
          :options="marketOptions"
          variant="segmented"
          data-testid="market-filter"
        />
        <AppSelect
          v-model="symbolFilter"
          class="spot-trade-list-panel__symbol"
          data-testid="symbol-filter"
        >
          <option value="">
            {{ t('tradeJournal.spotList.symbolAll') }}
          </option>
          <option
            v-for="symbol in list.symbolOptions"
            :key="symbol"
            :value="symbol"
          >
            {{ symbol }}
          </option>
        </AppSelect>
      </div>

      <AppPanel flush>
        <p
          v-if="list.emptyMessage"
          class="spot-trade-list-panel__empty"
          data-testid="trade-list-empty"
        >
          {{ localize(list.emptyMessage) }}
        </p>
        <div
          v-else
          class="spot-trade-list-panel__scroller"
        >
          <table class="spot-trade-list-panel__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('tradeJournal.spotList.headings.symbol') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.market') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.status') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.source') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.averageBuyPrice') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.averageSellPrice') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.netProfit') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.returnRate') }}</th>
                <th>{{ t('tradeJournal.spotList.headings.tags') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in list.rows"
                :key="row.id"
                :data-testid="`trade-row-${row.id}`"
              >
                <td>
                  <NuxtLink
                    :to="`/spot-trade-journal/${row.id}`"
                    class="spot-trade-list-panel__link"
                  >
                    {{ row.id }}
                  </NuxtLink>
                </td>
                <td class="spot-trade-list-panel__text">
                  <NuxtLink
                    :to="`/spot-trade-journal/${row.id}`"
                    class="spot-trade-list-panel__link"
                  >
                    {{ row.symbol }}
                  </NuxtLink>
                </td>
                <td class="spot-trade-list-panel__text">
                  {{ localize(row.marketLabel) }}
                </td>
                <td>
                  <TradeStatusBadge
                    :label="localize(row.statusLabel)"
                    :tone="row.statusTone"
                  />
                  <span
                    v-if="row.pendingReview"
                    class="spot-trade-list-panel__flag"
                  >{{ t('tradeJournal.spotList.pendingReview') }}</span>
                </td>
                <td class="spot-trade-list-panel__text">
                  {{ localize(row.sourceLabel) }}
                </td>
                <td>{{ row.averageBuyPriceText }}</td>
                <td>{{ row.averageSellPriceText }}</td>
                <td :class="`spot-trade-list-panel__tone--${row.profit.tone}`">
                  {{ localize(row.profit.text) }}
                  <small v-if="row.profit.note">{{ localize(row.profit.note) }}</small>
                </td>
                <td :class="`spot-trade-list-panel__tone--${row.returnRate.tone}`">
                  {{ localize(row.returnRate.text) }}
                </td>
                <td class="spot-trade-list-panel__text">
                  <span class="spot-trade-list-panel__tags">
                    <AppBadge
                      v-for="tag in row.tags"
                      :key="tag.name"
                      :variant="tag.tone"
                    >{{ tag.name }}</AppBadge>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AppPanel>
    </template>
  </div>
</template>

<style scoped lang="scss">
.spot-trade-list-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: spacing('xs');
    align-items: center;
  }

  &__counts {
    margin: 0 auto 0 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__pending-count {
    color: color('warning');
    font-weight: font-weight('bold');

    @include numeric;
  }

  &__market {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__market-label {
    margin: 0;
    color: color('text-muted');
    font-weight: font-weight('medium');
    font-size: font-size('xs');
  }

  &__tags {
    display: inline-flex;
    flex-wrap: wrap;
    gap: spacing('3xs');
  }

  &__state,
  &__empty {
    margin: 0;
    padding: spacing('lg') spacing('md');
    color: color('text-faint');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
  }

  &__symbol {
    max-width: 12rem;
  }

  &__scroller {
    overflow-x: auto;
  }

  &__table {
    @include time-series-table;

    td.spot-trade-list-panel__text {
      color: color('text');
      text-align: left;
    }

    td.spot-trade-list-panel__tone--success {
      color: color('success');
    }

    td.spot-trade-list-panel__tone--danger {
      color: color('danger');
    }

    td.spot-trade-list-panel__tone--muted {
      color: color('text-muted');
    }
  }

  &__link {
    color: color('text-strong');
    text-decoration: none;

    &:hover {
      color: color('primary');
    }
  }

  &__flag {
    margin-left: spacing('3xs');
    color: color('warning');
    font-size: font-size('2xs');
  }
}
</style>
