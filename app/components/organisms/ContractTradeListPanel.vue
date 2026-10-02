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
import type { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import type { TradeStatusFilter } from '~/domain/models/vo/trade-status-filter-vo'
import type { TradeSourceFilter } from '~/domain/models/vo/trade-source-filter-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { t } = useI18n()
const { localize } = useLocalizedText()

const statusOptions = computed(() => [
  { value: 'all', label: t('contractTradeJournal.list.statusOptions.all') },
  { value: 'open', label: t('contractTradeJournal.list.statusOptions.open') },
  { value: 'closed', label: t('contractTradeJournal.list.statusOptions.closed') },
  { value: 'reviewed', label: t('contractTradeJournal.list.statusOptions.reviewed') },
])

const sourceOptions = computed(() => [
  { value: 'all', label: t('contractTradeJournal.list.sourceOptions.all') },
  { value: 'linked', label: t('contractTradeJournal.list.sourceOptions.linked') },
  { value: 'selfJudged', label: t('contractTradeJournal.list.sourceOptions.selfJudged') },
])

const { list = null, loading = false, failureMessage = null } = defineProps<{
  list?: ContractTradeListDto | null
  loading?: boolean
  failureMessage?: LocalizedTextVo | null
}>()

const statusFilter = defineModel<TradeStatusFilter>('statusFilter', { required: true })
const sourceFilter = defineModel<TradeSourceFilter>('sourceFilter', { required: true })
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
</script>

<template>
  <div class="contract-trade-list-panel">
    <header class="contract-trade-list-panel__toolbar">
      <p
        v-if="list"
        class="contract-trade-list-panel__counts"
        data-testid="trade-list-counts"
      >
        {{ localize(list.periodLabel) }}{{ t('contractTradeJournal.common.separator') }}{{ localize(list.tradeCountsLabel) }}
      </p>
      <AppButton
        v-if="list && list.pendingReviewCount > 0"
        variant="secondary"
        data-testid="pending-review"
        @click="emit('showPendingReview')"
      >
        {{ t('contractTradeJournal.list.pendingReview') }} <span class="contract-trade-list-panel__pending-count">{{ list.pendingReviewCount }}</span>
      </AppButton>
      <AppButton
        variant="secondary"
        to="/contract-trade-journal/statistics"
        data-testid="open-statistics"
      >
        {{ t('contractTradeJournal.list.statistics') }}
      </AppButton>
      <AppButton
        to="/contract-trade-journal/new"
        data-testid="record-trade"
      >
        {{ t('contractTradeJournal.list.recordTrade') }}
      </AppButton>
    </header>

    <p
      v-if="loading && !list"
      class="contract-trade-list-panel__state"
      data-testid="trade-list-loading"
    >
      {{ t('contractTradeJournal.common.loading') }}
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
          {{ t('contractTradeJournal.list.retry') }}
        </AppButton>
      </template>
    </AppAlert>

    <template v-else-if="list">
      <TradeSummaryStrip
        v-if="list.summaryFigures.length > 0"
        :figures="list.summaryFigures"
        data-testid="trade-list-summary"
      />

      <div class="contract-trade-list-panel__filters">
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
        <AppSelect
          v-model="symbolFilter"
          class="contract-trade-list-panel__symbol"
          data-testid="symbol-filter"
        >
          <option value="">
            {{ t('contractTradeJournal.list.allSymbols') }}
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
          class="contract-trade-list-panel__empty"
          data-testid="trade-list-empty"
        >
          {{ localize(list.emptyMessage) }}
        </p>
        <div
          v-else
          class="contract-trade-list-panel__scroller"
        >
          <table class="contract-trade-list-panel__table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ t('contractTradeJournal.list.columns.symbol') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.direction') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.status') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.source') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.averageEntry') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.averageExit') }}</th>
                <th>{{ t('contractTradeJournal.list.columns.netProfit') }}</th>
                <th>R</th>
                <th>{{ t('contractTradeJournal.list.columns.tags') }}</th>
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
                    :to="`/contract-trade-journal/${row.id}`"
                    class="contract-trade-list-panel__link"
                  >
                    {{ row.id }}
                  </NuxtLink>
                </td>
                <td class="contract-trade-list-panel__text">
                  <NuxtLink
                    :to="`/contract-trade-journal/${row.id}`"
                    class="contract-trade-list-panel__link"
                  >
                    {{ row.symbol }}
                  </NuxtLink>
                </td>
                <td>
                  <TradeStatusBadge
                    :label="localize(row.directionLabel)"
                    :tone="row.directionTone"
                  />
                </td>
                <td>
                  <TradeStatusBadge
                    :label="localize(row.statusLabel)"
                    :tone="row.statusTone"
                  />
                  <span
                    v-if="row.pendingReview"
                    class="contract-trade-list-panel__flag"
                  >{{ t('contractTradeJournal.list.pendingReview') }}</span>
                </td>
                <td class="contract-trade-list-panel__text">
                  {{ localize(row.sourceLabel) }}
                </td>
                <td>{{ row.averageEntryPriceText }}</td>
                <td>{{ row.averageExitPriceText }}</td>
                <td :class="`contract-trade-list-panel__tone--${row.profit.tone}`">
                  {{ localize(row.profit.text) }}
                  <small v-if="row.profit.note">{{ localize(row.profit.note) }}</small>
                </td>
                <td>{{ localize(row.rMultipleText) }}</td>
                <td class="contract-trade-list-panel__text">
                  <span class="contract-trade-list-panel__tags">
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
.contract-trade-list-panel {
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

    td.contract-trade-list-panel__text {
      color: color('text');
      text-align: left;
    }

    td.contract-trade-list-panel__tone--success {
      color: color('success');
    }

    td.contract-trade-list-panel__tone--danger {
      color: color('danger');
    }

    td.contract-trade-list-panel__tone--muted {
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
