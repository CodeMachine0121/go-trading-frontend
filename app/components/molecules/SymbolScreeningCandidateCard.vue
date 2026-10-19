<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { SymbolScreeningCandidateDto } from '~/domain/models/dto/symbol-screening-candidate-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// Molecule: one candidate's verdict and only the figures it actually has.
const { candidate, timeZone } = defineProps<{
  candidate: SymbolScreeningCandidateDto
  timeZone: TimeZoneDto
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <article
    class="symbol-screening-candidate-card"
    data-testid="symbol-screening-candidate"
  >
    <header class="symbol-screening-candidate-card__headline">
      <span
        v-if="candidate.recommendationRank !== null"
        class="symbol-screening-candidate-card__rank"
      >
        {{ t('symbolScreening.candidate.rank', { rank: candidate.recommendationRank }) }}
      </span>
      <strong
        class="symbol-screening-candidate-card__symbol"
        data-testid="symbol-screening-candidate-symbol"
      >{{ candidate.symbol }}</strong>
      <AppBadge
        :variant="candidate.statusTone"
        data-testid="symbol-screening-candidate-status"
      >
        {{ localize(candidate.statusLabel) }}
      </AppBadge>
      <span
        v-if="candidate.stageLabel !== null"
        class="symbol-screening-candidate-card__stage"
        data-testid="symbol-screening-candidate-stage"
      >
        {{ localize(candidate.stageLabel) }}
      </span>
    </header>

    <p
      v-if="candidate.reason !== null"
      class="symbol-screening-candidate-card__reason"
      data-testid="symbol-screening-candidate-reason"
    >
      {{ candidate.reason }}
    </p>

    <ul class="symbol-screening-candidate-card__figures">
      <li
        v-if="candidate.historyDays !== null"
        data-testid="symbol-screening-candidate-history-days"
      >
        {{ t('symbolScreening.candidate.historyDays', { days: candidate.historyDays }) }}
      </li>
      <li
        v-if="candidate.averageDailyQuoteVolumeText !== null"
        data-testid="symbol-screening-candidate-volume"
      >
        {{ t('symbolScreening.candidate.averageDailyQuoteVolume', { volume: candidate.averageDailyQuoteVolumeText }) }}
      </li>
      <li
        v-if="candidate.returnWithoutBestSegmentText !== null"
        data-testid="symbol-screening-candidate-return-without-best"
      >
        {{ t('symbolScreening.candidate.returnWithoutBestSegment', { percent: candidate.returnWithoutBestSegmentText }) }}
      </li>
    </ul>

    <table
      v-if="candidate.segments.length > 0"
      class="symbol-screening-candidate-card__segments"
      data-testid="symbol-screening-candidate-segments"
    >
      <thead>
        <tr>
          <th>{{ t('symbolScreening.candidate.segmentPeriod') }}</th>
          <th>{{ t('symbolScreening.candidate.segmentReturn') }}</th>
          <th>{{ t('symbolScreening.candidate.segmentMaximumDrawdown') }}</th>
          <th>{{ t('symbolScreening.candidate.segmentClosedTradeCount') }}</th>
          <th>{{ t('symbolScreening.candidate.segmentLiquidationCount') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="segment in candidate.segments"
          :key="segment.startTime.getTime()"
          data-testid="symbol-screening-candidate-segment"
        >
          <td>{{ timeZone.formatDateTime(segment.startTime) }} – {{ timeZone.formatDateTime(segment.endTime) }}</td>
          <td data-testid="symbol-screening-candidate-segment-return">
            {{ segment.returnText }}
          </td>
          <td>{{ segment.maximumDrawdownText }}</td>
          <td>{{ segment.closedTradeCount }}</td>
          <td>{{ segment.liquidationCount }}</td>
        </tr>
      </tbody>
    </table>

    <ul
      v-if="candidate.contribution !== null"
      class="symbol-screening-candidate-card__figures"
      data-testid="symbol-screening-candidate-contribution"
    >
      <li>{{ t('symbolScreening.candidate.inMarketShare', { percent: candidate.contribution.inMarketShareText }) }}</li>
      <li>{{ t('symbolScreening.candidate.overlapShare', { percent: candidate.contribution.overlapShareText }) }}</li>
      <li>{{ t('symbolScreening.candidate.baselineLongestGapDays', { days: candidate.contribution.baselineLongestGapDays }) }}</li>
      <li>{{ t('symbolScreening.candidate.combinedLongestGapDays', { days: candidate.contribution.combinedLongestGapDays }) }}</li>
      <li data-testid="symbol-screening-candidate-gap-reduction">
        {{ t('symbolScreening.candidate.gapReductionDays', { days: candidate.contribution.gapReductionDays }) }}
      </li>
    </ul>
  </article>
</template>

<style scoped lang="scss">
.symbol-screening-candidate-card {
  display: flex;
  flex-direction: column;
  gap: spacing('3xs');
  border-bottom: 1px solid color('border');
  padding: spacing('xs') 0;

  &__headline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__rank,
  &__stage {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__symbol {
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__reason {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__figures {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('3xs') spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__segments {
    display: block;
    overflow-x: auto;
    border-collapse: collapse;
    color: color('text-muted');
    font-size: font-size('2xs');
    text-align: left;

    @include numeric;
  }
}
</style>
