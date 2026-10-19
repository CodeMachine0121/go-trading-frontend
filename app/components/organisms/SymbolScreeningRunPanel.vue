<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import SymbolScreeningRunDetailDialog from '~/components/organisms/SymbolScreeningRunDetailDialog.vue'
import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { useSymbolScreeningRuns } from '~/composables/use-symbol-screening-runs'
import { useSymbolScreeningRunDetail } from '~/composables/use-symbol-screening-run-detail'

// Organism: submitted screenings newest first, following progress until all have ended.
const { symbolScreeningApplication, timeZone, submittedRun = null } = defineProps<{
  symbolScreeningApplication: SymbolScreeningApplication
  timeZone: TimeZoneDto
  submittedRun?: SymbolScreeningRunDto | null
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const runList = useSymbolScreeningRuns(symbolScreeningApplication)
const runDetail = useSymbolScreeningRunDetail(symbolScreeningApplication)

onMounted(() => {
  void runList.load()
})

watch(() => submittedRun, (submitted) => {
  if (submitted !== null) {
    runList.prepend(submitted)
  }
})

async function cancelFromDetail(id: number) {
  await runList.cancel(id)
  await runDetail.refresh()
}
</script>

<template>
  <AppPanel
    :title="t('symbolScreening.runs.title')"
    data-testid="symbol-screening-run-panel"
  >
    <div class="symbol-screening-run-panel">
      <p
        v-if="runList.failureMessage.value !== null"
        class="symbol-screening-run-panel__notice symbol-screening-run-panel__notice--failed"
        data-testid="symbol-screening-runs-failure"
      >
        {{ localize(runList.failureMessage.value) }}
      </p>
      <p
        v-else-if="runList.loading.value && runList.runs.value.length === 0"
        class="symbol-screening-run-panel__notice"
      >
        {{ t('symbolScreening.common.loading') }}
      </p>
      <p
        v-else-if="runList.runs.value.length === 0"
        class="symbol-screening-run-panel__notice"
        data-testid="symbol-screening-runs-empty"
      >
        {{ t('symbolScreening.runs.empty') }}
      </p>

      <ol
        v-if="runList.runs.value.length > 0"
        class="symbol-screening-run-panel__rows"
      >
        <li
          v-for="run in runList.runs.value"
          :key="run.id"
          class="symbol-screening-run-panel__row"
          data-testid="symbol-screening-run"
        >
          <div class="symbol-screening-run-panel__headline">
            <span class="symbol-screening-run-panel__number">
              {{ t('symbolScreening.runs.runNumber', { id: run.id }) }}
            </span>
            <AppBadge
              :variant="run.statusTone"
              data-testid="symbol-screening-run-status"
            >
              {{ localize(run.statusLabel) }}
            </AppBadge>
            <span
              class="symbol-screening-run-panel__progress"
              data-testid="symbol-screening-run-progress"
            >
              {{ t('symbolScreening.runs.progress', { processed: run.processedCandidateCount, total: run.candidateCount }) }}
            </span>
            <span class="symbol-screening-run-panel__profile">{{ run.profileName }}</span>
            <span class="symbol-screening-run-panel__moment">
              {{ t('symbolScreening.runs.submittedAt', { time: timeZone.formatDateTime(run.submittedAt) }) }}
            </span>
          </div>

          <p
            v-if="run.failureReason !== null"
            class="symbol-screening-run-panel__notice symbol-screening-run-panel__notice--failed"
            data-testid="symbol-screening-run-failure-reason"
          >
            {{ run.failureReason }}
          </p>

          <div class="symbol-screening-run-panel__actions">
            <AppButton
              variant="ghost"
              size="small"
              data-testid="symbol-screening-run-open"
              @click="runDetail.openRun(run.id)"
            >
              {{ t('symbolScreening.runs.open') }}
            </AppButton>
            <AppButton
              v-if="run.isActive"
              variant="danger-ghost"
              size="small"
              data-testid="symbol-screening-run-cancel"
              @click="runList.cancel(run.id)"
            >
              {{ t('symbolScreening.runs.cancel') }}
            </AppButton>
          </div>
        </li>
      </ol>
    </div>

    <SymbolScreeningRunDetailDialog
      :open="runDetail.open.value"
      :detail="runDetail.detail.value"
      :loading="runDetail.loading.value"
      :failure-message="runDetail.failureMessage.value"
      :time-zone="timeZone"
      @close="runDetail.close"
      @cancel="cancelFromDetail"
    />
  </AppPanel>
</template>

<style scoped lang="scss">
.symbol-screening-run-panel {
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

  &__progress,
  &__profile {
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__moment {
    margin-left: auto;
    color: color('text-faint');
    font-size: font-size('2xs');

    @include numeric;
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
  }
}
</style>
