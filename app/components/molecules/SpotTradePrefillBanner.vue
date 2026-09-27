<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { SpotTradePrefillDto } from '~/domain/models/dto/spot-trade-prefill-dto'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

const { prefill, message = null, showJournalLink = false, timeZoneIdentifier } = defineProps<{
  prefill: SpotTradePrefillDto | null
  message?: string | null
  showJournalLink?: boolean
  timeZoneIdentifier: string
}>()
</script>

<template>
  <div
    class="spot-trade-prefill-banner"
    data-testid="prefill-banner"
  >
    <p
      v-if="prefill"
      class="spot-trade-prefill-banner__source"
      data-testid="prefill-source"
    >
      <AppBadge :variant="prefill.signalTone">
        {{ prefill.signalLabel }}
      </AppBadge>
      <strong class="spot-trade-prefill-banner__round">{{ prefill.sourceLabel }}</strong>
      <span class="spot-trade-prefill-banner__detail">
        {{ formatDateTimeInTimeZone(prefill.ranAt, timeZoneIdentifier) }} 送出<template v-if="prefill.referencePriceText">
          ・參考價 {{ prefill.referencePriceText }}
        </template>
      </span>
    </p>
    <p
      v-if="prefill"
      class="spot-trade-prefill-banner__hint"
    >
      紫框是從這一輪帶入的值；價格與數量請改成實際成交。
    </p>
    <AppAlert
      v-if="message"
      tone="info"
      data-testid="prefill-message"
    >
      {{ message }}
      <template
        v-if="showJournalLink"
        #action
      >
        <AppButton
          variant="ghost"
          to="/spot-trade-journal"
          data-testid="prefill-go-journal"
        >
          前往交易日誌
        </AppButton>
      </template>
    </AppAlert>
  </div>
</template>

<style scoped lang="scss">
.spot-trade-prefill-banner {
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
