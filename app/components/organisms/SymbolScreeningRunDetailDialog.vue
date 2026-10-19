<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import SymbolScreeningCandidateCard from '~/components/molecules/SymbolScreeningCandidateCard.vue'
import SymbolScreeningTermsList from '~/components/molecules/SymbolScreeningTermsList.vue'
import type { SymbolScreeningRunDetailDto } from '~/domain/models/dto/symbol-screening-run-detail-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

// Organism: one screening run as submitted, with its candidates in the order the system gave them.
const { open, detail, loading, failureMessage, timeZone } = defineProps<{
  open: boolean
  detail: SymbolScreeningRunDetailDto | null
  loading: boolean
  failureMessage: LocalizedTextVo | null
  timeZone: TimeZoneDto
}>()

const emit = defineEmits<{ close: [], cancel: [id: number] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppModal
    :open="open"
    :title="detail === null ? t('symbolScreening.detail.loadingTitle') : t('symbolScreening.detail.title', { id: detail.run.id })"
    @close="emit('close')"
  >
    <div
      class="symbol-screening-run-detail-dialog"
      data-testid="symbol-screening-run-detail"
    >
      <p
        v-if="loading"
        class="symbol-screening-run-detail-dialog__notice"
      >
        {{ t('symbolScreening.common.loading') }}
      </p>
      <p
        v-if="failureMessage !== null"
        class="symbol-screening-run-detail-dialog__notice symbol-screening-run-detail-dialog__notice--failed"
        data-testid="symbol-screening-run-detail-failure"
      >
        {{ localize(failureMessage) }}
      </p>

      <template v-if="detail !== null">
        <div class="symbol-screening-run-detail-dialog__headline">
          <AppBadge
            :variant="detail.run.statusTone"
            data-testid="symbol-screening-run-detail-status"
          >
            {{ localize(detail.run.statusLabel) }}
          </AppBadge>
          <span class="symbol-screening-run-detail-dialog__progress">
            {{ t('symbolScreening.runs.progress', { processed: detail.run.processedCandidateCount, total: detail.run.candidateCount }) }}
          </span>
          <AppButton
            v-if="detail.run.isActive"
            variant="danger-ghost"
            size="small"
            data-testid="symbol-screening-run-detail-cancel"
            @click="emit('cancel', detail.run.id)"
          >
            {{ t('symbolScreening.runs.cancel') }}
          </AppButton>
        </div>

        <AppAlert
          v-if="detail.run.failureReason !== null"
          tone="danger"
        >
          {{ detail.run.failureReason }}
        </AppAlert>

        <section class="symbol-screening-run-detail-dialog__section">
          <h3 class="symbol-screening-run-detail-dialog__heading">
            {{ t('symbolScreening.detail.snapshotTitle', { name: detail.snapshot.profileName }) }}
          </h3>
          <SymbolScreeningTermsList :terms="detail.snapshot.terms" />
        </section>

        <AppAlert
          v-if="detail.run.contributionFailureReason !== null"
          tone="warning"
          data-testid="symbol-screening-run-detail-contribution-failure"
        >
          {{ detail.run.contributionFailureReason }}
        </AppAlert>

        <section class="symbol-screening-run-detail-dialog__section">
          <h3 class="symbol-screening-run-detail-dialog__heading">
            {{ t('symbolScreening.detail.candidatesTitle') }}
          </h3>
          <SymbolScreeningCandidateCard
            v-for="candidate in detail.candidates"
            :key="candidate.symbol"
            :candidate="candidate"
            :time-zone="timeZone"
          />
        </section>
      </template>
    </div>
  </AppModal>
</template>

<style scoped lang="scss">
.symbol-screening-run-detail-dialog {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');

    &--failed {
      color: color('danger');
    }
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs') spacing('xs');
  }

  &__progress {
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__heading {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('sm');
    font-weight: font-weight('semibold');
  }
}
</style>
