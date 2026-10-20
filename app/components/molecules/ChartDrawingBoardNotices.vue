<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

/**
 * 分子：繪圖與帳號那一份之間出了什麼事——讀不到、存不進去、舊繪圖沒搬成。
 * 三則各自獨立；畫的東西照樣在圖上，所以都只是說明，不擋畫圖。
 */
const { loadFailure = null, saveFailure = null, migrationFailure = null } = defineProps<{
  loadFailure?: LocalizedTextVo | null
  saveFailure?: LocalizedTextVo | null
  migrationFailure?: LocalizedTextVo | null
}>()

const emit = defineEmits<{ retryLoad: [], retrySave: [] }>()

const { t } = useI18n()
const { localize } = useLocalizedText()
</script>

<template>
  <AppAlert
    v-if="loadFailure"
    tone="warning"
    data-testid="chart-drawing-load-failure"
  >
    {{ localize(loadFailure) }}
    <template #action>
      <AppButton
        variant="secondary"
        size="small"
        data-testid="retry-chart-drawing-load"
        @click="emit('retryLoad')"
      >
        {{ t('marketData.common.retry') }}
      </AppButton>
    </template>
  </AppAlert>

  <AppAlert
    v-if="saveFailure"
    tone="warning"
    data-testid="chart-drawing-save-failure"
  >
    {{ localize(saveFailure) }}
    <template #action>
      <AppButton
        variant="secondary"
        size="small"
        data-testid="retry-chart-drawing-save"
        @click="emit('retrySave')"
      >
        {{ t('marketData.common.retry') }}
      </AppButton>
    </template>
  </AppAlert>

  <AppAlert
    v-if="migrationFailure"
    tone="warning"
    data-testid="chart-drawing-migration-failure"
  >
    {{ localize(migrationFailure) }}
  </AppAlert>
</template>
