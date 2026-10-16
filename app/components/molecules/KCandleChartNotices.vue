<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { LiveUpdateNoticeVo } from '~/domain/models/vo/live-update-notice-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 分子：圖現在怎麼了——即時更新的那一句，與取行情的結果（被拒絕、後端出錯、連不上、載入中）。
 *
 * 兩者各自獨立、不搶同一個位置：即時這一層沒有東西動，不代表「圖表壞了」，
 * 圖照樣顯示手上有的，只是多一行說明。取行情那一組一次只說一句，依這個順序。
 * 現貨與合約兩張圖說的是同一套話，所以收在這一個元件裡。
 */
const {
  liveUpdateNotice = null,
  liveUpdateMessage = null,
  rejectedMessage = null,
  unexpectedFailure = false,
  serverErrorMessage = null,
  unreachableExplanation = null,
  loading = false,
} = defineProps<{
  liveUpdateNotice?: LiveUpdateNoticeVo | null
  liveUpdateMessage?: string | null
  rejectedMessage?: LocalizedTextVo | null
  unexpectedFailure?: boolean
  serverErrorMessage?: LocalizedTextVo | null
  unreachableExplanation?: LocalizedTextVo | null
  loading?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppAlert
    v-if="liveUpdateNotice"
    :tone="liveUpdateNotice.tone"
    :data-testid="`live-update-${liveUpdateNotice.value}-alert`"
  >
    {{ liveUpdateMessage }}
  </AppAlert>

  <AppAlert
    v-if="rejectedMessage || unexpectedFailure"
    tone="danger"
    data-testid="rejected-alert"
  >
    {{ rejectedMessage ? localize(rejectedMessage) : t('marketData.common.unexpectedChartFailure') }}
  </AppAlert>

  <AppAlert
    v-else-if="serverErrorMessage"
    tone="danger"
    data-testid="server-error-alert"
  >
    {{ t('marketData.common.chartServerError', { message: localize(serverErrorMessage) }) }}
    <template #action>
      <AppButton
        variant="secondary"
        size="small"
        :disabled="loading"
        @click="emit('retry')"
      >
        {{ t('marketData.common.retry') }}
      </AppButton>
    </template>
  </AppAlert>

  <AppAlert
    v-else-if="unreachableExplanation"
    tone="danger"
    data-testid="unreachable-alert"
  >
    {{ localize(unreachableExplanation) }}
    <template #action>
      <AppButton
        variant="secondary"
        size="small"
        :disabled="loading"
        @click="emit('retry')"
      >
        {{ t('marketData.common.retry') }}
      </AppButton>
    </template>
  </AppAlert>

  <AppAlert
    v-else-if="loading"
    tone="info"
    data-testid="loading-alert"
  >
    {{ t('marketData.common.loadingMarketData') }}
  </AppAlert>
</template>
