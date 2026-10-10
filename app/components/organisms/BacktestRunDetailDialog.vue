<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import BacktestRunStatusBadge from '~/components/molecules/BacktestRunStatusBadge.vue'
import BacktestResultSections from '~/components/organisms/BacktestResultSections.vue'
import type { BacktestRunDetailDto } from '~/domain/models/dto/backtest-run-detail-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// 有機體：點開一筆輪次——完成的畫成績單，沒完成的說它現在怎麼了。
const { open, detail, loading, failureMessage, timeZone } = defineProps<{
  open: boolean
  detail: BacktestRunDetailDto | null
  loading: boolean
  failureMessage: LocalizedTextVo | null
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppModal
    :open="open"
    :title="detail === null ? t('backtest.runs.title') : t('backtest.runs.detailTitle', { id: detail.run.id })"
    @close="emit('close')"
  >
    <div class="backtest-run-detail-dialog">
      <p
        v-if="loading"
        class="backtest-run-detail-dialog__notice"
      >
        {{ t('backtest.runs.loading') }}
      </p>

      <AppAlert
        v-else-if="failureMessage !== null"
        tone="danger"
        data-testid="backtest-run-detail-failure"
      >
        {{ localize(failureMessage) }}
      </AppAlert>

      <template v-else-if="detail !== null">
        <div class="backtest-run-detail-dialog__headline">
          <BacktestRunStatusBadge :run="detail.run" />
          <span class="backtest-run-detail-dialog__description">{{ localize(detail.run.description) }}</span>
        </div>

        <p
          v-if="detail.run.outcome !== null && detail.result === null"
          class="backtest-run-detail-dialog__outcome"
          data-testid="backtest-run-detail-outcome"
        >
          {{ localize(detail.run.outcome) }}
        </p>

        <BacktestResultSections
          v-if="detail.result !== null"
          :result="detail.result"
          :time-zone="timeZone"
        />
        <p
          v-else-if="detail.run.outcome === null"
          class="backtest-run-detail-dialog__notice"
          data-testid="backtest-run-detail-no-result"
        >
          {{ t('backtest.runs.noResult') }}
        </p>
      </template>
    </div>
  </AppModal>
</template>

<style scoped lang="scss">
.backtest-run-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('xs');
  }

  &__description {
    color: color('text-muted');
    font-size: font-size('sm');

    @include numeric;
  }

  &__outcome {
    margin: 0;
    font-size: font-size('sm');
  }
}
</style>
