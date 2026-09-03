<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：一整塊「後端連線狀態」。
// 元件（Controller）只認識 DTO 與 Application，不認識 entity / domain model / proxy。
//
// 這一頁只回答一個問題，所以答案就是版面上唯一的大字，其餘（原始回覆字串、
// 檢查時間）縮在它底下當佐證——像儀器上的一顆主讀數加幾行小字。
defineProps<{
  health: BackendHealthDto | null
  loading: boolean
  errorMessage: string | null
  /** 檢查時間用哪一個時區說。操作台上每一個時間都照選定的那一個講，這一個不例外。 */
  timeZone: TimeZoneDto
}>()

defineEmits<{
  refresh: []
}>()
</script>

<template>
  <AppPanel
    title="後端連線狀態"
    class="backend-health-card"
  >
    <template #actions>
      <AppButton
        variant="secondary"
        size="small"
        :disabled="loading"
        @click="$emit('refresh')"
      >
        {{ loading ? '檢查中…' : '重新檢查' }}
      </AppButton>
    </template>

    <p
      v-if="errorMessage"
      class="backend-health-card__error"
      data-testid="error"
    >
      {{ errorMessage }}
    </p>

    <div
      v-else-if="health"
      class="backend-health-card__readout"
      data-testid="status"
    >
      <p
        class="backend-health-card__label"
        :class="`backend-health-card__label--${health.tone}`"
      >
        {{ health.label }}
      </p>

      <dl class="backend-health-card__facts">
        <dt>回覆</dt>
        <dd>
          <AppBadge :variant="health.tone">
            {{ health.status }}
          </AppBadge>
        </dd>
        <dt>檢查於</dt>
        <dd class="backend-health-card__checked-at">
          {{ timeZone.formatDateTime(health.checkedAt) }}（{{ timeZone.cityLabel }}）
        </dd>
      </dl>
    </div>

    <p
      v-else
      class="backend-health-card__idle"
      data-testid="idle"
    >
      尚未檢查
    </p>
  </AppPanel>
</template>

<style scoped lang="scss">
.backend-health-card {
  // 一個只有一句答案的面板不必攤滿整片工作區——那樣看起來像沒寫完。
  max-width: 30rem;

  &__error {
    margin: 0;
    color: color('danger');
    font-size: font-size('sm');
  }

  &__idle {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__readout {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  // 整頁只有一個問題，答案就該是整頁最大的那一行。
  &__label {
    margin: 0;
    line-height: line-height('tight');
    font-weight: font-weight('semibold');
    font-size: font-size('2xl');

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }
  }

  &__facts {
    display: grid;
    gap: spacing('2xs') spacing('sm');
    grid-template-columns: auto 1fr;
    margin: 0;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');

    dt {
      @include dense-label;
    }

    dd {
      margin: 0;
      font-size: font-size('xs');
    }
  }

  &__checked-at {
    color: color('text-muted');

    @include numeric;
  }
}
</style>
