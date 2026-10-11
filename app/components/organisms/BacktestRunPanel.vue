<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppPanel from '~/components/atoms/AppPanel.vue'
import BacktestRunList from '~/components/organisms/BacktestRunList.vue'
import BacktestRunDetailDialog from '~/components/organisms/BacktestRunDetailDialog.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import type { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import { useBacktestRuns } from '~/composables/use-backtest-runs'
import { useBacktestRunDetail } from '~/composables/use-backtest-run-detail'

// 有機體：「我的回測」那一塊——依範圍列輪次、自己跟著進度、取消、翻頁、點開看成績單。
// 剛送出的那一筆由使用端交進來，插到最上面。
const { backtestApplication, timeZone, scope, emptyMessage, submittedRun = null } = defineProps<{
  backtestApplication: BacktestApplication
  timeZone: TimeZoneDto
  scope: BacktestRunListQueryDto
  emptyMessage: string
  submittedRun?: BacktestRunDto | null
}>()

const { t } = useI18n()

const runList = useBacktestRuns(backtestApplication, () => scope)
const runDetail = useBacktestRunDetail(backtestApplication)

onMounted(() => {
  void runList.load()
})

watch(() => submittedRun, (submitted) => {
  if (submitted !== null) {
    runList.prepend(submitted)
  }
})
</script>

<template>
  <AppPanel
    :title="t('backtest.runs.title')"
    data-testid="backtest-run-list-panel"
  >
    <template
      v-if="$slots.meta"
      #meta
    >
      <slot name="meta" />
    </template>

    <BacktestRunList
      :runs="runList.runs.value"
      :total-count="runList.totalCount.value"
      :loading="runList.loading.value"
      :failure-message="runList.failureMessage.value"
      :time-zone="timeZone"
      :can-show-more="runList.canShowMore.value"
      :empty-message="emptyMessage"
      @open="runDetail.openRun"
      @cancel="runList.cancel"
      @show-more="runList.showMore"
    />

    <BacktestRunDetailDialog
      :open="runDetail.open.value"
      :detail="runDetail.detail.value"
      :loading="runDetail.loading.value"
      :failure-message="runDetail.failureMessage.value"
      :time-zone="timeZone"
      @close="runDetail.close"
    />
  </AppPanel>
</template>
