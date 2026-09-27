<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import ContractTradeStatusBadge from '~/components/molecules/ContractTradeStatusBadge.vue'
import ContractTradeSummaryStrip from '~/components/molecules/ContractTradeSummaryStrip.vue'
import type { ContractTradeListDto } from '~/domain/models/dto/contract-trade-list-dto'
import type { ContractTradeStatusFilter } from '~/domain/models/vo/contract-trade-status-filter-vo'
import type { ContractTradeSourceFilter } from '~/domain/models/vo/contract-trade-source-filter-vo'

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '持倉中' },
  { value: 'closed', label: '已平倉' },
  { value: 'reviewed', label: '已檢討' },
] as const

const SOURCE_OPTIONS = [
  { value: 'all', label: '全部來源' },
  { value: 'linked', label: '有關聯策略' },
  { value: 'selfJudged', label: '自行判斷' },
] as const

const { list = null, loading = false, failureMessage = null } = defineProps<{
  list?: ContractTradeListDto | null
  loading?: boolean
  failureMessage?: string | null
}>()

const statusFilter = defineModel<ContractTradeStatusFilter>('statusFilter', { required: true })
const sourceFilter = defineModel<ContractTradeSourceFilter>('sourceFilter', { required: true })
const symbolFilter = defineModel<string>('symbolFilter', { required: true })

const emit = defineEmits<{ retry: [], showPendingReview: [] }>()

const statusTab = computed({
  get: () => statusFilter.value,
  set: (value: string) => {
    statusFilter.value = value as ContractTradeStatusFilter
  },
})

const sourceTab = computed({
  get: () => sourceFilter.value,
  set: (value: string) => {
    sourceFilter.value = value as ContractTradeSourceFilter
  },
})
</script>

<template>
  <div class="contract-trade-list-panel">
    <header class="contract-trade-list-panel__toolbar">
      <AppButton
        v-if="list && list.pendingReviewCount > 0"
        variant="secondary"
        data-testid="pending-review"
        @click="emit('showPendingReview')"
      >
        待檢討 {{ list.pendingReviewCount }}
      </AppButton>
      <AppButton
        variant="secondary"
        to="/contract-trade-journal/statistics"
        data-testid="open-statistics"
      >
        績效統計
      </AppButton>
      <AppButton
        to="/contract-trade-journal/new"
        data-testid="record-trade"
      >
        ＋ 記一筆
      </AppButton>
    </header>

    <p
      v-if="loading && !list"
      class="contract-trade-list-panel__state"
      data-testid="trade-list-loading"
    >
      讀取中…
    </p>

    <AppAlert
      v-else-if="failureMessage"
      tone="danger"
      data-testid="trade-list-failure"
    >
      {{ failureMessage }}
      <template #action>
        <AppButton
          variant="ghost"
          data-testid="trade-list-retry"
          @click="emit('retry')"
        >
          再試一次
        </AppButton>
      </template>
    </AppAlert>

    <template v-else-if="list">
      <section
        v-if="list.summaryFigures.length > 0"
        class="contract-trade-list-panel__summary"
        data-testid="trade-list-summary"
      >
        <span class="contract-trade-list-panel__period">{{ list.periodLabel }}</span>
        <ContractTradeSummaryStrip :figures="list.summaryFigures" />
      </section>

      <div class="contract-trade-list-panel__filters">
        <AppTabs
          v-model="statusTab"
          :options="STATUS_OPTIONS"
          variant="segmented"
          data-testid="status-filter"
        />
        <AppTabs
          v-model="sourceTab"
          :options="SOURCE_OPTIONS"
          variant="segmented"
          data-testid="source-filter"
        />
        <AppSelect
          v-model="symbolFilter"
          class="contract-trade-list-panel__symbol"
          data-testid="symbol-filter"
        >
          <option value="">
            全部合約標的
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
          {{ list.emptyMessage }}
        </p>
        <div
          v-else
          class="contract-trade-list-panel__scroller"
        >
          <table class="contract-trade-list-panel__table">
            <thead>
              <tr>
                <th>交易</th>
                <th>方向</th>
                <th>狀態</th>
                <th>來源</th>
                <th>進場均價</th>
                <th>出場均價</th>
                <th>損益</th>
                <th>R</th>
                <th>標籤</th>
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
                    #{{ row.id }} {{ row.symbol }}
                  </NuxtLink>
                </td>
                <td>
                  <ContractTradeStatusBadge
                    :label="row.directionLabel"
                    :tone="row.directionTone"
                  />
                </td>
                <td>
                  <ContractTradeStatusBadge
                    :label="row.statusLabel"
                    :tone="row.statusTone"
                  />
                  <span
                    v-if="row.pendingReview"
                    class="contract-trade-list-panel__flag"
                  >待檢討</span>
                </td>
                <td class="contract-trade-list-panel__text">
                  {{ row.sourceLabel }}
                </td>
                <td>{{ row.averageEntryPriceText }}</td>
                <td>{{ row.averageExitPriceText }}</td>
                <td :class="`contract-trade-list-panel__tone--${row.profit.tone}`">
                  {{ row.profit.text }}
                  <small v-if="row.profit.note">{{ row.profit.note }}</small>
                </td>
                <td>{{ row.rMultipleText }}</td>
                <td class="contract-trade-list-panel__text">
                  {{ row.tagNames.join('、') }}
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
  }

  &__state,
  &__empty {
    margin: 0;
    padding: spacing('lg') spacing('md');
    color: color('text-faint');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__summary {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__period {
    color: color('text-faint');
    font-size: font-size('2xs');
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
