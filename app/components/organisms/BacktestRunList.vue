<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import BacktestRunStatusBadge from '~/components/molecules/BacktestRunStatusBadge.vue'
import type { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 有機體：送出過的回測，新到舊一列一筆。還沒結束的可以取消；每一筆都點得開。
const { runs, totalCount, loading, failureMessage, timeZone, canShowMore, emptyMessage } = defineProps<{
  runs: readonly BacktestRunDto[]
  totalCount: number
  loading: boolean
  failureMessage: LocalizedTextVo | null
  timeZone: TimeZoneDto
  canShowMore: boolean
  /** 一筆都沒有時要說的那一句——列表頁與回測區塊各有各的說法。 */
  emptyMessage: string
}>()

const emit = defineEmits<{ open: [id: number], cancel: [id: number], showMore: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <div class="backtest-run-list">
    <p
      v-if="loading && runs.length === 0"
      class="backtest-run-list__notice"
    >
      {{ t('backtest.runs.loading') }}
    </p>

    <p
      v-if="failureMessage !== null"
      class="backtest-run-list__notice backtest-run-list__notice--failed"
      data-testid="backtest-run-list-failure"
    >
      {{ localize(failureMessage) }}
    </p>

    <p
      v-else-if="!loading && runs.length === 0"
      class="backtest-run-list__notice"
      data-testid="backtest-run-list-empty"
    >
      {{ emptyMessage }}
    </p>

    <ol
      v-if="runs.length > 0"
      class="backtest-run-list__rows"
    >
      <li
        v-for="run in runs"
        :key="run.id"
        class="backtest-run-list__row"
        data-testid="backtest-run-row"
      >
        <div class="backtest-run-list__headline">
          <span class="backtest-run-list__number">
            {{ t('backtest.runs.runNumber', { id: run.id }) }}
          </span>
          <BacktestRunStatusBadge :run="run" />
          <span class="backtest-run-list__subject">{{ run.subjectName }}</span>
          <span class="backtest-run-list__moment">
            {{ t('backtest.runs.submittedAt', { time: timeZone.formatDateTime(run.submittedAt) }) }}
          </span>
        </div>

        <p
          class="backtest-run-list__description"
          data-testid="backtest-run-description"
        >
          {{ localize(run.description) }} ·
          {{ t('backtest.runs.period', { start: timeZone.formatDateTime(run.startTime), end: timeZone.formatDateTime(run.endTime) }) }}
        </p>

        <p
          v-if="run.outcome !== null"
          class="backtest-run-list__outcome"
          :class="`backtest-run-list__outcome--${run.statusTone}`"
          data-testid="backtest-run-outcome"
        >
          {{ localize(run.outcome) }}
        </p>

        <div class="backtest-run-list__actions">
          <AppButton
            variant="ghost"
            size="small"
            data-testid="backtest-run-view"
            @click="emit('open', run.id)"
          >
            {{ t('backtest.runs.open') }}
          </AppButton>
          <AppButton
            v-if="run.canCancel"
            variant="danger-ghost"
            size="small"
            data-testid="backtest-run-cancel"
            @click="emit('cancel', run.id)"
          >
            {{ t('backtest.runs.cancel') }}
          </AppButton>
        </div>
      </li>
    </ol>

    <div
      v-if="runs.length > 0"
      class="backtest-run-list__footer"
    >
      <span
        class="backtest-run-list__count"
        data-testid="backtest-run-count"
      >
        {{ t('backtest.runs.shownCount', { shown: runs.length, total: totalCount }) }}
      </span>
      <AppButton
        v-if="canShowMore"
        variant="secondary"
        size="small"
        :disabled="loading"
        data-testid="backtest-run-show-more"
        @click="emit('showMore')"
      >
        {{ t('backtest.runs.showMore') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.backtest-run-list {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');

    &--failed {
      color: color('danger');
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

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
    gap: spacing('2xs') spacing('xs');
  }

  &__number {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');

    @include numeric;
  }

  &__subject {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__moment {
    margin-left: auto;
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__description {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__outcome {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: spacing('xs');
  }

  &__count {
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }
}
</style>
