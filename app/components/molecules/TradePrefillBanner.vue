<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { TradePrefillSourceDto } from '~/domain/models/dto/trade-prefill-source-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const {
  source = null,
  message = null,
  showJournalLink = false,
  journalPath,
  timeZoneIdentifier,
} = defineProps<{
  source?: TradePrefillSourceDto | null
  message?: LocalizedTextVo | null
  showJournalLink?: boolean
  journalPath: string
  timeZoneIdentifier: string
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <div
    class="trade-prefill-banner"
    data-testid="prefill-banner"
  >
    <p
      v-if="source"
      class="trade-prefill-banner__source"
      data-testid="prefill-source"
    >
      <AppBadge :variant="source.badgeTone">
        {{ localize(source.badgeLabel) }}
      </AppBadge>
      <strong class="trade-prefill-banner__round">{{ localize(source.sourceLabel) }}</strong>
      <span class="trade-prefill-banner__detail">
        {{ t('tradeJournal.prefillBanner.sentAt', { time: formatDateTimeInTimeZone(source.ranAt, timeZoneIdentifier) }) }}<template v-if="source.referencePriceText">
          {{ t('tradeJournal.prefillBanner.referencePrice', { price: source.referencePriceText }) }}
        </template>
      </span>
    </p>
    <p
      v-if="source"
      class="trade-prefill-banner__hint"
    >
      {{ localize(source.hint) }}
    </p>
    <AppAlert
      v-if="message"
      tone="info"
      data-testid="prefill-message"
    >
      {{ localize(message) }}
      <template
        v-if="showJournalLink"
        #action
      >
        <AppButton
          variant="ghost"
          :to="journalPath"
          data-testid="prefill-go-journal"
        >
          {{ t('tradeJournal.prefillBanner.goToJournal') }}
        </AppButton>
      </template>
    </AppAlert>
  </div>
</template>

<style scoped lang="scss">
.trade-prefill-banner {
  display: flex;
  flex-direction: column;
  gap: spacing('xs');

  &__source {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs') spacing('sm');
    align-items: center;
    margin: 0;
    border: 1px solid color('primary');
    border-radius: radius('md');
    background-color: color('primary-soft');
    padding: spacing('xs') spacing('sm');
    color: color('text-strong');
    font-size: font-size('sm');
  }

  &__round {
    font-weight: font-weight('semibold');
  }

  &__detail {
    color: color('text-muted');
    font-size: font-size('xs');

    @include numeric;
  }

  &__hint {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }
}
</style>
